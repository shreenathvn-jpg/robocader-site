/**
 * RoboCADer Pro — targeted passport questions
 * InChi Solutions
 *
 * WHY A CURATED BANK AND NOT A MODEL, TODAY
 *   A model would need the Gemini key, the key has to stay server-side, and
 *   that means a deployed function. Nothing is deployed and there is no Node on
 *   the build machine, so an LLM-written question cannot be produced or tested
 *   right now.
 *
 *   It is also not obviously worse. These questions are the ones a plant head
 *   actually asks on a screening call, and a fixed bank cannot invent a
 *   question about equipment that does not exist. When the function does ship,
 *   it can replace `questionsFor()` and nothing else — answers are stored
 *   against a stable KEY, never against the wording.
 *
 * WRITING RULES, learned from the ones that got cut:
 *   - Answerable in one line by someone typing on a phone at a bus stop.
 *   - About what they have DONE, never what they know. "Which drives have you
 *     commissioned" beats "describe your understanding of vector control".
 *   - No question whose honest answer is embarrassing. A passport is not an
 *     exam, and a person who feels caught out closes the tab.
 *   - Named equipment in the placeholder, because a blank box gets a blank
 *     answer and an example tells them the level of detail wanted.
 */

/** Asked of everyone, whatever they declared. */
const GENERAL = [
  {
    key: "general.recent_job",
    prompt: "What was the last job you finished, in one line?",
    placeholder: "e.g. Retrofitted 3 injection moulding cells at a Tier-1 plant in Hosur",
    hint: "Plants read this first.",
  },
  {
    key: "general.shutdown",
    prompt: "Can you travel for a shutdown at short notice?",
    placeholder: "e.g. Yes, anywhere in South India with 2 days notice",
  },
  {
    key: "general.languages",
    prompt: "Which languages do you work in on site?",
    placeholder: "e.g. Kannada, Hindi, English",
  },
];

