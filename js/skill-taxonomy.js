/**
 * COPIED from api/lib/skill-taxonomy.js by scripts/deploy-site.sh — do not edit here.
 */
/**
 * RoboCADer Pro — Industrial skill taxonomy
 * InChi Solutions
 *
 * Maps the many ways a shop-floor technician describes a skill onto one
 * canonical tag. The canonical tags are what land in
 * `skill_passports.skills_array` and what `projects.required_skills` is
 * matched against, so THE TWO SIDES MUST USE THIS SAME FILE. A project asking
 * for "Siemens PLC" and a passport holding "S7-1200" have to collide on
 * `Siemens_PLC` or the array-overlap match silently returns nothing.
 *
 * TWO TIERS, AND WHY
 *   COMPETENCY tags are the sixteen things a person can be good at. These are
 *   what a technician rates themselves on, L1 to L4, during registration, and
 *   what a client specifies when posting work.
 *
 *   DETAIL tags are the brand, platform or sub-trade underneath — Siemens vs
 *   Allen-Bradley, welding vs fitting. They carry no separate level; they
 *   inherit the level of the competency they sit under.
 *
 *   The distinction is commercial, not cosmetic. "PLC programmer, L3" is what
 *   a technician is; "knows TIA Portal and not RSLogix" is what decides whether
 *   they can walk onto a specific line on Monday morning. Collapsing the two
 *   loses real money — a plant with Allen-Bradley gear cannot use a Siemens
 *   specialist, however senior. Keeping only the brands loses the person.
 *
 * A FEW DETAIL TAGS HAVE NO PARENT
 *   CAD_Design, CNC_Programming and Quality_Inspection sit outside the sixteen.
 *   They still resolve from free text and still match projects — they simply do
 *   not appear as a rated row on the registration form, because the competency
 *   list does not include them. Give them a home and they become rateable.
 *
 * Aliases include Hinglish and transliterated forms because that is how
 * technicians actually type on WhatsApp ("panel wiring ka kaam", "welding ka
 * experience"). Matching is accent-insensitive and separator-insensitive.
 *
 * ORDERING MATTERS: aliases are matched longest-first, so "siemens s7" wins
 * over "s7", "servo drive" is not swallowed by "drive", and the specific
 * "electrical maintenance" is consumed before the generic "maintenance".
 */

/**
 * @typedef {{
 *   tag: string,
 *   label: string,
 *   description?: string,
 *   category: string,
 *   kind: "competency" | "detail",
 *   competency: string | null,
 *   order?: number,
 *   aliases: string[]
 * }} SkillDefinition
 */

