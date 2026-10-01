import { AuthServiceError, authService } from "../services/authService.js";

const respondWithAuthError = (res, error) => {
  const status = error instanceof AuthServiceError ? error.statusCode : 503;
  const message =
    error instanceof AuthServiceError
      ? error.message
      : "Authentication is temporarily unavailable.";
  return res.status(status).json({ success: false, message });
};

export const createAuthControllers = ({ service = authService } = {}) => ({
  register: async (req, res) => {
    try {
      const result = await service.register(req.body);
      return res.status(201).json({ success: true, ...result });
    } catch (error) {
      return respondWithAuthError(res, error);
    }
  },

  login: async (req, res) => {
    try {
      const result = await service.login(req.body);
      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      return respondWithAuthError(res, error);
    }
  },

  me: async (req, res) => {
    try {
      const user = await service.getUserById(req.user.id);
      if (!user)
        return res
          .status(401)
          .json({ success: false, message: "Invalid or expired token." });
      return res.status(200).json({ success: true, user });
    } catch (error) {
      return respondWithAuthError(res, error);
    }
  },
});
