import rateLimit from "express-rate-limit";

export const quizCreationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.QUIZ_CREATION_RATE_LIMIT) || 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  validate: { keyGeneratorIpFallback: false },
  handler: (req, res) =>
    res.status(429).json({
      success: false,
      message:
        "Too many quiz creation requests. Please wait a few minutes and try again.",
    }),
});

export const quizSubmissionRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.QUIZ_SUBMIT_RATE_LIMIT) || 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  validate: { keyGeneratorIpFallback: false },
  handler: (req, res) =>
    res.status(429).json({
      success: false,
      message:
        "Too many quiz submissions. Please wait a few minutes and try again.",
    }),
});

export default { quizCreationRateLimit, quizSubmissionRateLimit };