/** @type {SkillDefinition[]} */
export const SKILL_TAXONOMY = [
  // ===========================================================================
  // 1. PLC Programming & Troubleshooting
  // ===========================================================================
  {
    tag: "PLC_Programming",
    label: "PLC Programming & Troubleshooting",
    description:
      "Write, modify and fault-find ladder or structured text on plant PLCs, and get a stopped line running again.",
    category: "automation",
    kind: "competency",
    competency: null,
    order: 1,
    aliases: [
      "plc programming and troubleshooting", "plc programming & troubleshooting",
      "plc troubleshooting", "plc programming", "plc programing", "ladder logic",
      "ladder programming", "structured text", "function block diagram",
      "plc ka kaam", "plc work", "plc programmer", "plc engineer", "plc",
    ],
  },
  {
    tag: "Siemens_PLC",
    label: "Siemens",
    category: "automation",
    kind: "detail",
    competency: "PLC_Programming",
    aliases: [
      "siemens s7 plc", "siemens simatic", "siemens plc", "simatic s7", "tia portal",
      "step 7", "step7", "s7-1200", "s7 1200", "s7-1500", "s7 1500", "s7-300",
      "s7 300", "s7-400", "s7 400", "siemens s7", "simatic", "siemens",
    ],
  },
  {
    tag: "Allen_Bradley_PLC",
    label: "Allen-Bradley / Rockwell",
    category: "automation",
    kind: "detail",
    competency: "PLC_Programming",
    aliases: [
      "allen bradley plc", "rockwell automation", "allen bradley", "allen-bradley",
      "rslogix", "studio 5000", "controllogix", "compactlogix", "micrologix",
      "rockwell", "ab plc",
    ],
  },
  {
    tag: "ABB_PLC",
    label: "ABB",
    category: "automation",
    kind: "detail",
    competency: "PLC_Programming",
    aliases: ["abb plc", "abb automation builder", "ac500", "abb ac500"],
  },
  {
    tag: "Mitsubishi_PLC",
    label: "Mitsubishi",
    category: "automation",
    kind: "detail",
    competency: "PLC_Programming",
    aliases: [
      "mitsubishi plc", "gx works", "gxworks", "melsec", "fx3u", "fx5u", "mitsubishi",
    ],
  },
  {
    tag: "Delta_PLC",
    label: "Delta",
    category: "automation",
    kind: "detail",
    competency: "PLC_Programming",
    aliases: ["delta plc", "delta dvp", "wplsoft", "ispsoft", "dvp series"],
  },
  {
    tag: "Omron_PLC",
    label: "Omron",
    category: "automation",
    kind: "detail",
    competency: "PLC_Programming",
    aliases: ["omron plc", "cx programmer", "cx-programmer", "sysmac", "omron"],
  },
  {
    tag: "Schneider_PLC",
    label: "Schneider",
    category: "automation",
    kind: "detail",
    competency: "PLC_Programming",
    aliases: [
      "schneider plc", "modicon", "unity pro", "ecostruxure", "m241", "m251", "schneider",
    ],
  },

  // ===========================================================================
  // 2. Panel Wiring & Electrical Assembly
  // ===========================================================================
  {
    tag: "Panel_Wiring",
    label: "Panel Wiring & Electrical Assembly",
    description:
      "Build and wire control panels from schematics \u2014 MCC, PCC and control \u2014 and redline the as-built changes.",
    category: "electrical",
    kind: "competency",
    competency: null,
    order: 2,
    aliases: [
      "panel wiring and electrical assembly", "panel wiring & electrical assembly",
      "control panel wiring", "electrical assembly", "panel wiring", "panel wireman",
      "panel building", "control panel", "wiring harness", "panel assembly",
      "panel ka kaam", "wiring ka kaam", "electrical panel", "mcc panel",
      "pcc panel", "busbar", "ferruling", "wireman", "wiring",
    ],
  },

  // ===========================================================================
  // 3. Industrial Robotics Programming
  // ===========================================================================
  {
    tag: "Robotics",
    label: "Industrial Robotics Programming",
    description:
      "Teach, program and recover industrial robots and the cells they work in.",
    category: "robotics",
    kind: "competency",
    competency: null,
    order: 3,
    aliases: [
      "industrial robotics programming", "industrial robotics", "robot programming",
      "abb robot programming", "fanuc robot programming", "kuka robot programming",
      "robot teaching", "robot maintenance", "industrial robot", "abb robot",
      "fanuc robot", "kuka robot", "yaskawa", "motoman", "cobot",
      "collaborative robot", "robotics", "robot", "rapid programming", "karel",
    ],
  },
  {
    tag: "Robot_Integration",
    label: "Robot cell integration",
    category: "robotics",
    kind: "detail",
    competency: "Robotics",
    aliases: [
      "robot integration", "robot cell", "end effector", "gripper design",
      "robot commissioning", "eoat",
    ],
  },

  // ===========================================================================
  // 4. SMT Machine Operation & Maintenance
  // ===========================================================================
  {
    tag: "SMT_Operations",
    label: "SMT Machine Operation & Maintenance",
    description:
      "Set up, run and change over surface-mount lines \u2014 printer, pick and place, reflow, AOI.",
    category: "electronics",
    kind: "competency",
    competency: null,
    order: 4,
    aliases: [
      "smt machine operation and maintenance", "smt machine operation",
      "smt operator", "smt line", "smt machine", "surface mount technology",
      "pick and place machine", "pick & place", "reflow oven", "reflow soldering",
      "stencil printer", "solder paste printer", "wave soldering", "aoi machine",
      "chip mounter", "juki", "yamaha smt", "panasonic smt", "fuji nxt",
      "samsung techwin", "hanwha", "smt",
    ],
  },

  // ===========================================================================
  // 5. Vision System Integration (Barcode / Code Reading)
  // ===========================================================================
  {
    tag: "Vision_Systems",
    label: "Vision System Integration",
    description:
      "Set up cameras and code readers for inspection, traceability and barcode verification.",
    category: "automation",
    kind: "competency",
    competency: null,
    order: 5,
    aliases: [
      "vision system integration", "machine vision", "vision system", "vision inspection",
      "barcode reading", "barcode scanner", "code reading", "qr code reading",
      "datamatrix", "data matrix", "ocr inspection", "cognex", "in-sight", "insight",
      "keyence vision", "halcon", "omron vision", "basler", "smart camera",
      "image processing", "vision camera", "vision",
    ],
  },

  // ===========================================================================
  // 6. Mechanical Assembly & Integration
  // ===========================================================================
  {
    tag: "Mechanical_Assembly",
    label: "Mechanical Assembly & Integration",
    description:
      "Assemble, align and integrate machines and lines, from sub-assembly to running equipment.",
    category: "mechanical",
    kind: "competency",
    competency: null,
    order: 6,
    aliases: [
      "mechanical assembly and integration", "mechanical assembly & integration",
      "mechanical assembly", "mechanical integration", "machine assembly",
      "machine building", "sub assembly", "alignment and levelling",
      "jig and fixture", "fixture design", "assembly",
    ],
  },
  {
    tag: "Fitting",
    label: "Fitting",
    category: "mechanical",
    kind: "detail",
    competency: "Mechanical_Assembly",
    aliases: ["mechanical fitter", "machine fitting", "assembly fitter", "fitter", "fitting"],
  },
  {
    tag: "Welding",
    label: "Welding & fabrication",
    category: "mechanical",
    kind: "detail",
    competency: "Mechanical_Assembly",
    aliases: [
      "fabrication welding", "welding ka kaam", "mig welding", "tig welding",
      "arc welding", "spot welding", "welding", "welder",
    ],
  },
  {
    tag: "Hydraulics",
    label: "Hydraulics",
    category: "mechanical",
    kind: "detail",
    competency: "Mechanical_Assembly",
    aliases: ["hydraulic maintenance", "hydraulic power pack", "hydraulic system", "hydraulics"],
  },
  {
    tag: "Pneumatics",
    label: "Pneumatics",
    category: "mechanical",
    kind: "detail",
    competency: "Mechanical_Assembly",
    aliases: ["pneumatic circuit", "pneumatic system", "smc pneumatics", "pneumatics", "festo"],
  },

  // ===========================================================================
  // 7. Software Development (C# / C++ / Python)
  // ===========================================================================
  {
    tag: "Software_Development",
    label: "Software Development (C#/C++/Python)",
    description:
      "Write the software around the machine \u2014 HMIs, data logging, and the links into plant systems.",
    category: "software",
    kind: "competency",
    competency: null,
    order: 7,
    aliases: [
      "software development", "application development", "industrial software",
      "machine software", "c sharp", "c#", "csharp", "dotnet", ".net", "wpf",
      "winforms", "c++", "cpp", "python", "pyqt", "opencv", "sql server",
      "database programming", "software engineer", "software developer",
      "programming",
    ],
  },

  // ===========================================================================
  // 8. SCADA & HMI Configuration
  // ===========================================================================
  {
    tag: "SCADA_HMI",
    label: "SCADA & HMI Configuration",
    description:
      "Build and maintain the screens operators use, and the supervisory layer behind them.",
    category: "automation",
    kind: "competency",
    competency: null,
    order: 8,
    aliases: [
      "scada and hmi configuration", "scada & hmi", "scada hmi", "hmi scada",
      "supervisory control",
    ],
  },
  {
    tag: "SCADA",
    label: "SCADA",
    category: "automation",
    kind: "detail",
    competency: "SCADA_HMI",
    aliases: [
      "ignition scada", "factorytalk", "wincc", "win cc", "intouch", "citect",
      "aveva", "zenon", "scada",
    ],
  },
  {
    tag: "HMI_Configuration",
    label: "HMI configuration",
    category: "automation",
    kind: "detail",
    competency: "SCADA_HMI",
    aliases: [
      "hmi configuration", "hmi programming", "touch panel", "operator panel",
      "hmi design", "weintek", "hmi",
    ],
  },
  {
    tag: "DCS",
    label: "DCS",
    category: "automation",
    kind: "detail",
    competency: "SCADA_HMI",
    aliases: [
      "distributed control system", "honeywell dcs", "yokogawa", "delta v",
      "deltav", "dcs",
    ],
  },

  // ===========================================================================
  // 9. VFD & Motion Control Tuning
  // ===========================================================================
  {
    tag: "VFD_Motion_Control",
    label: "VFD & Motion Control Tuning",
    description:
      "Commission and tune drives and servos, including multi-axis and cam profile work.",
    category: "electrical",
    kind: "competency",
    competency: null,
    order: 9,
    aliases: [
      "vfd and motion control tuning", "vfd & motion control", "motion control tuning",
      "motion control", "drive tuning", "axis tuning", "cam profile",
      "electronic gearing",
    ],
  },
  {
    tag: "VFD_Drives",
    label: "VFD drives",
    category: "electrical",
    kind: "detail",
    competency: "VFD_Motion_Control",
    aliases: [
      "variable frequency drive", "drive commissioning", "danfoss drive", "altivar",
      "sinamics", "micromaster", "ac drive", "vfd drive", "vfd",
    ],
  },
  {
    tag: "Servo_Drives",
    label: "Servo drives",
    category: "electrical",
    kind: "detail",
    competency: "VFD_Motion_Control",
    aliases: ["servo drive", "servo motor", "servo tuning", "stepper motor", "servo"],
  },

  // ===========================================================================
  // 10. Instrumentation & Sensor Calibration
  // ===========================================================================
  {
    tag: "Instrumentation",
    label: "Instrumentation & Sensor Calibration",
    description:
      "Calibrate field instruments, check loops end to end, and produce the certificates.",
    category: "instrumentation",
    kind: "competency",
    competency: null,
    order: 10,
    aliases: [
      "instrumentation and sensor calibration", "instrumentation & calibration",
      "sensor calibration", "transmitter calibration", "field instrumentation",
      "instrument technician", "loop checking", "instrumentation and control",
      "process instrumentation", "load cell", "proximity sensor", "thermocouple",
      "rtd", "flow meter", "pressure transmitter", "calibration", "i&c",
      "instrumentation",
    ],
  },

  // ===========================================================================
  // 11. Commissioning & On-Site Startup
  // ===========================================================================
  {
    tag: "Commissioning",
    label: "Commissioning & On-Site Startup",
    description:
      "Take equipment from installed to running and handed over, including FAT and SAT.",
    category: "project",
    kind: "competency",
    competency: null,
    order: 11,
    aliases: [
      "commissioning and on-site startup", "commissioning & startup",
      "installation and commissioning", "erection and commissioning",
      "site commissioning", "i&c commissioning", "startup support", "on site startup",
      "site startup", "fat sat", "site acceptance test", "factory acceptance test",
      "commissioning",
    ],
  },

  // ===========================================================================
  // 12. Preventive & Predictive Maintenance
  // ===========================================================================
  {
    tag: "Maintenance",
    label: "Preventive & Predictive Maintenance",
    description:
      "Keep plant running \u2014 scheduled maintenance, breakdown response and condition monitoring.",
    category: "maintenance",
    kind: "competency",
    competency: null,
    order: 12,
    aliases: [
      "preventive and predictive maintenance", "preventive & predictive maintenance",
      "predictive maintenance", "preventive maintenance", "condition monitoring",
      "vibration analysis", "thermography", "breakdown maintenance",
      "planned maintenance", "maintenance planning", "cmms", "tpm", "maintenance",
    ],
  },
  {
    tag: "Electrical_Maintenance",
    label: "Electrical maintenance",
    category: "maintenance",
    kind: "detail",
    competency: "Maintenance",
    aliases: [
      "electrical maintenance", "electrical maintainance", "maintenance electrician",
      "electrical repair", "bijli ka kaam", "electrician",
    ],
  },
  {
    tag: "Mechanical_Maintenance",
    label: "Mechanical maintenance",
    category: "maintenance",
    kind: "detail",
    competency: "Maintenance",
    aliases: [
      "mechanical maintenance", "mechanical maintainance", "machine maintenance",
      "plant maintenance",
    ],
  },

  // ===========================================================================
  // 13. Safety System Implementation
  // ===========================================================================
  {
    tag: "Safety_Systems",
    label: "Safety System Implementation",
    description:
      "Install and validate safety circuits \u2014 light curtains, relays, safety PLCs \u2014 to standard.",
    category: "safety",
    kind: "competency",
    competency: null,
    order: 13,
    aliases: [
      "safety system implementation", "functional safety", "safety plc",
      "safety relay", "light curtain", "safety scanner", "safety interlock",
      "emergency stop", "e-stop", "lockout tagout", "loto", "risk assessment",
      "machine safety", "iso 13849", "iec 62061", "sil rating", "pilz",
      "safety system", "safety",
    ],
  },

  // ===========================================================================
  // 14. MES & IIoT Integration
  // ===========================================================================
  {
    tag: "MES_IIoT",
    label: "MES & IIoT Integration",
    description:
      "Connect plant equipment to business systems using OPC UA, MQTT and industrial protocols.",
    category: "digital",
    kind: "competency",
    competency: null,
    order: 14,
    aliases: [
      "mes and iiot integration", "mes & iiot", "mes integration", "iiot integration",
      "industrial iot", "industry 4.0", "industry 4", "opc ua", "opc-ua", "opc",
      "mqtt", "modbus tcp", "profinet", "ethernet ip", "ethercat",
      "manufacturing execution system", "scada to erp", "erp integration",
      "data acquisition", "historian", "oee monitoring", "digital twin",
      "iiot", "mes",
    ],
  },

  // ===========================================================================
  // 15. Project Management & Team Lead
  // ===========================================================================
  {
    tag: "Project_Supervision",
    label: "Project Management & Team Lead",
    description:
      "Run the job and the team on site, and deal with the customer directly.",
    category: "project",
    kind: "competency",
    competency: null,
    order: 15,
    aliases: [
      "project management and team lead", "project management & team lead",
      "project management", "project manager", "project supervision", "team lead",
      "team leader", "site supervisor", "shift incharge", "line supervisor",
      "project planning", "resource planning", "client coordination", "supervisor",
    ],
  },

  // ===========================================================================
  // 16. Technical Documentation & Training
  // ===========================================================================
  {
    tag: "Documentation_Training",
    label: "Technical Documentation & Training",
    description:
      "Produce manuals, SOPs and as-built drawings, and train the people who will run it.",
    category: "project",
    kind: "competency",
    competency: null,
    order: 16,
    aliases: [
      "technical documentation and training", "technical documentation & training",
      "technical documentation", "documentation", "sop preparation",
      "operation manual", "maintenance manual", "user manual", "as built drawing",
      "training delivery", "operator training", "technical training", "handover",
      "knowledge transfer", "training",
    ],
  },

  // ===========================================================================
  // Unparented details — real skills the sixteen do not cover.
  // They resolve from free text and match projects, but have no rated row.
  // ===========================================================================
  {
    tag: "CAD_Design",
    label: "CAD design & drafting",
    category: "design",
    kind: "detail",
    competency: null,
    aliases: [
      "autocad", "solidworks", "solid works", "catia", "creo", "pro engineer",
      "nx cad", "fusion 360", "inventor", "cad design", "2d drafting",
      "3d modelling", "3d modeling", "draughtsman", "draftsman", "eplan", "cad",
    ],
  },
  {
    tag: "CNC_Programming",
    label: "CNC programming",
    category: "mechanical",
    kind: "detail",
    competency: null,
    aliases: [
      "cnc programming", "cnc operator", "vmc operator", "g code", "g-code",
      "fanuc cnc", "cnc machining", "cnc setter", "cnc",
    ],
  },
  {
    tag: "Quality_Inspection",
    label: "Quality inspection",
    category: "quality",
    kind: "detail",
    competency: null,
    aliases: [
      "quality inspection", "quality control", "qc inspector", "cmm operator",
      "quality check", "incoming inspection", "qa qc",
    ],
  },
];

