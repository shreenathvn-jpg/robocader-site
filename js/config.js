/**
 * RoboCADer Pro — browser configuration
 *
 * Replace the placeholders below, or inject them at build time in Netlify.
 *
 * ONLY the anon key belongs here. It is public by design and every request it
 * makes is still filtered by Row Level Security. The SERVICE ROLE key bypasses
 * RLS entirely — if it ever appears in this file, every technician's phone
 * number in the database is readable by anyone who opens DevTools.
 */

window.ROBOCADER_CONFIG = {
  SUPABASE_URL: "https://aaowenloqayhpxontkna.supabase.co",

  // Publishable key (Supabase's replacement for the legacy anon key). Public by
  // design — every request it makes is still filtered by Row Level Security.
  SUPABASE_ANON_KEY: "sb_publishable_4yGGVqzAIFJ_EwEUrF3C8w_MewnFQAX",

  // Browser Sentry DSN. Use a SEPARATE Sentry project from the backend.
  // Leave blank to run without error reporting.
  SENTRY_DSN: "",
  SENTRY_ENVIRONMENT: "development",
  RELEASE: "robocader-pro@0.1.0",

  /**
   * MOBILE VERIFICATION BEFORE A PASSWORD IS SET.
   *
   * Off until an OTP channel is actually live. Turning it on before then makes
   * registration impossible — the code is sent, nothing arrives, and every
   * technician stops at the first screen.
   *
   *   "sms"      Supabase Phone auth. Needs a provider (Twilio / MSG91 /
   *              Textlocal) AND, in India, DLT registration of InChi and every
   *              template on the operator portals. 1-3 working days. Note that
   *              DND on a recipient number blocks these.
   *
   *   "whatsapp" Meta Cloud API. No DLT. Needs template approval, 1-3 days.
   *              Better fit here: technicians already live in WhatsApp, and the
   *              webhook and client for it are already written.
   *
   *   false      Current behaviour. Mobile is collected as a form field and
   *              trusted, the way Naukri does it.
   */
  REQUIRE_PHONE_VERIFICATION: false,
};
