import { authService } from "../services/authService.js";

const readBearerToken = (req) => {
  const header = req.get("authorization") || "";
  const match = /^Bearer\s+([A-Za-z0-9._~-]+)$/i.exec(header);
  return match?.[1] || null;
};

export const createAuthMiddleware =
  ({ service = authService, optional = false } = {}) =>
  (req, res, next) => {
    const header = req.get("authorization");
    if (!header && optional) return next();
    const token = readBearerToken(req);
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication is required." });
    }
    try {
      req.user = service.verifyToken(token);
      return next();
    } catch {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired token." });
    }
  };

export const requireAuth = createAuthMiddleware();
export const optionalAuth = createAuthMiddleware({ optional: true });
