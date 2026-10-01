import api from "./api";

const request = async (promise, fallback) => {
  try {
    const response = await promise;
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message;
    throw new Error(typeof message === "string" ? message : fallback);
  }
};

export const registerAccount = (credentials) =>
  request(
    api.post("/auth/register", credentials),
    "Registration is temporarily unavailable.",
  );

export const loginAccount = (credentials) =>
  request(api.post("/auth/login", credentials), "Invalid email or password.");

export const getCurrentUser = () =>
  request(
    api.get("/auth/me"),
    "Your session has expired. Please sign in again.",
  );
