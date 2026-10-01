/**
 * Concept Semantic Validation Rules
 * Performs domain-specific heuristics beyond structural schema validation.
 * Detects unusable or nonsensical visualization structures while allowing
 * creative flexibility for future AI or algorithmic generators.
 */

/**
 * Validates semantic integrity of a concept based on its visualization type.
 * @param {Object} concept - The validated concept object
 * @returns {{ valid: boolean, errors: Array<{ path: string, message: string }> }}
 */
export const validateConceptSemantics = (concept) => {
  const errors = [];
  const nodes = concept.nodes || [];
  const connections = concept.connections || [];
  const type = concept.type;

  switch (type) {
    case "flowchart": {
      // A flowchart requires at least 2 nodes to depict a meaningful flow
      if (nodes.length < 2) {
        errors.push({
          path: "nodes",
          message: "A flowchart requires at least 2 nodes to depict a logical process or transition."
        });
      }
      break;
    }

    case "cycle": {
      // A circular closed loop mathematically requires at least 3 nodes
      if (nodes.length < 3) {
        errors.push({
          path: "nodes",
          message: "A cycle visualization requires at least 3 nodes to represent a recurring, closed-loop process."
        });
      }

      // A cycle must have connections to close or define the loop
      if (connections.length > 0 && connections.length < 2) {
        errors.push({
          path: "connections",
          message: "A cycle visualization requires at least 2 transitions to depict stage progression."
        });
      }
      break;
    }

    case "timeline": {
      // A timeline requires at least 2 historical or sequential events
      if (nodes.length < 2) {
        errors.push({
          path: "nodes",
          message: "A timeline requires at least 2 events to construct a chronological progression."
        });
      }

      // Check for chronological markers (date, era, or sequential order)
      const hasChronologicalMarker = nodes.some(
        (node) => (node.date && node.date.trim().length > 0) ||
                  (node.era && node.era.trim().length > 0) ||
                  typeof node.order === "number"
      );

      if (!hasChronologicalMarker) {
        errors.push({
          path: "nodes",
          message: "Timeline events must include chronological indicators (e.g. 'date', 'era', or 'order') on nodes."
        });
      }
      break;
    }

    case "hierarchy": {
      // A hierarchy requires at least 2 nodes (parent and child)
      if (nodes.length < 2) {
        errors.push({
          path: "nodes",
          message: "A hierarchy requires at least 2 nodes to establish a parent-child relationship."
        });
      }

      // Must establish parent-child links either through connections or node parentId attributes
      const hasConnectionHierarchy = connections.length > 0;
      const hasParentIdHierarchy = nodes.some((node) => node.parentId && node.parentId.trim().length > 0);
      const hasLevelHierarchy = nodes.some((node) => typeof node.level === "number" && node.level > 0);

      if (!hasConnectionHierarchy && !hasParentIdHierarchy && !hasLevelHierarchy) {
        errors.push({
          path: "connections",
          message: "A hierarchy requires parent-child links established via connections, 'parentId', or 'level' attributes."
        });
      }
      break;
    }

    case "sequence": {
      // A sequence diagram requires at least 2 participants / entities
      const participantCount = Array.isArray(concept.participants) && concept.participants.length > 0
        ? concept.participants.length
        : nodes.length;

      if (participantCount < 2) {
        errors.push({
          path: "participants",
          message: "A sequence visualization requires at least 2 participants/hosts to exchange messages."
        });
      }

      // A sequence diagram requires message exchanges
      if (connections.length < 1) {
        errors.push({
          path: "connections",
          message: "A sequence visualization requires at least one message exchange between participants in 'connections'."
        });
      }
      break;
    }

    default:
      break;
  }

  return {
    valid: errors.length === 0,
    errors
  };
};
