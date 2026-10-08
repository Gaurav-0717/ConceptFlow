import mongoose from "mongoose";

export const getHealth = (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const status = isDbConnected ? "HEALTHY" : "DEGRADED";

  res.status(200).json({
    success: true,
    service: "ConceptFlow API",
    status,
    database: isDbConnected ? "CONNECTED" : "DISCONNECTED",
  });
};

export const getReadiness = (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;

  if (!isDbConnected) {
    return res.status(503).json({
      success: false,
      service: "ConceptFlow API",
      status: "NOT_READY",
      database: "DISCONNECTED",
    });
  }

  return res.status(200).json({
    success: true,
    service: "ConceptFlow API",
    status: "READY",
    database: "CONNECTED",
  });
};

export default { getHealth, getReadiness };
