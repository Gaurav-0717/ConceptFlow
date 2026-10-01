import rateLimit from "express-rate-limit";

export const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AI_RATE_LIMIT) || 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({
      success: false,
      message:
        "Too many learning requests. Please wait a few minutes and try again.",
    }),
});
