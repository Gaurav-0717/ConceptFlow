import axios from "axios";

const rawBaseUrl =
  import.meta.env?.VITE_API_URL || "https://conceptflow-89iq.onrender.com/api";

const API_BASE_URL = rawBaseUrl.endsWith("/api")
  ? rawBaseUrl
  : `${rawBaseUrl.replace(/\/+$/, "")}/api`;

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
