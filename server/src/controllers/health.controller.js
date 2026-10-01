export const getHealth = (req, res) => {
  res.status(200).json({
    success: true,
    service: "ConceptFlow API",
    status: "HEALTHY"
  });
};