/** The sixteen rated competencies, in the order they appear on the form. */
export const COMPETENCIES = SKILL_TAXONOMY
  .filter((s) => s.kind === "competency")
  .sort((a, b) => a.order - b.order);

/** Detail tags belonging to a competency, or [] if it has none. */
export function detailsFor(competencyTag) {
  return SKILL_TAXONOMY.filter((s) => s.competency === competencyTag);
}

/** Strips accents, lowercases, and collapses separators so all forms compare equal. */
export function normaliseText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_\-/\\]+/g, " ")
    .replace(/[^a-z0-9\s&.+#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Canonical tag lookup, longest alias first.
 * Pre-flattened at module load so per-message parsing stays O(aliases).
 */
const ALIAS_INDEX = SKILL_TAXONOMY
  .flatMap((skill) => skill.aliases.map((alias) => ({ alias: normaliseText(alias), tag: skill.tag })))
  .sort((a, b) => b.alias.length - a.alias.length);

const VALID_TAGS = new Set(SKILL_TAXONOMY.map((s) => s.tag));

export function isKnownSkillTag(tag) {
  return VALID_TAGS.has(tag);
}

/** The competency a tag belongs to — itself if it is one, its parent if not. */
export function competencyOf(tag) {
  const skill = SKILL_TAXONOMY.find((s) => s.tag === tag);
  if (!skill) return null;
  return skill.kind === "competency" ? skill.tag : skill.competency;
}

/** Resolves one free-text phrase to a canonical tag, or null. */
export function resolveSkillTag(phrase) {
  const needle = normaliseText(phrase);
  if (!needle) return null;

  const exact = ALIAS_INDEX.find((entry) => entry.alias === needle);
  if (exact) return exact.tag;

  const contained = ALIAS_INDEX.find((entry) =>
    new RegExp(`(^|\\s)${escapeRegex(entry.alias)}($|\\s)`).test(needle)
  );
  return contained ? contained.tag : null;
}

/**
 * Scans a full message for every skill mentioned.
 *
 * Matched spans are blanked out as we go, so "Siemens S7 PLC" yields
 * `Siemens_PLC` alone rather than also tripping the generic `PLC` alias.
 * Longest-first ordering is what makes that work.
 */
export function extractSkillTags(message) {
  let haystack = ` ${normaliseText(message)} `;
  const found = [];

  for (const { alias, tag } of ALIAS_INDEX) {
    if (found.includes(tag)) continue;
    const pattern = new RegExp(`(^|\\s)${escapeRegex(alias)}(?=$|\\s)`, "g");
    if (pattern.test(haystack)) {
      found.push(tag);
      haystack = haystack.replace(new RegExp(`(^|\\s)${escapeRegex(alias)}(?=$|\\s)`, "g"), " ");
    }
  }

  return found;
}

/**
 * Every mentioned skill, plus the competency each detail tag rolls up to.
 *
 * A technician who writes only "TIA Portal" is a PLC programmer, and a project
 * asking for `PLC_Programming` must find them. Without the roll-up the overlap
 * match misses, because `Siemens_PLC` and `PLC_Programming` are different
 * strings and Postgres has no idea one implies the other.
 */
export function extractSkillTagsWithCompetencies(message) {
  const found = extractSkillTags(message);
  const withParents = new Set(found);
  for (const tag of found) {
    const parent = competencyOf(tag);
    if (parent) withParents.add(parent);
  }
  return [...withParents];
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
