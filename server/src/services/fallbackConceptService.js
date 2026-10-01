import { createHash } from "node:crypto";
import { prepareConcept } from "./conceptService.js";
import { normalizeInput } from "./conceptCacheService.js";

const templates = [
  {
    matches: /photosynthesis/,
    concept: {
      id: "fallback-photosynthesis",
      title: "Photosynthesis",
      type: "flowchart",
      summary:
        "Plants use light energy to convert water and carbon dioxide into glucose and oxygen.",
      nodes: [
        {
          id: "light",
          label: "Light energy",
          description: "Chlorophyll captures energy from sunlight.",
          category: "Input",
        },
        {
          id: "water",
          label: "Water",
          description: "Roots absorb water and deliver it to leaves.",
          category: "Input",
        },
        {
          id: "carbon-dioxide",
          label: "Carbon dioxide",
          description: "Leaves take in carbon dioxide through stomata.",
          category: "Input",
        },
        {
          id: "glucose",
          label: "Glucose",
          description: "Stored chemical energy made by the plant.",
          category: "Product",
        },
        {
          id: "oxygen",
          label: "Oxygen",
          description: "Released into the surrounding air.",
          category: "Product",
        },
      ],
      connections: [
        { from: "light", to: "glucose", label: "provides energy" },
        { from: "water", to: "glucose", label: "supplies hydrogen" },
        { from: "carbon-dioxide", to: "glucose", label: "supplies carbon" },
        { from: "water", to: "oxygen", label: "oxygen atoms are released" },
      ],
    },
  },
  {
    matches: /water cycle|hydrologic cycle/,
    concept: {
      id: "fallback-water-cycle",
      title: "The Water Cycle",
      type: "cycle",
      summary:
        "Water continuously moves between Earth's surface, atmosphere, and living systems.",
      nodes: [
        {
          id: "collection",
          label: "Collection",
          description: "Water gathers in oceans, lakes, rivers, and soil.",
          order: 1,
        },
        {
          id: "evaporation",
          label: "Evaporation",
          description: "Sunlight changes surface water into vapor.",
          order: 2,
        },
        {
          id: "condensation",
          label: "Condensation",
          description: "Cooling vapor forms clouds.",
          order: 3,
        },
        {
          id: "precipitation",
          label: "Precipitation",
          description: "Water returns to the surface as rain, snow, or hail.",
          order: 4,
        },
      ],
      connections: [
        { from: "collection", to: "evaporation", label: "water is heated" },
        { from: "evaporation", to: "condensation", label: "vapor cools" },
        {
          from: "condensation",
          to: "precipitation",
          label: "clouds release water",
        },
        { from: "precipitation", to: "collection", label: "water flows back" },
      ],
    },
  },
  {
    matches: /tcp.*handshake|three[- ]way handshake/,
    concept: {
      id: "fallback-tcp-handshake",
      title: "TCP Three-Way Handshake",
      type: "sequence",
      summary:
        "A client and server synchronize sequence numbers before exchanging TCP data.",
      participants: [
        { id: "client", label: "Client", role: "Initiates connection" },
        { id: "server", label: "Server", role: "Accepts connection" },
      ],
      nodes: [
        {
          id: "client",
          label: "Client",
          description: "Requests a reliable connection.",
        },
        {
          id: "server",
          label: "Server",
          description: "Listens and responds to connection requests.",
        },
      ],
      connections: [
        {
          step: 1,
          from: "client",
          to: "server",
          label: "SYN: request connection",
        },
        {
          step: 2,
          from: "server",
          to: "client",
          label: "SYN-ACK: acknowledge and synchronize",
        },
        {
          step: 3,
          from: "client",
          to: "server",
          label: "ACK: confirm connection",
        },
      ],
    },
  },
  {
    matches: /osi(?:\s+7)?(?:[- ]layer)? model|7[- ]layer osi/,
    concept: {
      id: "fallback-osi-model",
      title: "OSI Seven-Layer Model",
      type: "hierarchy",
      summary:
        "The OSI model organizes network communication into seven cooperating layers.",
      nodes: [
        { id: "osi", label: "OSI Model", level: 0 },
        { id: "application", label: "Application", parentId: "osi", level: 1 },
        {
          id: "presentation",
          label: "Presentation",
          parentId: "osi",
          level: 1,
        },
        { id: "session", label: "Session", parentId: "osi", level: 1 },
        { id: "transport", label: "Transport", parentId: "osi", level: 1 },
        { id: "network", label: "Network", parentId: "osi", level: 1 },
        { id: "data-link", label: "Data Link", parentId: "osi", level: 1 },
        { id: "physical", label: "Physical", parentId: "osi", level: 1 },
      ],
      connections: [
        { from: "osi", to: "application", label: "Layer 7" },
        { from: "osi", to: "presentation", label: "Layer 6" },
        { from: "osi", to: "session", label: "Layer 5" },
        { from: "osi", to: "transport", label: "Layer 4" },
        { from: "osi", to: "network", label: "Layer 3" },
        { from: "osi", to: "data-link", label: "Layer 2" },
        { from: "osi", to: "physical", label: "Layer 1" },
      ],
    },
  },
  {
    matches: /french revolution/,
    concept: {
      id: "fallback-french-revolution",
      title: "The French Revolution",
      type: "timeline",
      summary:
        "A sequence of political upheavals transformed France between 1789 and 1799.",
      nodes: [
        {
          id: "estates-general",
          label: "Estates-General convenes",
          date: "1789",
          order: 1,
        },
        {
          id: "bastille",
          label: "Storming of the Bastille",
          date: "1789",
          order: 2,
        },
        {
          id: "republic",
          label: "French Republic declared",
          date: "1792",
          order: 3,
        },
        { id: "coup", label: "Napoleon's coup", date: "1799", order: 4 },
      ],
      connections: [
        {
          from: "estates-general",
          to: "bastille",
          label: "popular unrest grows",
        },
        { from: "bastille", to: "republic", label: "monarchy is challenged" },
        {
          from: "republic",
          to: "coup",
          label: "political instability continues",
        },
      ],
    },
  },
];

