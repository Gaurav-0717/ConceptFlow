const SENSITIVE_PATTERNS = [
  /mongodb(?:\+srv)?:\/\/[^\s"']+/gi,
  /(?:jwt[-_]?secret|api[-_]?key|bearer|password)[=:\s]+[^\s"']+/gi,
  /(?:[a-zA-Z]:[/\\]|\/(?:[a-zA-Z0-9._-]+[/\\]))[^\s"']+/gi,
];

export const sanitizeErrorMessage = (msg) => {
  if (!msg || typeof msg !== "string") return "An error occurred.";
  let sanitized = msg;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[redacted]");
  }
  return sanitized;
};

export const errorHandler = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === "production";
  const statusCode =
    err.statusCode ||
    (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);

  let message = "An internal server error occurred.";

  if (err.type === "entity.parse.failed") {
    message = "Request body must be valid JSON.";
  } else if (statusCode === 413) {
    message = "Request body is too large.";
  } else if (statusCode < 500 && err.message) {
    message = sanitizeErrorMessage(err.message);
  } else if (!isProduction && err.message && statusCode >= 500) {
    // Non-production development helper, still sanitized against raw secrets
    message = sanitizeErrorMessage(err.message);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

export default errorHandler;
