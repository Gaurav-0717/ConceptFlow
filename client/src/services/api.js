import axios from "axios";

const API_BASE_URL = import.meta.env?.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Normalize endpoint paths if baseURL already includes /api
api.interceptors.request.use((config) => {
  if (config.baseURL?.endsWith("/api") && config.url?.startsWith("/api/")) {
    config.url = config.url.replace(/^\/api/, "");
  }
  return config;
});

export const getHealthStatus = async () => {
  const response = await api.get("/api/health");
  return response.data;
};

export default api;