/** Keyed by competency tag. Only the technician's declared skills are asked. */
const BY_SKILL = {
  PLC_Programming: [
    { key: "plc.platforms", prompt: "Which PLC platforms have you programmed from scratch, not just edited?",
      placeholder: "e.g. Siemens S7-1200 and 1500, Allen-Bradley CompactLogix" },
    { key: "plc.biggest", prompt: "What is the largest I/O count you have commissioned on your own?",
      placeholder: "e.g. around 400 I/O across 3 racks" },
  ],
  Panel_Wiring: [
    { key: "panel.types", prompt: "Which panels have you built or wired?",
      placeholder: "e.g. MCC and PCC panels up to 630A, plus control panels" },
    { key: "panel.standards", prompt: "Do you wire to a drawing, and can you mark up as-built changes?",
      placeholder: "e.g. Yes, I work from schematics and redline as-built" },
  ],
  Robotics: [
    { key: "robot.brands", prompt: "Which robot brands have you taught or programmed?",
      placeholder: "e.g. Fanuc and ABB, mostly pick and place and welding cells" },
    { key: "robot.apps", prompt: "What kind of cells have you worked on?",
      placeholder: "e.g. Spot welding, palletising, machine tending" },
  ],
  SMT_Operations: [
    { key: "smt.machines", prompt: "Which SMT machines can you set up and run?",
      placeholder: "e.g. Juki pick and place, Heller reflow, DEK printer" },
    { key: "smt.changeover", prompt: "Can you do a full line changeover on your own?",
      placeholder: "e.g. Yes, feeder setup to first-off inspection" },
  ],
  Vision_Systems: [
    { key: "vision.systems", prompt: "Which vision systems have you set up?",
      placeholder: "e.g. Cognex In-Sight, Keyence barcode readers" },
    { key: "vision.tasks", prompt: "What have you used vision for?",
      placeholder: "e.g. Barcode traceability, presence check, OCR on date codes" },
  ],
  Mechanical_Assembly: [
    { key: "mech.work", prompt: "What kind of machines have you assembled or aligned?",
      placeholder: "e.g. Conveyor lines, hydraulic presses, packing machines" },
    { key: "mech.tools", prompt: "Which alignment or measurement tools do you use?",
      placeholder: "e.g. Dial gauge, laser alignment, torque wrench to spec" },
  ],
  Software_Development: [
    { key: "sw.languages", prompt: "Which languages do you actually ship in?",
      placeholder: "e.g. C# for machine HMIs, Python for data logging" },
    { key: "sw.industrial", prompt: "Have you written software that talks to plant equipment?",
      placeholder: "e.g. Yes, OPC UA to Siemens PLCs, logging to SQL Server" },
  ],
  SCADA_HMI: [
    { key: "scada.tools", prompt: "Which SCADA or HMI packages have you built screens in?",
      placeholder: "e.g. WinCC, FactoryTalk View, Weintek" },
    { key: "scada.scope", prompt: "Have you built a system from a blank project, or maintained existing ones?",
      placeholder: "e.g. Built 2 from scratch, maintain several others" },
  ],
  VFD_Motion_Control: [
    { key: "vfd.brands", prompt: "Which drives have you commissioned and tuned?",
      placeholder: "e.g. Danfoss, Siemens Sinamics, Delta servo" },
    { key: "vfd.motion", prompt: "Have you done multi-axis or cam profile work?",
      placeholder: "e.g. Yes, 3-axis gantry with electronic gearing" },
  ],
  Instrumentation: [
    { key: "inst.types", prompt: "Which instruments do you calibrate?",
      placeholder: "e.g. Pressure transmitters, RTDs, flow meters, load cells" },
    { key: "inst.loop", prompt: "Can you do loop checking and produce the documentation?",
      placeholder: "e.g. Yes, loop folders and calibration certificates" },
  ],
  Commissioning: [
    { key: "comm.scope", prompt: "What have you commissioned end to end?",
      placeholder: "e.g. 2 packaging lines, from erection to handover" },
    { key: "comm.docs", prompt: "Have you run FAT or SAT with a customer present?",
      placeholder: "e.g. Yes, SAT for a Tier-1 automotive customer" },
  ],
  Maintenance: [
    { key: "maint.type", prompt: "Preventive schedules, breakdown response, or both?",
      placeholder: "e.g. Both — PM schedules plus breakdown call-outs" },
    { key: "maint.predictive", prompt: "Do you use any condition monitoring?",
      placeholder: "e.g. Vibration analysis and thermal imaging" },
  ],
  Safety_Systems: [
    { key: "safety.work", prompt: "What safety systems have you installed or validated?",
      placeholder: "e.g. Light curtains, safety relays, Pilz safety PLC" },
    { key: "safety.standards", prompt: "Have you worked to a safety standard or done a risk assessment?",
      placeholder: "e.g. Yes, ISO 13849 PLd on a robot cell" },
  ],
  MES_IIoT: [
    { key: "mes.protocols", prompt: "Which industrial protocols have you integrated?",
      placeholder: "e.g. OPC UA, MQTT, Modbus TCP, Profinet" },
    { key: "mes.systems", prompt: "Have you connected plant equipment to a business system?",
      placeholder: "e.g. Line data to SAP, OEE dashboards" },
  ],
  Project_Supervision: [
    { key: "pm.team", prompt: "How many people have you led on site, and for how long?",
      placeholder: "e.g. 6 technicians over a 3-week shutdown" },
    { key: "pm.client", prompt: "Do you handle the customer directly during a job?",
      placeholder: "e.g. Yes, daily progress meetings with the plant head" },
  ],
  Documentation_Training: [
    { key: "doc.produced", prompt: "What documentation have you produced?",
      placeholder: "e.g. O&M manuals, SOPs, as-built drawings" },
    { key: "doc.training", prompt: "Have you trained plant operators or maintenance staff?",
      placeholder: "e.g. Yes, 2-day operator training at handover" },
  ],
};

/**
 * Questions for a technician, given the competency tags they declared.
 * General questions come last: skill questions are the ones they came to
 * answer, and putting "which languages do you speak" first makes it feel like
 * a form rather than a conversation about their trade.
 */
export function questionsFor(skillTags = []) {
  const skillQuestions = skillTags.flatMap((tag) =>
    (BY_SKILL[tag] ?? []).map((q) => ({ ...q, skillTag: tag })));
  return [...skillQuestions, ...GENERAL.map((q) => ({ ...q, skillTag: null }))];
}

export const QUESTION_COUNT = Object.values(BY_SKILL).flat().length + GENERAL.length;
