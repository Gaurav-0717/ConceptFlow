import dotenv from "dotenv";
dotenv.config();
import { connectDB } from "./config/database.js";

const { default: app } = await import("./app.js");

const PORT = process.env.PORT || 5000;

await connectDB()
  .then((conn) => {
    if (conn) {
      console.log("[ConceptFlow API] Connected to MongoDB via Mongoose.");
    } else {
      console.warn(
        "[ConceptFlow API] MongoDB connection unavailable. Operating in degraded mode.",
      );
    }
  })
  .catch((err) => {
    console.warn("[ConceptFlow API] MongoDB connection error:", err.message);
  });

app.listen(PORT, () => {
  console.log(`[ConceptFlow API] Server is running on port ${PORT}`);
});
