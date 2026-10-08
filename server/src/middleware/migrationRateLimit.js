import rateLimit from "express-rate-limit";

export const migrationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.MIGRATION_RATE_LIMIT) || 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  validate: { keyGeneratorIpFallback: false },
  handler: (req, res) =>
    res.status(429).json({
      success: false,
      message:
        "Too many history migration attempts. Please wait a few minutes and try again.",
    }),
});
