/**
 * GENERATED FILE — DO NOT EDIT.
 * Run `npm run sync:tags` to regenerate from api/lib/skill-taxonomy.js.
 *
 * 16 rated competencies, 39 canonical tags in total.
 * These must match skill_passports.skills_array and projects.required_skills
 * exactly, or the Postgres array-overlap match silently returns nothing.
 */
window.ROBOCADER_COMPETENCIES = [
  {
    "tag": "PLC_Programming",
    "label": "PLC Programming & Troubleshooting",
    "description": "Write, modify and fault-find ladder or structured text on plant PLCs, and get a stopped line running again.",
    "order": 1,
    "category": "automation",
    "categoryLabel": "Automation & Controls",
    "details": [
      {
        "tag": "Siemens_PLC",
        "label": "Siemens"
      },
      {
        "tag": "Allen_Bradley_PLC",
        "label": "Allen-Bradley / Rockwell"
      },
      {
        "tag": "ABB_PLC",
        "label": "ABB"
      },
      {
        "tag": "Mitsubishi_PLC",
        "label": "Mitsubishi"
      },
      {
        "tag": "Delta_PLC",
        "label": "Delta"
      },
      {
        "tag": "Beckhoff_PLC",
        "label": "Beckhoff"
      },
      {
        "tag": "Omron_PLC",
        "label": "Omron"
      },
      {
        "tag": "Schneider_PLC",
        "label": "Schneider"
      }
    ]
  },
  {
    "tag": "Panel_Wiring",
    "label": "Panel Wiring & Electrical Assembly",
    "description": "Build and wire control panels from schematics — MCC, PCC and control — and redline the as-built changes.",
    "order": 2,
    "category": "electrical",
    "categoryLabel": "Electrical",
    "details": []
  },
  {
    "tag": "Robotics",
    "label": "Industrial Robotics Programming",
    "description": "Teach, program and recover industrial robots and the cells they work in.",
    "order": 3,
    "category": "robotics",
    "categoryLabel": "Robotics",
    "details": [
      {
        "tag": "Robot_Integration",
        "label": "Robot cell integration"
      }
    ]
  },
  {
    "tag": "SMT_Operations",
    "label": "SMT Machine Operation & Maintenance",
    "description": "Set up, run and change over surface-mount lines — printer, pick and place, reflow, AOI.",
    "order": 4,
    "category": "electronics",
    "categoryLabel": "Electronics",
    "details": []
  },
  {
    "tag": "Vision_Systems",
    "label": "Vision System Integration",
    "description": "Set up cameras and code readers for inspection, traceability and barcode verification.",
    "order": 5,
    "category": "automation",
    "categoryLabel": "Automation & Controls",
    "details": []
  },
  {
    "tag": "Mechanical_Assembly",
    "label": "Mechanical Assembly & Integration",
    "description": "Assemble, align and integrate machines and lines, from sub-assembly to running equipment.",
    "order": 6,
    "category": "mechanical",
    "categoryLabel": "Mechanical",
    "details": [
      {
        "tag": "Fitting",
        "label": "Fitting"
      },
      {
        "tag": "Welding",
        "label": "Welding & fabrication"
      },
      {
        "tag": "Hydraulics",
        "label": "Hydraulics"
      },
      {
        "tag": "Pneumatics",
        "label": "Pneumatics"
      }
    ]
  },
  {
    "tag": "Software_Development",
    "label": "Software Development (C#/C++/Python)",
    "description": "Write the software around the machine — HMIs, data logging, and the links into plant systems.",
    "order": 7,
    "category": "software",
    "categoryLabel": "Software",
    "details": []
  },
  {
    "tag": "SCADA_HMI",
    "label": "SCADA & HMI Configuration",
    "description": "Build and maintain the screens operators use, and the supervisory layer behind them.",
    "order": 8,
    "category": "automation",
    "categoryLabel": "Automation & Controls",
    "details": [
      {
        "tag": "SCADA",
        "label": "SCADA"
      },
      {
        "tag": "HMI_Configuration",
        "label": "HMI configuration"
      },
      {
        "tag": "DCS",
        "label": "DCS"
      }
    ]
  },
  {
    "tag": "VFD_Motion_Control",
    "label": "VFD & Motion Control Tuning",
    "description": "Commission and tune drives and servos, including multi-axis and cam profile work.",
    "order": 9,
    "category": "electrical",
    "categoryLabel": "Electrical",
    "details": [
      {
        "tag": "VFD_Drives",
        "label": "VFD drives"
      },
      {
        "tag": "Servo_Drives",
        "label": "Servo drives"
      }
    ]
  },
  {
    "tag": "Instrumentation",
    "label": "Instrumentation & Sensor Calibration",
    "description": "Calibrate field instruments, check loops end to end, and produce the certificates.",
    "order": 10,
    "category": "instrumentation",
    "categoryLabel": "Instrumentation",
    "details": []
  },
  {
    "tag": "Commissioning",
    "label": "Commissioning & On-Site Startup",
    "description": "Take equipment from installed to running and handed over, including FAT and SAT.",
    "order": 11,
    "category": "project",
    "categoryLabel": "Project & Site",
    "details": []
  },
  {
    "tag": "Maintenance",
    "label": "Preventive & Predictive Maintenance",
    "description": "Keep plant running — scheduled maintenance, breakdown response and condition monitoring.",
    "order": 12,
    "category": "maintenance",
    "categoryLabel": "Maintenance",
    "details": [
      {
        "tag": "Electrical_Maintenance",
        "label": "Electrical maintenance"
      },
      {
        "tag": "Mechanical_Maintenance",
        "label": "Mechanical maintenance"
      }
    ]
  },
  {
    "tag": "Safety_Systems",
    "label": "Safety System Implementation",
    "description": "Install and validate safety circuits — light curtains, relays, safety PLCs — to standard.",
    "order": 13,
    "category": "safety",
    "categoryLabel": "Safety",
    "details": []
  },
  {
    "tag": "MES_IIoT",
    "label": "MES & IIoT Integration",
    "description": "Connect plant equipment to business systems using OPC UA, MQTT and industrial protocols.",
    "order": 14,
    "category": "digital",
    "categoryLabel": "Digital & Data",
    "details": []
  },
  {
    "tag": "Project_Supervision",
    "label": "Project Management & Team Lead",
    "description": "Run the job and the team on site, and deal with the customer directly.",
    "order": 15,
    "category": "project",
    "categoryLabel": "Project & Site",
    "details": []
  },
  {
    "tag": "Documentation_Training",
    "label": "Technical Documentation & Training",
    "description": "Produce manuals, SOPs and as-built drawings, and train the people who will run it.",
    "order": 16,
    "category": "project",
    "categoryLabel": "Project & Site",
    "details": []
  }
];

