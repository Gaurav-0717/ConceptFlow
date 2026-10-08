import dotenv from "dotenv";
dotenv.config();
import { connectDB } from "./config/database.js";
import { validateProductionConfig } from "./config/envValidation.js";
import {
  ensureModelIndexes,
  verifyDatabaseIndexes,
} from "./config/indexVerification.js";

const isProduction = process.env.NODE_ENV === "production";

// Production environment check
if (isProduction) {
  const envCheck = validateProductionConfig(process.env);
  if (!envCheck.valid) {
    console.error(
      "[ConceptFlow Startup Error] Production environment configuration invalid:\n - " +
        envCheck.errors.join("\n - "),
    );
    process.exit(1);
  }
  if (envCheck.warnings.length > 0) {
    envCheck.warnings.forEach((warn) =>
      console.warn("[ConceptFlow Startup Warning] " + warn),
    );
  }
}

const { default: app } = await import("./app.js");

const PORT = process.env.PORT || 5000;

await connectDB()
  .then(async (conn) => {
    if (conn) {
      console.log("[ConceptFlow API] Connected to MongoDB via Mongoose.");

      // Production database index verification
      if (isProduction) {
        await ensureModelIndexes(conn.models);
        const indexResult = await verifyDatabaseIndexes(conn.db);
        if (!indexResult.healthy) {
          const missingSummary = indexResult.missing
            .map((m) => `${m.collection}.${m.name} (${m.description})`)
            .join(", ");
          console.error(
            `[ConceptFlow Startup Error] Production database is missing correctness-critical indexes: ${missingSummary}`,
          );
          process.exit(1);
        } else {
          console.log(
            `[ConceptFlow API] Verified ${indexResult.verified.length} critical database indexes in production.`,
          );
        }
      }
    } else {
      if (isProduction) {
        console.error(
          "[ConceptFlow Startup Error] MongoDB connection is required in production.",
        );
        process.exit(1);
      }
      console.warn(
        "[ConceptFlow API] MongoDB connection unavailable. Operating in degraded mode.",
      );
    }
  })
  .catch((err) => {
    if (isProduction) {
      console.error(
        "[ConceptFlow Startup Error] MongoDB connection failure in production:",
        err.message,
      );
      process.exit(1);
    }
    console.warn("[ConceptFlow API] MongoDB connection error:", err.message);
  });

app.listen(PORT, () => {
  console.log(`[ConceptFlow API] Server is running on port ${PORT}`);
});