const createGenericConcept = (input) => {
  const topic = input.trim().slice(0, 120) || "Your concept";
  const id = createHash("sha256")
    .update(normalizeInput(topic))
    .digest("hex")
    .slice(0, 12);
  return {
    id: `learning-${id}`,
    title: topic,
    type: "flowchart",
    summary: `A simple study framework for ${topic}: identify the core idea, connect supporting details, and review the outcome.`,
    nodes: [
      {
        id: "core-idea",
        label: "Core idea",
        description: `Identify the central principle in ${topic}.`,
        order: 1,
      },
      {
        id: "supporting-details",
        label: "Supporting details",
        description:
          "Connect the important parts, evidence, or steps to the core idea.",
        order: 2,
      },
      {
        id: "review",
        label: "Review and apply",
        description:
          "Summarize what the parts explain and use it in a new example.",
        order: 3,
      },
    ],
    connections: [
      { from: "core-idea", to: "supporting-details", label: "is explained by" },
      {
        from: "supporting-details",
        to: "review",
        label: "supports understanding",
      },
    ],
  };
};

export const generateFallbackConcept = ({ input, subject, difficulty }) => {
  const normalizedInput = normalizeInput(input);
  const template = templates.find(({ matches }) =>
    matches.test(normalizedInput),
  );
  const concept = template
    ? structuredClone(template.concept)
    : createGenericConcept(input);

  if (subject) concept.subject = subject;
  if (difficulty) concept.difficulty = difficulty;

  const result = prepareConcept(concept);
  if (!result.valid)
    throw new Error("Fallback template failed ConceptFlow validation.");
  return result.concept;
};

export default { generateFallbackConcept };
