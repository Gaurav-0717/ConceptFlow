import api from "./api";

const request = async (promise) => {
  const response = await promise;
  return response.data;
};

export const getUserLearningHistory = () =>
  request(api.get("/learning/history"));

export const createUserLearningActivity = (activity) =>
  request(api.post("/learning/history", activity));

export const getUserLearningActivity = (id) =>
  request(api.get(`/learning/history/${encodeURIComponent(id)}`));

export const deleteUserLearningActivity = (id) =>
  request(api.delete(`/learning/history/${encodeURIComponent(id)}`));

export const migrateLocalLearningHistory = (items) =>
  request(api.post("/learning/history/migrate", { items }, { timeout: 20000 }));
