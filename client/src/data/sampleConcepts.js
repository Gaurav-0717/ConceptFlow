/**
 * ConceptFlow Visualization Engine — Sample Concepts Data
 * Conforms to the Visualization Data Contract:
 * - id: unique string identifier
 * - title: human-readable concept title
 * - type: 'flowchart' | 'cycle' | 'timeline' | 'hierarchy' | 'sequence'
 * - summary: concise conceptual summary
 * - nodes: array of node entities ({ id, label, description, ... })
 * - connections: array of relationships ({ from, to, label, ... })
 */

export const sampleConcepts = [
  {
    id: "photosynthesis",
    title: "Photosynthesis",
    type: "flowchart",
    subject: "Biology / Plant Physiology",
    difficulty: "Intermediate",
    summary: "How autotrophic plants convert light energy, water, and carbon dioxide into chemical energy (glucose) and release oxygen as a byproduct.",
    keyTakeaways: [
      "Light reactions capture photons and split water molecules in thylakoids.",
      "Calvin cycle fixes carbon dioxide into high-energy sugars in the stroma.",
      "Oxygen is released into the atmosphere as a vital life-sustaining byproduct."
    ],
    nodes: [
      {
        id: "sunlight",
        label: "Sunlight (Photons)",
        description: "Provides solar radiative energy captured by chlorophyll pigments in chloroplasts.",
        category: "Input"
      },
      {
        id: "water",
        label: "Water (H₂O)",
        description: "Absorbed by plant root systems from soil and transported via xylem to leaves.",
        category: "Input"
      },
      {
        id: "carbon-dioxide",
        label: "Carbon Dioxide (CO₂)",
        description: "Enters through microscopic leaf stomata from surrounding atmospheric air.",
        category: "Input"
      },
      {
        id: "light-reactions",
        label: "Light-Dependent Reactions",
        description: "Occur in thylakoid membranes; water is split (photolysis) to generate ATP & NADPH.",
        category: "Process"
      },
      {
        id: "calvin-cycle",
        label: "Calvin Cycle (Dark Reactions)",
        description: "Occurs in chloroplast stroma; utilizes ATP and NADPH to synthesize 3-carbon sugars.",
        category: "Process"
      },
      {
        id: "oxygen",
        label: "Oxygen (O₂)",
        description: "Byproduct of water photolysis, diffused out into the atmosphere.",
        category: "Output"
      },
      {
        id: "glucose",
        label: "Glucose + Chemical Energy",
        description: "Primary organic nutrient (C₆H₁₂O₆) stored for cellular respiration and plant growth.",
        category: "Output"
      }
    ],
    connections: [
      { from: "sunlight", to: "light-reactions", label: "Energizes Chlorophyll" },
      { from: "water", to: "light-reactions", label: "Photolysis" },
      { from: "light-reactions", to: "oxygen", label: "Releases Byproduct" },
      { from: "light-reactions", to: "calvin-cycle", label: "ATP & NADPH Transfer" },
      { from: "carbon-dioxide", to: "calvin-cycle", label: "Carbon Fixation" },
      { from: "calvin-cycle", to: "glucose", label: "Produces Sugars" }
    ]
  },
  {
    id: "water-cycle",
    title: "The Hydrologic Cycle",
    type: "cycle",
    subject: "Earth Science",
    difficulty: "Beginner",
    summary: "The continuous movement of water on, above, and below the surface of the Earth driven by solar energy and gravity.",
    keyTakeaways: [
      "Solar radiation drives evaporation from oceans and transpirational loss from plants.",
      "Atmospheric cooling condenses moisture into clouds.",
      "Precipitation replenishes freshwater reserves and terrestrial watersheds.",
      "The cycle is perpetual with no fixed starting or ending point."
    ],
    nodes: [
      {
        id: "evaporation",
        label: "Evaporation & Transpiration",
        description: "Solar heat transforms liquid surface water into airborne water vapor; plants transpire moisture.",
        order: 1,
        color: "#38bdf8"
      },
      {
        id: "condensation",
        label: "Condensation",
        description: "Rising water vapor cools at higher altitudes, condensing around aerosols to form clouds and fog.",
        order: 2,
        color: "#818cf8"
      },
      {
        id: "precipitation",
        label: "Precipitation",
        description: "Condensed droplets coalesce until too heavy for updrafts, falling as rain, snow, sleet, or hail.",
        order: 3,
        color: "#3b82f6"
      },
      {
        id: "collection",
        label: "Collection & Runoff",
        description: "Precipitation gathers in rivers, lakes, subterranean aquifers, and oceans before reheating.",
        order: 4,
        color: "#06b6d4"
      }
    ],
    connections: [
      { from: "evaporation", to: "condensation", label: "Vapor rises and cools" },
      { from: "condensation", to: "precipitation", label: "Droplets accumulate" },
      { from: "precipitation", to: "collection", label: "Watershed drainage" },
      { from: "collection", to: "evaporation", label: "Solar heating restarts loop" }
    ]
  },
  {
    id: "french-revolution",
    title: "The French Revolution",
    type: "timeline",
    subject: "World History",
    difficulty: "Intermediate",
    summary: "A watershed period of radical social and political upheaval in France that fundamentally transformed modern democracy and dismantled feudalism.",
    keyTakeaways: [
      "Economic crisis and feudal inequality triggered the revolt of the Third Estate in 1789.",
      "The 1791 Constitution established a constitutional monarchy before radicalization.",
      "The 1792 First French Republic deposed the monarchy and led to the Reign of Terror.",
      "The rise of Napoleon Bonaparte in 1799 marked the formal conclusion of revolutionary chaos."
    ],
    nodes: [
      {
        id: "estates-general",
        date: "1789",
        label: "Estates-General & Bastille",
        description: "Storming of the Bastille and the Tennis Court Oath mark the rebellion against Louis XVI's absolutist monarchy.",
        era: "Outbreak"
      },
      {
        id: "constitutional-monarchy",
        date: "1791",
        label: "Constitution of 1791",
        description: "The National Assembly establishes a short-lived constitutional monarchy, limiting royal prerogative.",
        era: "Reform"
      },
      {
        id: "first-republic",
        date: "1792",
        label: "Proclamation of First Republic",
        description: "The monarchy is abolished following war pressures; King Louis XVI is subsequently tried and executed.",
        era: "Radicalization"
      },
      {
        id: "napoleon-coup",
        date: "1799",
        label: "Coup of 18 Brumaire",
        description: "General Napoleon Bonaparte overthrows the Directory, instituting the French Consulate and ending the revolution.",
        era: "Consolidation"
      }
    ],
    connections: [
      { from: "estates-general", to: "constitutional-monarchy", label: "Institutional transition" },
      { from: "constitutional-monarchy", to: "first-republic", label: "Monarchy abolished" },
      { from: "first-republic", to: "napoleon-coup", label: "Directory stabilized by military" }
    ]
  },
  {
    id: "computer-hierarchy",
    title: "Computer Architecture",
    type: "hierarchy",
    subject: "Computer Science",
    difficulty: "Beginner",
    summary: "The layered organization of computer systems, demarcating physical hardware subsystems from abstract software layers.",
    keyTakeaways: [
      "Hardware comprises physical electronics, processors, and storage mediums.",
      "Software provides the logical instructions and virtualization for hardware operation.",
      "The operating system acts as the intermediary kernel orchestrating resources for user applications."
    ],
    nodes: [
      {
        id: "computer",
        label: "Computer System",
        description: "The unified programmable electronic system processing inputs to produce outputs.",
        level: 0
      },
      {
        id: "hardware",
        label: "Hardware",
        description: "Physical electronic circuits, chips, mechanical components, and peripherals.",
        parentId: "computer",
        level: 1
      },
      {
        id: "software",
        label: "Software",
        description: "Programs, routines, and symbolic instructions executed by the processor.",
        parentId: "computer",
        level: 1
      },
      {
        id: "cpu",
        label: "CPU (Central Processing Unit)",
        description: "The primary computational engine executing machine-code arithmetic and control logic.",
        parentId: "hardware",
        level: 2
      },
      {
        id: "memory",
        label: "Memory (RAM & Storage)",
        description: "Volatile fast memory for running processes and persistent secondary storage.",
        parentId: "hardware",
        level: 2
      },
      {
        id: "os",
        label: "Operating System",
        description: "Kernel software managing hardware access, scheduling, and file systems.",
        parentId: "software",
        level: 2
      },
      {
        id: "applications",
        label: "Applications",
        description: "End-user software including web browsers, developer tools, and productivity suites.",
        parentId: "software",
        level: 2
      }
    ],
    connections: [
      { from: "computer", to: "hardware", label: "contains" },
      { from: "computer", to: "software", label: "executes" },
      { from: "hardware", to: "cpu", label: "computation" },
      { from: "hardware", to: "memory", label: "retention" },
      { from: "software", to: "os", label: "system layer" },
      { from: "software", to: "applications", label: "user layer" }
    ]
  },
  {
    id: "osi-model",
    title: "OSI 7-Layer Model",
    type: "hierarchy",
    subject: "Networking",
    difficulty: "Advanced",
    summary: "The Open Systems Interconnection conceptual framework standardizing telecommunication and computing network protocols.",
    keyTakeaways: [
      "Upper layers handle application semantics and data presentation.",
      "Lower layers handle physical transmission, packets, and bit encoding.",
      "Each layer encapsulates data and provides services to the layer above."
    ],
    nodes: [
      {
        id: "osi-root",
        label: "OSI Reference Architecture",
        description: "Seven-layer standard model for network communications.",
        level: 0
      },
      {
        id: "upper-layers",
        label: "Host / Application Layers",
        description: "Layers responsible for user interaction, format translation, and sessions.",
        parentId: "osi-root",
        level: 1
      },
      {
        id: "lower-layers",
        label: "Media / Network Layers",
        description: "Layers managing physical transmission, routing, and reliable hops.",
        parentId: "osi-root",
        level: 1
      },
      {
        id: "l7-app",
        label: "Layer 7: Application",
        description: "Direct user interface protocols (HTTP, DNS, SSH, SMTP).",
        parentId: "upper-layers",
        level: 2
      },
      {
        id: "l6-pres",
        label: "Layer 6: Presentation",
        description: "Data formatting, encryption, and compression (TLS, JPEG, ASCII).",
        parentId: "upper-layers",
        level: 2
      },
      {
        id: "l4-trans",
        label: "Layer 4: Transport",
        description: "End-to-end segmentation and reliable flow control (TCP, UDP).",
        parentId: "lower-layers",
        level: 2
      },
      {
        id: "l3-net",
        label: "Layer 3: Network",
        description: "Logical packet routing across autonomous networks (IP, ICMP, BGP).",
        parentId: "lower-layers",
        level: 2
      }
    ],
    connections: [
      { from: "osi-root", to: "upper-layers", label: "Software domain" },
      { from: "osi-root", to: "lower-layers", label: "Transport domain" },
      { from: "upper-layers", to: "l7-app", label: "User interface" },
      { from: "upper-layers", to: "l6-pres", label: "Syntax translation" },
      { from: "lower-layers", to: "l4-trans", label: "Segment transport" },
      { from: "lower-layers", to: "l3-net", label: "Packet routing" }
    ]
  },
  {
    id: "tcp-handshake",
    title: "TCP Three-Way Handshake",
    type: "sequence",
    subject: "Computer Networks",
    difficulty: "Intermediate",
    summary: "The foundational synchronization procedure establishing a reliable full-duplex TCP/IP connection between a client and a server before data transfer begins.",
    keyTakeaways: [
      "SYN: Client sends synchronization packet with initial sequence number (ISN).",
      "SYN-ACK: Server acknowledges client ISN and sends its own synchronization request.",
      "ACK: Client acknowledges server response; connection is now established."
    ],
    participants: [
      { id: "client", label: "Client Host", role: "Active Opener" },
      { id: "server", label: "Server Host", role: "Passive Listener" }
    ],
    nodes: [
      { id: "client", label: "Client Host", description: "Originator requesting connection" },
      { id: "server", label: "Server Host", description: "Remote daemon listening on designated port" }
    ],
    connections: [
      {
        step: 1,
        from: "client",
        to: "server",
        label: "SYN (Synchronize)",
        description: "Client sends SYN packet with an initial sequence number (Seq = x) to establish synchronized communication.",
        status: "SYN_SENT"
      },
      {
        step: 2,
        from: "server",
        to: "client",
        label: "SYN + ACK",
        description: "Server acknowledges receipt (Ack = x + 1) and transmits its own initial sequence number (Seq = y).",
        status: "SYN_RCVD"
      },
      {
        step: 3,
        from: "client",
        to: "server",
        label: "ACK (Acknowledge)",
        description: "Client responds with an acknowledgment (Ack = y + 1). Handshake complete; full-duplex socket established.",
        status: "ESTABLISHED"
      }
    ]
  }
];

// Helper to look up a sample concept by ID
export const getSampleConceptById = (id) => {
  return sampleConcepts.find((c) => c.id === id) || null;
};
