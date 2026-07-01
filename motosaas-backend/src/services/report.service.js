const { prisma } = require("../config/db");

async function getAssociationSummary(associationId) {
  const [tripsByStatus, completedTotals, activeDrivers, customers] = await prisma.$transaction([
    prisma.trip.groupBy({
      by: ["status"],
      where: { association_id: associationId },
      _count: { id: true }
    }),
    prisma.trip.aggregate({
      where: {
        association_id: associationId,
        status: "COMPLETED"
      },
      _sum: {
        final_fare: true
      },
      _avg: {
        final_fare: true
      }
    }),
    prisma.driverProfile.count({
      where: {
        association_id: associationId,
        status: "ACTIVE"
      }
    }),
    prisma.user.count({
      where: {
        association_id: associationId,
        role: "CUSTOMER",
        status: "ACTIVE"
      }
    })
  ]);

  return {
    tripsByStatus: tripsByStatus.reduce((accumulator, item) => {
      accumulator[item.status] = item._count.id;
      return accumulator;
    }, {}),
    activeDrivers,
    customers,
    revenue: {
      totalCompletedFare: Number(completedTotals._sum.final_fare || 0),
      averageCompletedFare: Number(completedTotals._avg.final_fare || 0)
    }
  };
}

async function getPlatformSummary() {
  const [associations, users, tripsByStatus, completedTotals] = await prisma.$transaction([
    prisma.association.groupBy({
      by: ["status"],
      _count: { association_id: true }
    }),
    prisma.user.groupBy({
      by: ["role"],
      _count: { id: true }
    }),
    prisma.trip.groupBy({
      by: ["status"],
      _count: { id: true }
    }),
    prisma.trip.aggregate({
      where: { status: "COMPLETED" },
      _sum: { final_fare: true }
    })
  ]);

  return {
    associationsByStatus: associations.reduce((accumulator, item) => {
      accumulator[item.status] = item._count.association_id;
      return accumulator;
    }, {}),
    usersByRole: users.reduce((accumulator, item) => {
      accumulator[item.role] = item._count.id;
      return accumulator;
    }, {}),
    tripsByStatus: tripsByStatus.reduce((accumulator, item) => {
      accumulator[item.status] = item._count.id;
      return accumulator;
    }, {}),
    totalCompletedFare: Number(completedTotals._sum.final_fare || 0)
  };
}

async function getTodaySummary(associationId) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [activeDrivers, tripsToday, completedTotals] = await prisma.$transaction([
    prisma.driverProfile.count({
      where: {
        association_id: associationId,
        availability_status: { in: ["AVAILABLE", "BUSY"] },
        status: "ACTIVE"
      }
    }),
    prisma.trip.count({
      where: {
        association_id: associationId,
        requested_at: { gte: start, lt: end }
      }
    }),
    prisma.trip.aggregate({
      where: {
        association_id: associationId,
        status: "COMPLETED",
        completed_at: { gte: start, lt: end }
      },
      _sum: { final_fare: true }
    })
  ]);

  return {
    activeDrivers,
    tripsToday,
    incomeToday: Number(completedTotals._sum.final_fare || 0),
    date: start.toISOString().slice(0, 10)
  };
}

async function getDriverEarnings(user) {
  const [completedTrips, totals] = await prisma.$transaction([
    prisma.trip.count({
      where: {
        association_id: user.association_id,
        driver_user_id: user.id,
        status: "COMPLETED"
      }
    }),
    prisma.trip.aggregate({
      where: {
        association_id: user.association_id,
        driver_user_id: user.id,
        status: "COMPLETED"
      },
      _sum: { final_fare: true },
      _avg: { final_fare: true }
    })
  ]);

  return {
    completedTrips,
    grossEarnings: Number(totals._sum.final_fare || 0),
    averageTripFare: Number(totals._avg.final_fare || 0)
  };
}

module.exports = {
  getAssociationSummary,
  getDriverEarnings,
  getPlatformSummary,
  getTodaySummary
};
