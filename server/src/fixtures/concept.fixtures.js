/**
 * Server-side test fixtures for concept validation.
 * These are the canonical ground-truth samples used only by backend tests.
 * NOT duplicated from frontend sampleConcepts.js.
 */

export const FIXTURE_FLOWCHART = {
  id: "photosynthesis",
  title: "Photosynthesis",
  type: "flowchart",
  summary: "How plants convert light energy into chemical energy using sunlight, water, and CO2.",
  nodes: [
    { id: "sunlight", label: "Sunlight", description: "Solar energy source.", category: "Input" },
    { id: "water", label: "Water (H2O)", description: "Absorbed by roots.", category: "Input" },
    { id: "co2", label: "Carbon Dioxide", description: "Enters via stomata.", category: "Input" },
    { id: "glucose", label: "Glucose + O2", description: "Products of the Calvin cycle.", category: "Output" }
  ],
  connections: [
    { from: "sunlight", to: "glucose", label: "Energizes" },
    { from: "water", to: "glucose", label: "Provides H" },
    { from: "co2", to: "glucose", label: "Carbon fixation" }
  ]
};

export const FIXTURE_CYCLE = {
  id: "water-cycle",
  title: "The Water Cycle",
  type: "cycle",
  summary: "Continuous movement of water through the hydrosphere.",
  nodes: [
    { id: "evaporation", label: "Evaporation", order: 1 },
    { id: "condensation", label: "Condensation", order: 2 },
    { id: "precipitation", label: "Precipitation", order: 3 }
  ],
  connections: [
    { from: "evaporation", to: "condensation", label: "Vapor rises" },
    { from: "condensation", to: "precipitation", label: "Droplets fall" },
    { from: "precipitation", to: "evaporation", label: "Collects and evaporates" }
  ]
};

export const FIXTURE_TIMELINE = {
  id: "french-revolution",
  title: "The French Revolution",
  type: "timeline",
  summary: "Key milestones of the French Revolution from 1789 to 1799.",
  nodes: [
    { id: "bastille", label: "Storming of the Bastille", date: "1789", era: "Outbreak" },
    { id: "constitution", label: "Constitution of 1791", date: "1791", era: "Reform" },
    { id: "republic", label: "First French Republic", date: "1792", era: "Radicalization" },
    { id: "napoleon", label: "Napoleon's Coup", date: "1799", era: "Consolidation" }
  ],
  connections: [
    { from: "bastille", to: "constitution", label: "Transition" },
    { from: "constitution", to: "republic", label: "Monarchy abolished" },
    { from: "republic", to: "napoleon", label: "Military rise" }
  ]
};

export const FIXTURE_HIERARCHY = {
  id: "computer-system",
  title: "Computer Architecture",
  type: "hierarchy",
  summary: "Layered organization of hardware and software in a computer system.",
  nodes: [
    { id: "computer", label: "Computer System", level: 0 },
    { id: "hardware", label: "Hardware", parentId: "computer", level: 1 },
    { id: "software", label: "Software", parentId: "computer", level: 1 },
    { id: "cpu", label: "CPU", parentId: "hardware", level: 2 },
    { id: "ram", label: "RAM", parentId: "hardware", level: 2 }
  ],
  connections: [
    { from: "computer", to: "hardware", label: "contains" },
    { from: "computer", to: "software", label: "executes" },
    { from: "hardware", to: "cpu", label: "computation" },
    { from: "hardware", to: "ram", label: "memory" }
  ]
};

export const FIXTURE_SEQUENCE = {
  id: "tcp-handshake",
  title: "TCP Three-Way Handshake",
  type: "sequence",
  summary: "Connection establishment protocol between a TCP client and server.",
  participants: [
    { id: "client", label: "Client Host", role: "Active Opener" },
    { id: "server", label: "Server Host", role: "Passive Listener" }
  ],
  nodes: [
    { id: "client", label: "Client Host", description: "Initiates connection" },
    { id: "server", label: "Server Host", description: "Listens for connection" }
  ],
  connections: [
    { step: 1, from: "client", to: "server", label: "SYN", status: "SYN_SENT" },
    { step: 2, from: "server", to: "client", label: "SYN + ACK", status: "SYN_RCVD" },
    { step: 3, from: "client", to: "server", label: "ACK", status: "ESTABLISHED" }
  ]
};
