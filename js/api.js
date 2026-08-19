/**
 * RoboCADer Pro — browser data layer
 *
 * Every Supabase call the dashboards make goes through here.
 *
 * THE ONE RULE THIS FILE EXISTS TO ENFORCE:
 *   NEVER `select('*')` ON profiles OR milestones.
 *   Migration 002 revokes `profiles.phone_number` (and most of `milestones`)
 *   from the `authenticated` role at the COLUMN level. PostgREST expands
 *   `select=*` into `SELECT tbl.*`, which trips the revoked column and fails
 *   the whole query with a 42501 "permission denied for table profiles".
 *   Explicit column lists are not a style preference here — they are the
 *   difference between a working query and a confusing permissions error.
 *
 * Column lists are declared once as constants below so a new page cannot get
 * this wrong by accident.
 */

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const config = window.ROBOCADER_CONFIG ?? {};

export const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// ---------------------------------------------------------------------------
// Safe column lists — phone_number is deliberately absent from all of them
// ---------------------------------------------------------------------------

const PROFILE_COLUMNS =
  "id, full_name, role_type, location_city, location_lat, location_lng, " +
  "daily_rate, availability_status, reliability_score, created_at";

const PROJECT_COLUMNS =
  "id, client_id, title, description, required_skills, location_city, " +
  "location_lat, location_lng, duration_days, total_budget, status, created_at";

const MILESTONE_COLUMNS =
  "id, project_id, technician_id, milestone_stage, escrow_status, work_status, " +
  "amount, released_at, dispute_reason, updated_at";

const PASSPORT_COLUMNS =
  "technician_id, passport_no, verified_status, skills_array, certificate_url, " +
  "video_passport_url, years_experience, updated_at";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(message, { code, hint, operation } = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.hint = hint;
    this.operation = operation;
  }
}

/** Turns a PostgrestError into something a technician can act on. */
function fail(error, operation) {
  window.RoboMonitor?.captureSupabaseError?.(error, operation);

  let message = error.message ?? "Something went wrong";

  if (error.code === "42501" || error.code === "PGRST301") {
    message = "You do not have permission to do that.";
  } else if (error.code === "23505") {
    message = "That record already exists.";
  } else if (error.code === "23514") {
    message = "Some details were outside the allowed range. Please check and try again.";
  } else if (error.message?.includes("Failed to fetch")) {
    message = "Cannot reach the server. Check your connection and try again.";
  }

  throw new ApiError(message, { code: error.code, hint: error.hint, operation });
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const auth = {
  /** Technicians sign in by phone — the same identity the WhatsApp flow uses. */
  async sendPhoneOtp(phoneE164) {
    const { error } = await supabase.auth.signInWithOtp({ phone: phoneE164 });
    if (error) fail(error, "auth.sendPhoneOtp");
  },

  async verifyPhoneOtp(phoneE164, code) {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phoneE164,
      token: code,
      type: "sms",
    });
    if (error) fail(error, "auth.verifyPhoneOtp");
    return data.user;
  },

  /**
   * Google / LinkedIn sign-in. Supabase handles the OAuth round trip and
   * returns to `redirectTo`.
   *
   * NOTE: OAuth gives us an email and a name, never a phone number. The
   * profile form therefore still has to collect the WhatsApp number — it is
   * NOT NULL on profiles and it is how the matching engine reaches people.
   */
  async signInWithProvider(provider, redirectTo) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,                       // 'google' | 'linkedin_oidc'
      options: {
        redirectTo: redirectTo ?? window.location.href,
        queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
      },
    });
    if (error) fail(error, `auth.signInWith:${provider}`);
  },

  /** Clients sign in by email link — no password to handle or leak. */
  async sendEmailLink(email, redirectTo) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo ?? window.location.href },
    });
    if (error) fail(error, "auth.sendEmailLink");
  },

  /** Standard email + password sign-in. */
  async signInWithPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) fail(error, "auth.signInWithPassword");
    return data.user;
  },

  /**
   * Standard email + password registration.
   *
   * If the project requires email confirmation, `data.session` comes back null
   * and the user must click the link before they are signed in. The caller
   * needs to distinguish those two cases, so both are returned.
   */
  async signUpWithPassword(email, password, redirectTo) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo ?? window.location.href },
    });
    if (error) fail(error, "auth.signUpWithPassword");
    return { user: data.user, session: data.session, needsConfirmation: !data.session };
  },

  async sendPasswordReset(email, redirectTo) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo ?? window.location.href,
    });
    if (error) fail(error, "auth.sendPasswordReset");
  },

  async currentUser() {
    const { data } = await supabase.auth.getUser();
    return data?.user ?? null;
  },

  async signOut() {
    await supabase.auth.signOut();
    window.RoboMonitor?.clearUser?.();
  },

  onChange(callback) {
    return supabase.auth.onAuthStateChange((_event, session) => callback(session));
  },
};

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export const profiles = {
  async me() {
    const user = await auth.currentUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)          // never "*"
      .eq("id", user.id)
      .maybeSingle();

    if (error) fail(error, "profiles.me");
    return data;
  },

  /**
   * Creates or refreshes the signed-in user's profile.
   *
   * MUST go through the create_my_profile RPC, not a table upsert. Migration
   * 002 withholds UPDATE on role_type and phone_number from `authenticated`
   * (so nobody can self-promote to admin), and Postgres checks UPDATE
   * privileges on every column in an upsert's SET clause even on a first
   * insert — so the direct upsert fails with 42501. See migration 007.
   */
  async createOrUpdate({ fullName, phone, role, city = null, dailyRate = null }) {
    const user = await auth.currentUser();
    if (!user) throw new ApiError("You are not signed in.", { operation: "profiles.createOrUpdate" });

    const { error } = await supabase.rpc("create_my_profile", {
      p_full_name: fullName,
      p_phone: phone,
      p_role: role,
      p_city: city,
      p_daily_rate: dailyRate,
    });

    if (error) fail(error, "profiles.createOrUpdate");
    return this.me();
  },

  /** Edits to the safe columns only — no role_type, no phone_number. */
  async updateSelf(fields) {
    const user = await auth.currentUser();
    if (!user) throw new ApiError("You are not signed in.", { operation: "profiles.updateSelf" });

    const { error } = await supabase.from("profiles").update(fields).eq("id", user.id);
    if (error) fail(error, "profiles.updateSelf");
    return this.me();
  },

  async setAvailability(available) {
    const user = await auth.currentUser();
    if (!user) throw new ApiError("You are not signed in.", { operation: "profiles.setAvailability" });

    const { error } = await supabase
      .from("profiles")
      .update({ availability_status: available })
      .eq("id", user.id);

    if (error) fail(error, "profiles.setAvailability");
  },
};

