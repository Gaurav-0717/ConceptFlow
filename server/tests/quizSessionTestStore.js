const matches = (document, filter) => {
  if (filter.quizId && document.quizId !== filter.quizId) return false;
  if (filter.userId && String(document.userId) !== String(filter.userId)) {
    return false;
  }
  if (
    filter.expiresAt?.$gt &&
    new Date(document.expiresAt) <= filter.expiresAt.$gt
  ) {
    return false;
  }
  if (filter.$or) {
    const matched = filter.$or.some((clause) => {
      if ("userId" in clause) {
        if (clause.userId === null) return document.userId === null;
        return String(document.userId) === String(clause.userId);
      }
      return true;
    });
    if (!matched) return false;
  }
  return true;
};

export const createQuizSessionTestStore = ({ beforeFindOne } = {}) => {
  const documents = new Map();
  const collection = {
    insertOne: async (document) => {
      documents.set(document.quizId, structuredClone(document));
      return { acknowledged: true };
    },
    findOne: async (filter) => {
      await beforeFindOne?.();
      const document = [...documents.values()].find((entry) =>
        matches(entry, filter),
      );
      return document ? structuredClone(document) : null;
    },
    findOneAndDelete: async (filter) => {
      const entry = [...documents.entries()].find(([, document]) =>
        matches(document, filter),
      );
      if (!entry) return null;
      documents.delete(entry[0]);
      return structuredClone(entry[1]);
    },
  };
  return { collection, documents };
};
