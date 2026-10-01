import axios from "axios";

const API_BASE_URL = import.meta?.env?.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getHealthStatus = async () => {
  const response = await api.get("/health");
  return response.data;
};

export default api;
