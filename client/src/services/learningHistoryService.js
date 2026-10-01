const STORAGE_KEY = "conceptflow.learning-history.v1";
const MIGRATION_OWNER_KEY = "conceptflow.learning-history-migration-owner.v1";
const MAX_HISTORY_ITEMS = 50;

const getDefaultStorage = () => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

const safeHistory = (rawValue) => {
  try {
    const parsed = JSON.parse(rawValue || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.type === "string" &&
        item.concept &&
        typeof item.concept === "object" &&
        typeof item.lastAccessedAt === "string",
    );
  } catch {
    return [];
  }
};

export const createLearningHistoryService = ({
  storage: suppliedStorage,
  now = () => new Date(),
} = {}) => {
  const storage =
    suppliedStorage === undefined ? getDefaultStorage() : suppliedStorage;
  const getLearningHistory = () => {
    if (!storage) return [];
    try {
      return safeHistory(storage.getItem(STORAGE_KEY)).sort(
        (left, right) =>
          Date.parse(right.lastAccessedAt) - Date.parse(left.lastAccessedAt),
      );
    } catch {
      return [];
    }
  };

  const saveLearningHistory = (history) => {
    if (!storage) return;
    try {
      storage.setItem(
        STORAGE_KEY,
        JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS)),
      );
    } catch {
      // Private browsing and quota limits should not block learning.
    }
  };

  const recordConceptAccess = ({
    concept,
    level = "Intermediate",
    source = "sample",
  }) => {
    if (
      !storage ||
      !concept ||
      typeof concept.id !== "string" ||
      typeof concept.title !== "string"
    ) {
      return getLearningHistory();
    }

    const timestamp = now().toISOString();
    const history = getLearningHistory();
    const existing = history.find((entry) => entry.id === concept.id);
    const record = {
      id: concept.id,
      title: concept.title.slice(0, 160),
      type: typeof concept.type === "string" ? concept.type : "flowchart",
      concept,
      source: ["gemini", "cache", "fallback"].includes(source)
        ? source
        : "sample",
      level: ["Beginner", "Intermediate", "Advanced"].includes(level)
        ? level
        : "Intermediate",
      createdAt: existing?.createdAt || timestamp,
      lastAccessedAt: timestamp,
      ...(existing?.latestQuizScore
        ? { latestQuizScore: existing.latestQuizScore }
        : {}),
    };

    saveLearningHistory([
      record,
      ...history.filter((entry) => entry.id !== concept.id),
    ]);
    return getLearningHistory();
  };

  const saveQuizResult = ({ conceptId, score, total, percentage }) => {
    if (
      !storage ||
      typeof conceptId !== "string" ||
      !Number.isInteger(score) ||
      !Number.isInteger(total) ||
      total < 1
    ) {
      return getLearningHistory();
    }

    const history = getLearningHistory();
    const timestamp = now().toISOString();
    saveLearningHistory(
      history.map((entry) =>
        entry.id === conceptId
          ? {
              ...entry,
              lastAccessedAt: timestamp,
              latestQuizScore: {
                score,
                total,
                percentage: Number.isFinite(percentage)
                  ? percentage
                  : Math.round((score / total) * 100),
                completedAt: timestamp,
              },
            }
          : entry,
      ),
    );
    return getLearningHistory();
  };

  const getMigrationOwner = () => {
    if (!storage) return null;
    try {
      return storage.getItem(MIGRATION_OWNER_KEY) || null;
    } catch {
      return null;
    }
  };

  const setMigrationOwner = (userId) => {
    if (!storage || typeof userId !== "string" || !userId) return;
    try {
      storage.setItem(MIGRATION_OWNER_KEY, userId);
    } catch {
      // Migration remains optional when browser storage is unavailable.
    }
  };

  const clearLearningHistory = () => {
    if (!storage) return;
    try {
      storage.removeItem(STORAGE_KEY);
    } catch {
      // Backend history remains available when local cleanup is blocked.
    }
  };

  const clearMigrationOwner = () => {
    if (!storage) return;
    try {
      storage.removeItem(MIGRATION_OWNER_KEY);
    } catch {
      // Cleanup is best-effort.
    }
  };

  return {
    getLearningHistory,
    recordConceptAccess,
    saveQuizResult,
    getMigrationOwner,
    setMigrationOwner,
    clearLearningHistory,
    clearMigrationOwner,
  };
};

const historyService = createLearningHistoryService();
export const getLearningHistory = historyService.getLearningHistory;
export const recordConceptAccess = historyService.recordConceptAccess;
export const saveQuizResult = historyService.saveQuizResult;
export const getMigrationOwner = historyService.getMigrationOwner;
export const setMigrationOwner = historyService.setMigrationOwner;
export const clearLearningHistory = historyService.clearLearningHistory;
export const clearMigrationOwner = historyService.clearMigrationOwner;

export default {
  getLearningHistory,
  recordConceptAccess,
  saveQuizResult,
  getMigrationOwner,
  setMigrationOwner,
  clearLearningHistory,
  clearMigrationOwner,
  createLearningHistoryService,
};
