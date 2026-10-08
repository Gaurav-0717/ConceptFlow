import rateLimit from "express-rate-limit";

export const progressRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.PROGRESS_RATE_LIMIT) || 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  validate: { keyGeneratorIpFallback: false },
  handler: (req, res) =>
    res.status(429).json({
      success: false,
      message:
        "Too many progress requests. Please wait a few moments and try again.",
    }),
});

export default progressRateLimit;