window.ROBOCADER_UNPARENTED_SKILLS = [
  {
    "tag": "CAD_Design",
    "label": "CAD design & drafting",
    "category": "design",
    "categoryLabel": "Design & Drafting"
  },
  {
    "tag": "CNC_Programming",
    "label": "CNC programming",
    "category": "mechanical",
    "categoryLabel": "Mechanical"
  },
  {
    "tag": "Quality_Inspection",
    "label": "Quality inspection",
    "category": "quality",
    "categoryLabel": "Quality"
  }
];

window.ROBOCADER_SKILL_TAGS = [
  {
    "tag": "PLC_Programming",
    "label": "PLC Programming & Troubleshooting",
    "kind": "competency",
    "competency": null
  },
  {
    "tag": "Siemens_PLC",
    "label": "Siemens",
    "kind": "detail",
    "competency": "PLC_Programming"
  },
  {
    "tag": "Allen_Bradley_PLC",
    "label": "Allen-Bradley / Rockwell",
    "kind": "detail",
    "competency": "PLC_Programming"
  },
  {
    "tag": "ABB_PLC",
    "label": "ABB",
    "kind": "detail",
    "competency": "PLC_Programming"
  },
  {
    "tag": "Mitsubishi_PLC",
    "label": "Mitsubishi",
    "kind": "detail",
    "competency": "PLC_Programming"
  },
  {
    "tag": "Delta_PLC",
    "label": "Delta",
    "kind": "detail",
    "competency": "PLC_Programming"
  },
  {
    "tag": "Beckhoff_PLC",
    "label": "Beckhoff",
    "kind": "detail",
    "competency": "PLC_Programming"
  },
  {
    "tag": "Omron_PLC",
    "label": "Omron",
    "kind": "detail",
    "competency": "PLC_Programming"
  },
  {
    "tag": "Schneider_PLC",
    "label": "Schneider",
    "kind": "detail",
    "competency": "PLC_Programming"
  },
  {
    "tag": "Panel_Wiring",
    "label": "Panel Wiring & Electrical Assembly",
    "kind": "competency",
    "competency": null
  },
  {
    "tag": "Robotics",
    "label": "Industrial Robotics Programming",
    "kind": "competency",
    "competency": null
  },
  {
    "tag": "Robot_Integration",
    "label": "Robot cell integration",
    "kind": "detail",
    "competency": "Robotics"
  },
  {
    "tag": "SMT_Operations",
    "label": "SMT Machine Operation & Maintenance",
    "kind": "competency",
    "competency": null
  },
  {
    "tag": "Vision_Systems",
    "label": "Vision System Integration",
    "kind": "competency",
    "competency": null
  },
  {
    "tag": "Mechanical_Assembly",
    "label": "Mechanical Assembly & Integration",
    "kind": "competency",
    "competency": null
  },
  {
    "tag": "Fitting",
    "label": "Fitting",
    "kind": "detail",
    "competency": "Mechanical_Assembly"
  },
  {
    "tag": "Welding",
    "label": "Welding & fabrication",
    "kind": "detail",
    "competency": "Mechanical_Assembly"
  },
  {
    "tag": "Hydraulics",
    "label": "Hydraulics",
    "kind": "detail",
    "competency": "Mechanical_Assembly"
  },
  {
    "tag": "Pneumatics",
    "label": "Pneumatics",
    "kind": "detail",
    "competency": "Mechanical_Assembly"
  },
  {
    "tag": "Software_Development",
    "label": "Software Development (C#/C++/Python)",
    "kind": "competency",
    "competency": null
  },
  {
    "tag": "SCADA_HMI",
    "label": "SCADA & HMI Configuration",
    "kind": "competency",
    "competency": null
  },
  {
    "tag": "SCADA",
    "label": "SCADA",
    "kind": "detail",
    "competency": "SCADA_HMI"
  },
  {
    "tag": "HMI_Configuration",
    "label": "HMI configuration",
    "kind": "detail",
    "competency": "SCADA_HMI"
  },
  {
    "tag": "DCS",
    "label": "DCS",
    "kind": "detail",
    "competency": "SCADA_HMI"
  },
  {
    "tag": "VFD_Motion_Control",
    "label": "VFD & Motion Control Tuning",
    "kind": "competency",
    "competency": null
  },
  {
    "tag": "VFD_Drives",
    "label": "VFD drives",
    "kind": "detail",
    "competency": "VFD_Motion_Control"
  },
  {
    "tag": "Servo_Drives",
    "label": "Servo drives",
    "kind": "detail",
    "competency": "VFD_Motion_Control"
  },
  {
    "tag": "Instrumentation",
    "label": "Instrumentation & Sensor Calibration",
    "kind": "competency",
    "competency": null
  },
  {
    "tag": "Commissioning",
    "label": "Commissioning & On-Site Startup",
    "kind": "competency",
    "competency": null
  },
  {
    "tag": "Maintenance",
    "label": "Preventive & Predictive Maintenance",
    "kind": "competency",
    "competency": null
  },
  {
    "tag": "Electrical_Maintenance",
    "label": "Electrical maintenance",
    "kind": "detail",
    "competency": "Maintenance"
  },
  {
    "tag": "Mechanical_Maintenance",
    "label": "Mechanical maintenance",
    "kind": "detail",
    "competency": "Maintenance"
  },
  {
    "tag": "Safety_Systems",
    "label": "Safety System Implementation",
    "kind": "competency",
    "competency": null
  },
  {
    "tag": "MES_IIoT",
    "label": "MES & IIoT Integration",
    "kind": "competency",
    "competency": null
  },
  {
    "tag": "Project_Supervision",
    "label": "Project Management & Team Lead",
    "kind": "competency",
    "competency": null
  },
  {
    "tag": "Documentation_Training",
    "label": "Technical Documentation & Training",
    "kind": "competency",
    "competency": null
  },
  {
    "tag": "CAD_Design",
    "label": "CAD design & drafting",
    "kind": "detail",
    "competency": null
  },
  {
    "tag": "CNC_Programming",
    "label": "CNC programming",
    "kind": "detail",
    "competency": null
  },
  {
    "tag": "Quality_Inspection",
    "label": "Quality inspection",
    "kind": "detail",
    "competency": null
  }
];
