export const errorHandler = (err, req, res, next) => {
  const statusCode =
    err.statusCode ||
    (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  const message =
    err.type === "entity.parse.failed"
      ? "Request body must be valid JSON."
      : statusCode === 413
        ? "Request body is too large."
        : "An internal server error occurred.";

  res.status(statusCode).json({
    success: false,
    message,
  });
};
