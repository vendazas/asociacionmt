const ratingService = require("../services/rating.service");

async function rateTrip(req, res) {
  const data = await ratingService.rateTrip(req.user, req.body);
  res.status(201).json({ data });
}

module.exports = { rateTrip };
