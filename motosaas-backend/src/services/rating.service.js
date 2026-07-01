const { prisma } = require("../config/db");
const { ApiError } = require("../utils/apiError");

async function rateTrip(user, payload) {
  const score = Number(payload.score);

  if (!payload.tripId || !payload.ratedUserId || Number.isNaN(score) || score < 1 || score > 5) {
    throw new ApiError(400, "tripId, ratedUserId and score between 1 and 5 are required.");
  }

  const trip = await prisma.trip.findFirst({
    where: {
      id: payload.tripId,
      association_id: user.association_id,
      status: "COMPLETED"
    }
  });

  if (!trip) {
    throw new ApiError(404, "Completed trip not found.");
  }

  const allowedRaters = [trip.customer_user_id, trip.driver_user_id].filter(Boolean);
  const allowedRatedUsers = [trip.customer_user_id, trip.driver_user_id].filter(Boolean);

  if (!allowedRaters.includes(user.id) || !allowedRatedUsers.includes(payload.ratedUserId)) {
    throw new ApiError(403, "Rating is not allowed for this trip.");
  }

  if (payload.ratedUserId === user.id) {
    throw new ApiError(400, "Users cannot rate themselves.");
  }

  const rating = await prisma.rating.create({
    data: {
      association_id: user.association_id,
      trip_id: trip.id,
      rater_user_id: user.id,
      rated_user_id: payload.ratedUserId,
      score,
      comment: payload.comment || null,
      created_by: user.id,
      updated_by: user.id
    }
  });

  await prisma.tripHistory.create({
    data: {
      association_id: user.association_id,
      trip_id: trip.id,
      actor_user_id: user.id,
      event: "RATED",
      from_status: trip.status,
      to_status: trip.status,
      metadata: {
        ratedUserId: payload.ratedUserId,
        score
      },
      created_by: user.id,
      updated_by: user.id
    }
  });

  return rating;
}

module.exports = { rateTrip };
