/**
 * filterbar.js — reusable, client-side faceted filter + search for list panels.
 *
 * WHY
 *   A flat list is fine for a demo and useless at 500 rows. Every management
 *   panel (technicians, roles, projects, timesheets, invoices) is the same
 *   shape: an array in memory rendered to cards. This gives all of them one
 *   toolbar — a search box plus any number of dropdown facets that AND
 *   together — without a backend change. Client-side is smooth to a few
 *   thousand rows; past that, move the same facet definitions server-side.
 *
 * USAGE
 *   const fb = createFilterBar(mountEl, {
 *     search: { placeholder: "Search…", get: (row) => [row.name, row.phone] },
 *     facets: [
 *       { key: "city",  label: "Location",   get: (r) => r.location_city, derive: true },
 *       { key: "skill", label: "Skill",      get: (r) => r.skills_array, multi: true,
 *                       derive: true, optionLabel: tagLabel },
 *       { key: "years", label: "Experience", get: (r) => r.years_experience, kind: "range",
 *                       buckets: YEAR_BUCKETS },
 *       { key: "status",label: "Status",     get: (r) => r.verified_status, options: ["verified","pending"] },
 *     ],
 *     onChange: renderList,   // called on every control change
 *   });
 *
 *   function renderList() {
 *     const all  = notArchived(cache.technicians);
 *     fb.setData(all);                 // (re)builds derived options; idempotent
 *     const rows = fb.apply(all);      // the filtered subset
 *     paint(rows);
 *     fb.setCount(rows.length, all.length);
 *   }
 *
 * A facet is one of:
 *   - plain  : String(get(row)) === selected value
 *   - multi  : get(row) is an array; selected value must be in it
 *   - range  : get(row) is a number; must fall in the selected bucket [min,max)
 */

export const YEAR_BUCKETS = [
  { key: "0-1",  label: "Under 1 yr", min: 0,  max: 1 },
  { key: "1-3",  label: "1–3 yrs",    min: 1,  max: 3 },
  { key: "3-5",  label: "3–5 yrs",    min: 3,  max: 5 },
  { key: "5-10", label: "5–10 yrs",   min: 5,  max: 10 },
  { key: "10+",  label: "10+ yrs",    min: 10, max: Infinity },
];

const escOpt = (v) => String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function createFilterBar(mount, { search = null, facets = [], onChange } = {}) {
  const state = { q: "", values: {} };          // values: { facetKey: selectedValue }
  let built = false;
  let lastSig = null;

  // --- render the toolbar shell ---------------------------------------------
  const searchHtml = search ? `
    <div class="relative flex-1 min-w-[180px]">
      <i class="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
      <input data-fb="q" type="search" placeholder="${escOpt(search.placeholder ?? "Search…")}"
             class="w-full pl-9 pr-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-slate-500 focus:outline-none">
    </div>` : "";

  const facetHtml = facets.map((f) => `
    <select data-fb-facet="${escOpt(f.key)}"
            class="px-3 py-2 border-2 border-slate-200 rounded-xl text-sm bg-white focus:border-slate-500 focus:outline-none max-w-[13rem]">
      <option value="">${escOpt(f.label)}: all</option>
    </select>`).join("");

  mount.innerHTML = `
    <div class="flex flex-wrap items-center gap-2 mb-4">
      ${searchHtml}
      ${facetHtml}
      <span data-fb="count" class="text-xs text-slate-400 num ml-auto"></span>
      <button data-fb="clear" class="hidden text-xs font-semibold text-blue-600 hover:text-blue-800">Clear</button>
    </div>`;

  const qEl = mount.querySelector('[data-fb="q"]');
  const countEl = mount.querySelector('[data-fb="count"]');
  const clearEl = mount.querySelector('[data-fb="clear"]');
  const facetEls = new Map(facets.map((f) => [f.key, mount.querySelector(`[data-fb-facet="${f.key}"]`)]));

  const anyActive = () => Boolean(state.q) || Object.values(state.values).some(Boolean);
  const syncClear = () => clearEl.classList.toggle("hidden", !anyActive());

  qEl?.addEventListener("input", () => { state.q = qEl.value.trim().toLowerCase(); syncClear(); onChange?.(); });
  for (const f of facets) {
    facetEls.get(f.key).addEventListener("change", (e) => {
      state.values[f.key] = e.target.value;
      syncClear();
      onChange?.();
    });
  }
  clearEl.addEventListener("click", () => {
    state.q = "";
    state.values = {};
    if (qEl) qEl.value = "";
    for (const el of facetEls.values()) el.value = "";
    syncClear();
    onChange?.();
  });

  // --- build the dropdown option lists from the full dataset -----------------
  // Idempotent: only rebuilds when the data signature (length + first/last id)
  // changes, so typing in the search box never rebuilds selects or drops a
  // chosen value. A previously-selected value that has vanished is kept as a
  // dangling option so the filter still reads correctly.
  function setData(rows) {
    const sig = `${rows.length}:${rows[0]?.id ?? ""}:${rows[rows.length - 1]?.id ?? ""}`;
    if (built && sig === lastSig) return;
    built = true; lastSig = sig;

    for (const f of facets) {
      const el = facetEls.get(f.key);
      const current = state.values[f.key] ?? "";
      let optionsHtml = `<option value="">${escOpt(f.label)}: all</option>`;

      if (f.kind === "range") {
        const buckets = f.buckets ?? YEAR_BUCKETS;
        optionsHtml += buckets.map((b) => `<option value="${escOpt(b.key)}">${escOpt(b.label)}</option>`).join("");
      } else {
        let values;
        if (f.options) {
          values = f.options.slice();
        } else {
          // derive distinct values from the data
          const set = new Set();
          for (const r of rows) {
            const v = f.get(r);
            if (Array.isArray(v)) v.forEach((x) => x != null && x !== "" && set.add(x));
            else if (v != null && v !== "") set.add(v);
          }
          values = [...set].sort((a, b) => String(a).localeCompare(String(b)));
        }
        optionsHtml += values.map((v) => {
          const label = f.optionLabel ? f.optionLabel(v) : v;
          return `<option value="${escOpt(v)}">${escOpt(label)}</option>`;
        }).join("");
        // keep a stale selection visible if it no longer appears in the data
        if (current && !values.map(String).includes(current)) {
          const label = f.optionLabel ? f.optionLabel(current) : current;
          optionsHtml += `<option value="${escOpt(current)}">${escOpt(label)}</option>`;
        }
      }
      el.innerHTML = optionsHtml;
      el.value = current;   // restore selection after rebuild
    }
  }

  // --- filter ---------------------------------------------------------------
  function apply(rows) {
    let out = rows;
    if (state.q && search) {
      const q = state.q;
      out = out.filter((r) => (search.get(r) ?? []).some((v) => String(v ?? "").toLowerCase().includes(q)));
    }
    for (const f of facets) {
      const v = state.values[f.key];
      if (!v) continue;
      if (f.kind === "range") {
        const b = (f.buckets ?? YEAR_BUCKETS).find((x) => x.key === v);
        if (b) out = out.filter((r) => { const n = Number(f.get(r) ?? 0); return n >= b.min && n < b.max; });
      } else if (f.multi) {
        out = out.filter((r) => (f.get(r) ?? []).map(String).includes(v));
      } else {
        out = out.filter((r) => String(f.get(r) ?? "") === v);
      }
    }
    return out;
  }

  function setCount(shown, total) {
    if (countEl) countEl.textContent = shown === total ? `${total}` : `${shown} of ${total}`;
  }

  return { apply, setData, setCount, state, reset: () => clearEl.click() };
}