// ---------------------------------------------------------------------------
// Skill passports
// ---------------------------------------------------------------------------

export const passports = {
  async mine() {
    const user = await auth.currentUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("skill_passports")
      .select(PASSPORT_COLUMNS)
      .eq("technician_id", user.id)
      .maybeSingle();

    if (error) fail(error, "passports.mine");
    return data;
  },

  /**
   * Saves the passport WITHOUT touching skills_array.
   *
   * This used to accept a `skills` argument and write it straight into
   * skills_array. The caller passes [tag, level] PAIRS, so what landed in a
   * text[] column was a two-dimensional array:
   *
   *   {{Mechanical_Assembly,L3},{Software_Development,L2}}
   *
   * Postgres accepted it. Nothing errored. But `skills_array && required_skills`
   * compares text[] to text[][] and the passport became invisible to matching —
   * the worst kind of bug, because the form said "saved" and the person is
   * simply never shortlisted.
   *
   * skills_array is a DENORMALISED CACHE owned by the trigger in migration 011.
   * The only correct way to write skills is skills.replaceMine(), which writes
   * technician_skills and lets the trigger rebuild the array. This function no
   * longer accepts skills at all, so the mistake cannot be made again here.
   */
  async save({ yearsExperience }) {
    const user = await auth.currentUser();
    if (!user) throw new ApiError("You are not signed in.", { operation: "passports.save" });

    // verified_status is deliberately not sent. The guard trigger in 001 would
    // reject it anyway — a technician cannot verify their own passport.
    //
    // NOT an upsert. PostgREST's upsert is INSERT … ON CONFLICT DO UPDATE SET
    // <every column in the payload>, which includes technician_id — a column
    // 024 made un-updatable (permission denied → 403 at the finish line of
    // onboarding). Update the one editable column; insert only if new.
    const { data: updated, error: updateError } = await supabase
      .from("skill_passports")
      .update({ years_experience: yearsExperience ?? null })
      .eq("technician_id", user.id)
      .select("technician_id");
    if (updateError) fail(updateError, "passports.save");
    if (!updated?.length) {
      const { error } = await supabase.from("skill_passports").insert({
        technician_id: user.id,
        years_experience: yearsExperience ?? null,
      });
      if (error) fail(error, "passports.save");
    }
  },

  /** Uploads into `<uid>/…`, the path shape migration 004's policies key off. */
  async uploadCertificate(file, kind = "certificate") {
    const user = await auth.currentUser();
    if (!user) throw new ApiError("You are not signed in.", { operation: "passports.upload" });

    const extension = (file.name.split(".").pop() ?? "bin").toLowerCase();
    const path = `${user.id}/${kind}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("certificates")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) fail(uploadError, "passports.uploadCertificate");

    // Store the OBJECT PATH, never a URL.
    //
    // This used to build `${SUPABASE_URL}/storage/v1/object/certificates/...`
    // and save that. The bucket is private (004), so the string was not a
    // working link — but it looked like one, which is the dangerous part. The
    // day the bucket is made public to "fix" a broken image, every technician's
    // ID card and training certificate becomes world-readable at a guessable
    // address. Storing a path makes that mistake impossible: nothing renders
    // until passports.signedUrl() mints a short-lived authorised link.
    const column = kind === "video" ? "video_passport_url" : "certificate_url";

    const { error } = await supabase.from("skill_passports").upsert({
      technician_id: user.id,
      [column]: path,
    }, { onConflict: "technician_id" });

    if (error) fail(error, "passports.linkCertificate");
    return path;
  },

  /** Private bucket: a viewable link must be minted on demand. */
  async signedUrl(path, expiresInSeconds = 300) {
    const objectPath = path.includes("/object/certificates/")
      ? path.split("/object/certificates/")[1]
      : path;

    const { data, error } = await supabase.storage
      .from("certificates")
      .createSignedUrl(objectPath, expiresInSeconds);

    if (error) fail(error, "passports.signedUrl");
    return data.signedUrl;
  },
};

// ---------------------------------------------------------------------------
// Skill levels — L1..L4, declared per skill
// ---------------------------------------------------------------------------

export const skills = {
  /** Level definitions live in the database so UI and assessors read the same words. */
  async levelGuide() {
    const { data, error } = await supabase
      .from("skill_level_guide")
      .select("level, label, short_name, description, sort_order")
      .order("sort_order");
    if (error) fail(error, "skills.levelGuide");
    return data ?? [];
  },

  async mine() {
    const user = await auth.currentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("technician_skills")
      .select("skill_tag, self_level, assessed_level, years_on_skill")
      .eq("technician_id", user.id);
    if (error) fail(error, "skills.mine");
    return data ?? [];
  },

  /**
   * Replaces the caller's declared skills with `entries` ([{tag, level}]).
   * assessed_level is never sent — the guard trigger in 011 strips it anyway.
   * A trigger keeps skill_passports.skills_array in sync for matching.
   */
  async replaceMine(entries) {
    const user = await auth.currentUser();
    if (!user) throw new ApiError("You are not signed in.", { operation: "skills.replaceMine" });

    const keep = entries.map((e) => e.tag);

    // Remove skills the technician has dropped.
    if (keep.length) {
      const { error } = await supabase
        .from("technician_skills").delete()
        .eq("technician_id", user.id).not("skill_tag", "in", `(${keep.join(",")})`);
      if (error) fail(error, "skills.pruneMine");
    } else {
      const { error } = await supabase
        .from("technician_skills").delete().eq("technician_id", user.id);
      if (error) fail(error, "skills.clearMine");
    }

    if (!keep.length) return [];

    const { error } = await supabase.from("technician_skills").upsert(
      entries.map((e) => ({
        technician_id: user.id,
        skill_tag: e.tag,
        self_level: e.level,
      })),
      { onConflict: "technician_id,skill_tag" },
    );
    if (error) fail(error, "skills.replaceMine");
    return this.mine();
  },
};

// ---------------------------------------------------------------------------
// Work history — prior engagements, the credibility a new signup arrives with
// ---------------------------------------------------------------------------

const WORK_COLUMNS =
  "id, technician_id, plant_name, client_company, role_title, location_city, " +
  "started_on, ended_on, is_current, summary, skills_used, verified_status, assignment_id";

export const workHistory = {
  async mine() {
    const user = await auth.currentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("work_history")
      .select(WORK_COLUMNS)
      .eq("technician_id", user.id)
      .order("started_on", { ascending: false });

    if (error) fail(error, "workHistory.mine");
    return data ?? [];
  },

  async forTechnician(technicianId) {
    const { data, error } = await supabase
      .from("work_history")
      .select(WORK_COLUMNS)
      .eq("technician_id", technicianId)
      .order("started_on", { ascending: false });

    if (error) fail(error, "workHistory.forTechnician");
    return data ?? [];
  },

  async add(entry) {
    const user = await auth.currentUser();
    if (!user) throw new ApiError("You are not signed in.", { operation: "workHistory.add" });

    // verified_status is never sent — the guard trigger in 005 forces
    // 'self_declared' on insert for anyone who is not an admin.
    const { error } = await supabase.from("work_history").insert({
      technician_id: user.id,
      plant_name: entry.plantName,
      client_company: entry.clientCompany || null,
      role_title: entry.roleTitle,
      location_city: entry.locationCity || null,
      started_on: entry.startedOn,
      ended_on: entry.isCurrent ? null : (entry.endedOn || null),
      is_current: Boolean(entry.isCurrent),
      summary: entry.summary || null,
      skills_used: entry.skillsUsed ?? [],
    });

    if (error) fail(error, "workHistory.add");
  },

  async remove(id) {
    const { error } = await supabase.from("work_history").delete().eq("id", id);
    if (error) fail(error, "workHistory.remove");
  },

  /** Server-side rollup; overlapping engagements count once. */
  async summary(technicianId) {
    const { data, error } = await supabase
      .rpc("work_experience_summary", { p_technician_id: technicianId });

    if (error) fail(error, "workHistory.summary");
    return data?.[0] ?? { total_months: 0, plant_count: 0, latest_role: null };
  },
};

/** "Mar 2021 – Present" / "Mar 2021 – Aug 2023" */
export function formatSpan(startedOn, endedOn, isCurrent) {
  const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  if (!startedOn) return "";
  return `${fmt(startedOn)} – ${isCurrent || !endedOn ? "Present" : fmt(endedOn)}`;
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const projects = {
  async mine() {
    const user = await auth.currentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("projects")
      .select(PROJECT_COLUMNS)
      .eq("client_id", user.id)
      .order("created_at", { ascending: false });

    if (error) fail(error, "projects.mine");
    return data ?? [];
  },

  async create(fields) {
    const user = await auth.currentUser();
    if (!user) throw new ApiError("You are not signed in.", { operation: "projects.create" });

    const { data, error } = await supabase
      .from("projects")
      .insert({ ...fields, client_id: user.id })
      .select(PROJECT_COLUMNS)
      .single();

    if (error) fail(error, "projects.create");
    return data;
  },

  /**
   * Commits a shortlist to project_matches.
   *
   * This used to POST to a `matching-engine` Edge Function that was never
   * written or deployed, so every "Find more" click was a 404 the UI reported
   * as a generic failure. The scorer now lives in the database (migration 013)
   * where the data is, and this is a plain RPC. Returns how many rows were
   * written or re-scored.
   *
   * Re-running is safe: run_matching() upserts scores without resetting a
   * technician's response or their alert timestamp, so nobody is asked twice.
   */
  async runMatching(projectId, { limit = 10 } = {}) {
    const { data, error } = await supabase.rpc("run_matching", {
      p_project_id: projectId,
      p_limit: limit,
    });
    if (error) fail(error, "projects.runMatching");
    return { written: data ?? 0 };
  },
};

// ---------------------------------------------------------------------------
// Matches — reads the PII-masked view, never the profiles table
// ---------------------------------------------------------------------------

export const matches = {
  /**
   * Scores the pool without writing anything.
   *
   * Separate from runMatching() on purpose: previewing is free and idempotent,
   * whereas committing mints the ledger rows the WhatsApp webhook resolves
   * replies against, and is what eventually costs money in Meta message fees.
   * A client browsing candidates should not be spending either.
   */
  async preview(projectId, limit = 25) {
    const { data, error } = await supabase.rpc("rank_candidates", {
      p_project_id: projectId,
      p_limit: limit,
    });
    if (error) fail(error, "matches.preview");
    return data ?? [];
  },

  async forProject(projectId) {
    const { data, error } = await supabase
      .from("project_matches")
      .select("id, technician_id, match_score, score_breakdown, rank, response, alert_sent_at, expires_at")
      .eq("project_id", projectId)
      .order("match_score", { ascending: false });

    if (error) fail(error, "matches.forProject");
    if (!data?.length) return [];

    const { data: directory, error: directoryError } = await supabase
      .from("technician_directory")
      .select(
        // NO daily_rate — that is our cost price under the principal model
        // (migration 006). rate_band gives seniority without the number.
        "technician_id, full_name, location_city, rate_band, reliability_score, " +
        "skills_array, verified_status, certificate_url, video_passport_url",
      )
      .in("technician_id", data.map((m) => m.technician_id));

    if (directoryError) fail(directoryError, "matches.directory");

    const byId = new Map((directory ?? []).map((t) => [t.technician_id, t]));
    return data.map((match) => ({ ...match, technician: byId.get(match.technician_id) ?? null }));
  },
};

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

export const milestones = {
  async forProject(projectId) {
    const { data, error } = await supabase
      .from("milestones")
      .select(MILESTONE_COLUMNS)      // never "*" — most columns are revoked
      .eq("project_id", projectId);

    if (error) fail(error, "milestones.forProject");

    const ORDER = { arrival_30: 0, mid_project_40: 1, completion_30: 2 };
    return (data ?? []).sort((a, b) => ORDER[a.milestone_stage] - ORDER[b.milestone_stage]);
  },

  async forTechnician() {
    const user = await auth.currentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("milestones")
      .select(`${MILESTONE_COLUMNS}, projects(title, location_city)`)
      .eq("technician_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) fail(error, "milestones.forTechnician");
    return data ?? [];
  },

  /** Client sign-off on submitted work. Releasing escrow stays admin-only. */
  async approve(milestoneId) {
    const { error } = await supabase
      .from("milestones")
      .update({ work_status: "approved" })
      .eq("id", milestoneId);

    if (error) fail(error, "milestones.approve");
  },

  async raiseDispute(milestoneId, reason) {
    if (!reason?.trim()) {
      throw new ApiError("A dispute needs a reason.", { operation: "milestones.raiseDispute" });
    }

    const { error } = await supabase
      .from("milestones")
      .update({ escrow_status: "disputed", dispute_reason: reason.trim() })
      .eq("id", milestoneId);

    if (error) fail(error, "milestones.raiseDispute");
  },
};

// ---------------------------------------------------------------------------
// Admin — every read goes through an owner-rights view (migration 010).
//
// Column privileges are granted to the ROLE `authenticated`, and an admin is
// also `authenticated` — so the grants that hide technician_day_rate and
// phone_number from clients hide them from admins too. The admin_* views carry
// an is_admin() predicate: full visibility for operators, zero rows for anyone
// else.
// ---------------------------------------------------------------------------

export const admin = {
  /** True only when the signed-in user has role_type = 'admin'. */
  async isAdmin() {
    const profile = await profiles.me();
    return profile?.role_type === "admin";
  },

  /**
   * May this account claim admin?
   *
   * The console asks BEFORE rendering anything, so a person who is not on the
   * allowlist never sees a claim button at all. Offering a button and then
   * refusing the click tells a stranger that the door exists and that they
   * were measured against a list.
   */
  async canClaim() {
    const { data, error } = await supabase.rpc("can_claim_admin");
    if (error) return false;          // fail closed
    return data === true;
  },

  /** Allowlisted, verified addresses only (migration 016). */
  async claim() {
    const { data, error } = await supabase.rpc("claim_admin");
    if (error) fail(error, "admin.claim");
    return data;
  },

  async admins() {
    const { data, error } = await supabase
      .from("admin_users").select("*").order("created_at");
    if (error) fail(error, "admin.admins");
    return data ?? [];
  },

  async auditTrail(limit = 50) {
    const { data, error } = await supabase
      .from("admin_audit").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error) fail(error, "admin.auditTrail");
    return data ?? [];
  },

  async demote(profileId, newRole = "client") {
    const { error } = await supabase.rpc("demote_admin", {
      p_profile_id: profileId, p_new_role: newRole,
    });
    if (error) fail(error, "admin.demote");
  },

  /** Every role on every project, both prices, seats filled — admin only. */
  async requirements() {
    const { data, error } = await supabase
      .from("admin_requirements")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) fail(error, "admin.requirements");
    return data ?? [];
  },

  async technicians() {
    const { data, error } = await supabase
      .from("admin_technicians")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) fail(error, "admin.technicians");
    return data ?? [];
  },

  async setVerification(technicianId, status) {
    const { error } = await supabase
      .from("skill_passports")
      .update({ verified_status: status })
      .eq("technician_id", technicianId);
    if (error) fail(error, "admin.setVerification");
  },

  async projects() {
    const { data, error } = await supabase
      .from("admin_projects").select("*").order("created_at", { ascending: false });
    if (error) fail(error, "admin.projects");
    return data ?? [];
  },

  /** Prices a project from a target margin percentage. */
  async setMargin(projectId, marginPct) {
    const { data, error } = await supabase
      .rpc("set_project_margin", { p_project_id: projectId, p_margin_pct: marginPct });
    if (error) fail(error, "admin.setMargin");
    return data?.[0] ?? null;
  },

  async timesheets() {
    const { data, error } = await supabase
      .from("admin_timesheets").select("*").order("period_start", { ascending: false });
    if (error) fail(error, "admin.timesheets");
    return data ?? [];
  },

  async createTimesheet(t) {
    const { data, error } = await supabase.rpc("admin_create_timesheet", {
      p_project_id: t.projectId,
      p_technician_id: t.technicianId,
      p_period_start: t.periodStart,
      p_period_end: t.periodEnd,
      p_days_worked: t.daysWorked,
      p_holidays: t.holidays ?? 0,
      p_extra_hours: t.extraHours ?? 0,
      p_client_day_rate: t.clientDayRate,
      p_technician_day_rate: t.technicianDayRate,
      p_client_ot_hour_rate: t.clientOtRate ?? 0,
      p_technician_ot_hour_rate: t.technicianOtRate ?? 0,
    });
    if (error) fail(error, "admin.createTimesheet");
    return data;
  },

  async approveTimesheet(id) {
    const user = await auth.currentUser();
    const { error } = await supabase.from("timesheets")
      .update({ status: "approved", approved_by: user.id, approved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) fail(error, "admin.approveTimesheet");
  },

  async invoices() {
    const { data, error } = await supabase
      .from("admin_invoices").select("*").order("issue_date", { ascending: false });
    if (error) fail(error, "admin.invoices");
    return data ?? [];
  },

  async issueClientInvoice(timesheetId) {
    const { data, error } = await supabase.rpc("issue_client_invoice", { p_timesheet_id: timesheetId });
    if (error) fail(error, "admin.issueClientInvoice");
    return data;
  },

  async issuePaymentAdvice(timesheetId) {
    const { data, error } = await supabase.rpc("issue_payment_advice", { p_timesheet_id: timesheetId });
    if (error) fail(error, "admin.issuePaymentAdvice");
    return data;
  },

  async markInvoiceIssued(id) {
    const { error } = await supabase.from("invoices")
      .update({ status: "issued", issued_at: new Date().toISOString() }).eq("id", id);
    if (error) fail(error, "admin.markInvoiceIssued");
  },

  async orgSettings() {
    const { data, error } = await supabase.from("org_settings").select("*").maybeSingle();
    if (error) fail(error, "admin.orgSettings");
    return data;
  },

  async saveOrgSettings(fields) {
    const { error } = await supabase.from("org_settings").update(fields).eq("id", true);
    if (error) fail(error, "admin.saveOrgSettings");
  },
};

// ---------------------------------------------------------------------------
// Requirements and Assignments  (migrations 019, 020)
//
// A project on its own cannot be staffed. "3 machine assembly technicians" is a
// REQUIREMENT with a headcount; accepting one creates an ASSIGNMENT, which is
// the thing that carries a locked rate, dates and a lifecycle.
// ---------------------------------------------------------------------------

// technician_day_rate is deliberately absent. The column grant hides it from
// clients, and asking for it here would fail the whole select rather than just
// omitting the field.
const REQUIREMENT_COLUMNS =
  "id, project_id, role_title, headcount, required_skills, preferred_skills, " +
  "min_skill_level, min_years, location_city, starts_on, ends_on, shift, " +
  "client_day_rate, client_ot_hour_rate, travel_required, " +
  "accommodation_provided, notes, status, created_at";

export const requirements = {
  /** Roles on one project, as the owning client sees them. */
  async forProject(projectId) {
    const { data, error } = await supabase
      .from("project_requirements")
      .select(REQUIREMENT_COLUMNS)
      .eq("project_id", projectId)
      .order("created_at");
    if (error) fail(error, "requirements.forProject");
    return data ?? [];
  },

  /**
   * Creates a role. The client states what THEY will pay; the payout is set by
   * InChi afterwards through price_requirement(). Sending a payout rate here
   * would be rejected by the column grant, which is the point.
   */
  async create(fields) {
    const { data, error } = await supabase
      .from("project_requirements")
      .insert({
        project_id: fields.projectId,
        role_title: fields.roleTitle,
        headcount: fields.headcount ?? 1,
        required_skills: fields.requiredSkills ?? [],
        preferred_skills: fields.preferredSkills ?? [],
        min_skill_level: fields.minSkillLevel ?? "L2",
        location_city: fields.locationCity ?? null,
        starts_on: fields.startsOn,
        ends_on: fields.endsOn,
        shift: fields.shift ?? null,
        client_day_rate: fields.clientDayRate,
        client_ot_hour_rate: fields.clientOtHourRate ?? 0,
        travel_required: Boolean(fields.travelRequired),
        accommodation_provided: Boolean(fields.accommodationProvided),
        notes: fields.notes ?? null,
      })
      .select(REQUIREMENT_COLUMNS)
      .single();
    if (error) fail(error, "requirements.create");
    return data;
  },

  /** Admin only — sets what the professional is paid. */
  async price(requirementId, technicianDayRate, technicianOtHourRate = 0) {
    const { data, error } = await supabase.rpc("price_requirement", {
      p_requirement_id: requirementId,
      p_technician_day_rate: technicianDayRate,
      p_technician_ot_hour_rate: technicianOtHourRate,
    });
    if (error) fail(error, "requirements.price");
    return data;
  },
};

export const assignments = {
  /**
   * Open, PRICED roles a professional may accept.
   *
   * Reads open_roles, which exposes the payout rate and never the client price.
   * Unpriced roles are excluded by the view — a professional should not be shown
   * work whose rate InChi has not decided.
   */
  async openRoles() {
    const { data, error } = await supabase
      .from("open_roles").select("*").order("starts_on");
    if (error) fail(error, "assignments.openRoles");
    return data ?? [];
  },

  /**
   * Accepts a role. This is the transaction, not a flag.
   *
   * The database refuses it if the dates overlap an assignment you already
   * hold, if the role is full, or if it has not been priced — so the errors
   * surfaced here are business answers, not plumbing failures, and are worth
   * showing verbatim.
   */
  async accept(requirementId) {
    const { data, error } = await supabase.rpc("accept_requirement", {
      p_requirement_id: requirementId,
    });
    if (error) fail(error, "assignments.accept");
    return data;
  },

  /**
   * My assignments, with MY payout. Read from the owner-rights view
   * my_assignments (026): the payout columns are not readable on the table,
   * because a plant can read its project's assignment rows and must never
   * see what the professional is paid.
   */
  async mine() {
    const user = await auth.currentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("my_assignments")
      .select("*")
      .order("starts_on", { ascending: false });
    if (error) fail(error, "assignments.mine");
    return data ?? [];
  },

  /**
   * The plant (project owner) or an admin confirms the work is done. The
   * database sets the assignment to completed AND writes a client-VERIFIED
   * entry on the professional's passport (025) — the career record that no
   * self-written CV can match. Idempotent. Returns the work_history id.
   */
  async signOff(assignmentId, note = null) {
    const { data, error } = await supabase.rpc("sign_off_assignment", {
      p_assignment_id: assignmentId,
      p_note: note,
    });
    if (error) fail(error, "assignments.signOff");
    return data;
  },

  async forProject(projectId) {
    const { data, error } = await supabase
      .from("assignments")
      .select("id, requirement_id, technician_id, status, starts_on, ends_on, accepted_at, completed_at")
      .eq("project_id", projectId)
      .order("accepted_at", { ascending: false });
    if (error) fail(error, "assignments.forProject");
    return data ?? [];
  },

  /** Moves an assignment along its lifecycle. */
  async setStatus(assignmentId, status) {
    const { error } = await supabase
      .from("assignments").update({ status }).eq("id", assignmentId);
    if (error) fail(error, "assignments.setStatus");
  },

  async cancel(assignmentId, reason, stage) {
    const user = await auth.currentUser();
    const { error } = await supabase.from("assignments").update({
      status: "cancelled",
      cancellation_reason: reason,
      cancellation_stage: stage ?? null,
      cancelled_by: user?.id ?? null,
    }).eq("id", assignmentId);
    if (error) fail(error, "assignments.cancel");
  },
};

// ---------------------------------------------------------------------------
// Technician's own view — the reverse of the client dashboard
// ---------------------------------------------------------------------------

export const technician = {
  /**
   * Open projects scored for me.
   *
   * Returns no client budget. total_budget is our selling price and the gap to
   * technician_cost is our margin (migration 006); the RPC returns only the
   * caller's own indicative earning, from their own day rate.
   */
  async matchingProjects(limit = 20) {
    const { data, error } = await supabase.rpc("my_matching_projects", { p_limit: limit });
    if (error) fail(error, "technician.matchingProjects");
    return data ?? [];
  },

  /** How many shortlists I am on. Real data, not a vanity counter. */
  async shortlistCount() {
    const user = await auth.currentUser();
    if (!user) return 0;
    const { count, error } = await supabase
      .from("project_matches")
      .select("id", { count: "exact", head: true })
      .eq("technician_id", user.id);
    if (error) fail(error, "technician.shortlistCount");
    return count ?? 0;
  },

  async answers() {
    const user = await auth.currentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("technician_answers")
      .select("question_key, skill_tag, answer, updated_at")
      .eq("technician_id", user.id);
    if (error) fail(error, "technician.answers");
    return data ?? [];
  },

  async saveAnswer(questionKey, skillTag, answer) {
    const user = await auth.currentUser();
    if (!user) throw new ApiError("You are not signed in.", { operation: "technician.saveAnswer" });

    const text = String(answer ?? "").trim();
    if (!text) {
      const { error } = await supabase.from("technician_answers").delete()
        .eq("technician_id", user.id).eq("question_key", questionKey);
      if (error) fail(error, "technician.clearAnswer");
      return null;
    }

    const { error } = await supabase.from("technician_answers").upsert(
      { technician_id: user.id, question_key: questionKey, skill_tag: skillTag, answer: text },
      { onConflict: "technician_id,question_key" },
    );
    if (error) fail(error, "technician.saveAnswer");
    return text;
  },
};

// ---------------------------------------------------------------------------
// Client Reliability Index
// ---------------------------------------------------------------------------

/**
 * Derived in the browser from the client's own milestone history — there is no
 * stored column for it yet.
 *
 * LIMITATION worth knowing before you show this to a plant head: RLS means a
 * client only ever sees their OWN milestones, so this is self-referential. A
 * trustworthy cross-client index has to be computed server-side (a trigger
 * maintaining a column on `profiles`, or a nightly job). Treat this as an
 * indicative figure, not a rating.
 */
export function clientReliabilityIndex(milestoneRows) {
  if (!milestoneRows?.length) {
    return { score: null, grade: "New", released: 0, disputed: 0, total: 0 };
  }

  const total = milestoneRows.length;
  const released = milestoneRows.filter((m) => m.escrow_status === "released").length;
  const disputed = milestoneRows.filter((m) => m.escrow_status === "disputed").length;
  const approved = milestoneRows.filter((m) => m.work_status === "approved").length;

  // Releases and prompt approvals build the score; disputes cost double.
  const raw = (released / total) * 60 + (approved / total) * 40 - (disputed / total) * 40;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  const grade = score >= 85 ? "Excellent"
    : score >= 70 ? "Good"
    : score >= 50 ? "Fair"
    : "Needs attention";

  return { score, grade, released, disputed, approved, total };
}


// ---------------------------------------------------------------------------
// Client billing identity — the plant's legal name, address, state and GSTIN.
// Without it no client invoice can exist: issue_client_invoice() refuses.
// The state decides CGST+SGST (same state as InChi, code 29) versus IGST.
// ---------------------------------------------------------------------------

/** GST state codes. The first two digits of a GSTIN are the state code. */
export const GST_STATES = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu", "27": "Maharashtra", "29": "Karnataka", "30": "Goa",
  "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry",
  "35": "Andaman & Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh",
};

export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const billing = {
  /** The signed-in plant's billing identity, or null if not yet entered. */
  async mine() {
    const user = await auth.currentUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("client_billing")
      .select("legal_name, billing_address, state_code, state_name, gstin, contact_email, updated_at")
      .eq("client_id", user.id)
      .maybeSingle();
    if (error) fail(error, "billing.mine");
    return data ?? null;
  },

  /**
   * Saves the billing identity. GSTIN is optional (an unregistered plant is
   * still a customer) but if present it must be well-formed and its state
   * must agree with the chosen state — a mismatch here becomes a wrong tax
   * split on every invoice.
   */
  async save({ legalName, address, stateCode, gstin = null, contactEmail = null }) {
    const user = await auth.currentUser();
    if (!user) throw new ApiError("You are not signed in.", { operation: "billing.save" });

    const code = String(stateCode ?? "").padStart(2, "0");
    const stateName = GST_STATES[code];
    if (!stateName) throw new ApiError("Choose the state your plant is registered in.", { operation: "billing.save" });

    const clean = gstin ? gstin.trim().toUpperCase() : null;
    if (clean && !GSTIN_PATTERN.test(clean)) {
      throw new ApiError("That GSTIN is not in the right format (15 characters, e.g. 29AAFCI9487D1Z2).", { operation: "billing.save" });
    }
    if (clean && clean.slice(0, 2) !== code) {
      throw new ApiError(`This GSTIN belongs to ${GST_STATES[clean.slice(0, 2)] ?? "another state"}, but you chose ${stateName}.`, { operation: "billing.save" });
    }

    const { error } = await supabase.from("client_billing").upsert({
      client_id: user.id,
      legal_name: legalName.trim(),
      billing_address: address.trim(),
      state_code: code,
      state_name: stateName,
      gstin: clean,
      contact_email: contactEmail?.trim() || null,
    }, { onConflict: "client_id" });
    if (error) fail(error, "billing.save");
    return this.mine();
  },
};
