import mongoose from "mongoose";

const SERVER_SELECTION_TIMEOUT_MS = 1200;
const RETRY_COOLDOWN_MS = 10000;

let lastConnectedUri = null;
let connectionPromise = null;
let retryAfter = 0;

/**
 * Connects to MongoDB via a single Mongoose connection using process.env.MONGODB_URI.
 * Supports graceful degradation: returns null when MONGODB_URI is absent or the
 * database server is unreachable, and caches the active connection while healthy.
 */
export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return null;
  }

  if (mongoose.connection.readyState === 1 && lastConnectedUri === uri) {
    return mongoose.connection;
  }

  if (mongoose.connection.readyState !== 0 && lastConnectedUri !== uri) {
    try {
      await mongoose.disconnect();
    } catch {
      // Disconnect cleanup is best-effort when switching configurations.
    }
    lastConnectedUri = null;
  }

  if (Date.now() < retryAfter) {
    return null;
  }

  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
        connectTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
      });
      lastConnectedUri = uri;
      return mongoose.connection;
    } catch {
      retryAfter = Date.now() + RETRY_COOLDOWN_MS;
      lastConnectedUri = null;
      try {
        await mongoose.disconnect();
      } catch {
        // Connection cleanup is best-effort while operating in degraded mode.
      }
      return null;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
};

/**
 * Backward compatibility alias for getMongoDatabase.
 * Returns the active Mongoose connection, or null if unavailable.
 */
export const getMongoDatabase = connectDB;

/**
 * Disconnects the Mongoose connection cleanly and resets connection state.
 */
export const closeMongoConnection = async () => {
  lastConnectedUri = null;
  connectionPromise = null;
  retryAfter = 0;
  try {
    await mongoose.disconnect();
  } catch {
    // Best-effort disconnect.
  }
};

export const disconnectDB = closeMongoConnection;

export default connectDB;
