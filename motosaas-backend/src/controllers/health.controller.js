const { prisma } = require("../config/db");

function health(_req, res) {
  res.status(200).json({
    status: "ok",
    service: "motosaas-backend"
  });
}

async function ready(_req, res) {
  await prisma.$queryRaw`SELECT 1`;
  res.status(200).json({ status: "ready" });
}

module.exports = {
  health,
  ready
};
