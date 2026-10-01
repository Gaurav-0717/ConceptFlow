import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import {
  loginRequestSchema,
  registerRequestSchema,
} from "../validation/auth.schema.js";
import { User, getUserModel } from "../models/User.js";

const PASSWORD_ROUNDS = 12;
const LOGIN_FAILURE_MESSAGE = "Invalid email or password.";

export class AuthServiceError extends Error {
  constructor(message, statusCode = 503) {
    super(message);
    this.name = "AuthServiceError";
    this.statusCode = statusCode;
  }
}

const publicUser = (document) =>
  document && {
    id: String(document._id || document.id),
    name: document.name,
    email: document.email,
  };

export const createAuthService = ({
  userModel = User,
  getModel = getUserModel,
  getCollection,
  hashPassword = (password) => bcrypt.hash(password, PASSWORD_ROUNDS),
  comparePassword = (password, hash) => bcrypt.compare(password, hash),
  jwtSecret,
  jwtExpiresIn,
} = {}) => {
  const getSecret = () => {
    const secret = jwtSecret ?? process.env.JWT_SECRET;
    if (typeof secret !== "string" || secret.length < 32) {
      throw new AuthServiceError(
        "Authentication is not configured on the server.",
        503,
      );
    }
    return secret;
  };

  const getActiveStorage = async () => {
    try {
      if (getCollection) {
        const col = await getCollection();
        if (!col) {
          throw new AuthServiceError(
            "Account storage is temporarily unavailable.",
            503,
          );
        }
        return col;
      }
      const model = await getModel();
      if (!model) {
        throw new AuthServiceError(
          "Account storage is temporarily unavailable.",
          503,
        );
      }
      return model;
    } catch (error) {
      if (error instanceof AuthServiceError) throw error;
      throw new AuthServiceError(
        "Account storage is temporarily unavailable.",
        503,
      );
    }
  };

  const issueToken = (id) =>
    jwt.sign({ sub: String(id) }, getSecret(), {
      expiresIn: jwtExpiresIn || process.env.JWT_EXPIRES_IN || "7d",
    });

  const register = async (rawInput) => {
    const parsed = registerRequestSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new AuthServiceError(
        "Enter a name, valid email, and password of at least 8 characters.",
        400,
      );
    }
    getSecret();
    const storage = await getActiveStorage();
    const input = parsed.data;

    const existing = await storage.findOne({ email: input.email });
    if (existing) {
      throw new AuthServiceError(
        "An account with this email already exists.",
        409,
      );
    }

    const passwordHash = await hashPassword(input.password);
    const timestamp = new Date();

    try {
      let created;
      if (typeof storage.create === "function" && typeof storage.insertOne !== "function") {
        created = await storage.create({
          name: input.name,
          email: input.email,
          passwordHash,
        });
      } else if (typeof storage.insertOne === "function") {
        const document = {
          name: input.name,
          email: input.email,
          passwordHash,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        const inserted = await storage.insertOne(document);
        created = { ...document, _id: inserted.insertedId };
      } else {
        created = await storage.create({
          name: input.name,
          email: input.email,
          passwordHash,
        });
      }

      const user = publicUser(created);
      return { user, token: issueToken(user.id) };
    } catch (error) {
      if (error?.code === 11000) {
        throw new AuthServiceError(
          "An account with this email already exists.",
          409,
        );
      }
      throw new AuthServiceError(
        "Account registration is temporarily unavailable.",
        503,
      );
    }
  };

  const login = async (rawInput) => {
    const parsed = loginRequestSchema.safeParse(rawInput);
    if (!parsed.success) throw new AuthServiceError(LOGIN_FAILURE_MESSAGE, 401);
    getSecret();
    const storage = await getActiveStorage();
    const document = await storage.findOne({ email: parsed.data.email });
    if (
      !document ||
      !(await comparePassword(parsed.data.password, document.passwordHash))
    ) {
      throw new AuthServiceError(LOGIN_FAILURE_MESSAGE, 401);
    }
    const user = publicUser(document);
    return { user, token: issueToken(user.id) };
  };

  const verifyToken = (token) => {
    try {
      const payload = jwt.verify(token, getSecret());
      if (typeof payload.sub !== "string" || !payload.sub)
        throw new Error("Invalid subject.");
      return { id: payload.sub };
    } catch {
      throw new AuthServiceError("Invalid or expired token.", 401);
    }
  };

  const getUserById = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const storage = await getActiveStorage();
    let document;
    if (typeof storage.findById === "function") {
      document = await storage.findById(id);
    } else {
      document = await storage.findOne({
        _id: new mongoose.Types.ObjectId(id),
      });
    }
    return publicUser(document);
  };

  return { register, login, verifyToken, getUserById };
};

export const authService = createAuthService();

export default { createAuthService, authService };
