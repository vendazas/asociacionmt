const { prisma } = require("../config/db");
const { Roles } = require("../constants/roles");
const { ApiError } = require("../utils/apiError");

const finishedStatus = "TRIP_FINISHED";
const cancelledStatus = "TRIP_CANCELLED";
const validTripStatuses = new Set([
  "REQUESTED",
  "SEARCHING_DRIVER",
  "DRIVER_ASSIGNED",
  "DRIVER_ARRIVING",
  "TRIP_STARTED",
  "TRIP_FINISHED",
  "TRIP_CANCELLED",
  "REJECTED",
  "EXPIRED"
]);

function money(value) {
  return Number(value || 0);
}

function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfMonth(date = new Date()) {
  const value = new Date(date);
  value.setDate(1);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date, days) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function addMonths(date, months) {
  const value = new Date(date);
  value.setMonth(value.getMonth() + months);
  return value;
}

function parseDate(value, fieldName) {
  if (!value) {
    return null;
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    ? new Date(`${value}T00:00:00.000Z`)
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, `${fieldName} must be a valid date.`);
  }

  return date;
}

function parseFilters(user, query = {}) {
  const status = query.status ? String(query.status).trim().toUpperCase() : null;
  if (status && !validTripStatuses.has(status)) {
    throw new ApiError(400, "Invalid trip status filter.");
  }

  const startDate = parseDate(query.startDate || query.from, "startDate");
  const rawEndDate = parseDate(query.endDate || query.to, "endDate");
  const endDate = rawEndDate ? addDays(rawEndDate, 1) : null;
  const driverUserId = String(query.driverId || query.driverUserId || "").trim() || null;
  const requestedAssociationId = String(query.associationId || "").trim() || null;

  if (user.role !== Roles.SUPER_ADMIN && requestedAssociationId && requestedAssociationId !== user.association_id) {
    throw new ApiError(403, "Association filter is outside your tenant.");
  }

  return {
    associationId: user.role === Roles.SUPER_ADMIN ? requestedAssociationId || null : user.association_id,
    driverUserId,
    endDate,
    startDate,
    status
  };
}

function dateRangeWhere(field, filters) {
  if (!filters.startDate && !filters.endDate) {
    return {};
  }

  return {
    [field]: {
      ...(filters.startDate ? { gte: filters.startDate } : {}),
      ...(filters.endDate ? { lt: filters.endDate } : {})
    }
  };
}

function tripWhere(filters, { dateField = "requested_at", forceStatus = null } = {}) {
  return {
    ...(filters.associationId ? { association_id: filters.associationId } : {}),
    ...(filters.driverUserId ? { driver_user_id: filters.driverUserId } : {}),
    ...(forceStatus || filters.status ? { status: forceStatus || filters.status } : {}),
    ...dateRangeWhere(dateField, filters)
  };
}

function associationWhere(filters) {
  return filters.associationId ? { association_id: filters.associationId } : {};
}

function serializeFilters(filters) {
  return {
    associationId: filters.associationId,
    driverUserId: filters.driverUserId,
    endDate: filters.endDate ? filters.endDate.toISOString() : null,
    startDate: filters.startDate ? filters.startDate.toISOString() : null,
    status: filters.status
  };
}

function mapStatusCounts(items) {
  return items.reduce((accumulator, item) => {
    accumulator[item.status] = item._count.id;
    return accumulator;
  }, {});
}

function mapRoleCounts(items) {
  return items.reduce((accumulator, item) => {
    accumulator[item.role] = item._count.id;
    return accumulator;
  }, {});
}

function mapAssociationStatusCounts(items) {
  return items.reduce((accumulator, item) => {
    accumulator[item.status] = item._count.association_id;
    return accumulator;
  }, {});
}

async function getTripIncomeByAssociation(filters) {
  const rows = await prisma.trip.groupBy({
    by: ["association_id"],
    where: tripWhere(filters, { dateField: "completed_at", forceStatus: finishedStatus }),
    _sum: { final_fare: true }
  });

  return rows.reduce((accumulator, item) => {
    accumulator.set(item.association_id, money(item._sum.final_fare));
    return accumulator;
  }, new Map());
}

async function getTripsByAssociation(filters) {
  const [associations, counts, incomeByAssociation] = await Promise.all([
    prisma.association.findMany({
      where: associationWhere(filters),
      select: {
        association_id: true,
        name: true,
        city: true,
        status: true
      },
      orderBy: { name: "asc" }
    }),
    prisma.trip.groupBy({
      by: ["association_id"],
      where: tripWhere(filters),
      _count: { id: true }
    }),
    getTripIncomeByAssociation(filters)
  ]);

  const countByAssociation = counts.reduce((accumulator, item) => {
    accumulator.set(item.association_id, item._count.id);
    return accumulator;
  }, new Map());

  return associations
    .map((association) => ({
      id: association.association_id,
      association_id: association.association_id,
      name: association.name,
      city: association.city,
      status: association.status,
      trips: countByAssociation.get(association.association_id) || 0,
      income: incomeByAssociation.get(association.association_id) || 0
    }))
    .sort((left, right) => right.trips - left.trips || left.name.localeCompare(right.name));
}

function aggregateTripsByCity(tripsByAssociation) {
  const grouped = tripsByAssociation.reduce((accumulator, item) => {
    const city = item.city || "Sin ciudad";
    const current = accumulator.get(city) || { id: city, city, trips: 0, income: 0 };

    current.trips += item.trips;
    current.income += item.income;
    accumulator.set(city, current);

    return accumulator;
  }, new Map());

  return Array.from(grouped.values()).sort((left, right) => right.trips - left.trips || left.city.localeCompare(right.city));
}

async function getTopDrivers(associationId, filters) {
  const rows = await prisma.trip.groupBy({
    by: ["driver_user_id"],
    where: {
      ...tripWhere(
        {
          ...filters,
          associationId
        },
        { dateField: "completed_at", forceStatus: finishedStatus }
      ),
      driver_user_id: filters.driverUserId || { not: null }
    },
    _count: { id: true },
    _sum: { final_fare: true },
    orderBy: {
      _count: {
        id: "desc"
      }
    },
    take: 10
  });

  const driverIds = rows.map((item) => item.driver_user_id).filter(Boolean);
  const drivers = driverIds.length
    ? await prisma.user.findMany({
        where: {
          association_id: associationId,
          id: { in: driverIds }
        },
        select: {
          id: true,
          full_name: true,
          email: true,
          phone: true,
          username: true,
          status: true
        }
      })
    : [];
  const driversById = new Map(drivers.map((driver) => [driver.id, driver]));

  return rows.map((item) => {
    const driver = driversById.get(item.driver_user_id);

    return {
      id: item.driver_user_id,
      driver_user_id: item.driver_user_id,
      name: driver?.full_name || driver?.username || driver?.email || "Mototaxista",
      phone: driver?.phone || null,
      status: driver?.status || null,
      trips: item._count.id,
      income: money(item._sum.final_fare)
    };
  });
}

async function getSuperAdminDashboard(user, query = {}) {
  if (user.role !== Roles.SUPER_ADMIN) {
    throw new ApiError(403, "Only SUPER_ADMIN can view global reports.");
  }

  const filters = parseFilters(user, query);
  const [associations, users, tripsByStatus, totalTrips, income, tripsByAssociation] = await Promise.all([
    prisma.association.groupBy({
      by: ["status"],
      _count: { association_id: true }
    }),
    prisma.user.groupBy({
      by: ["role"],
      where: {
        ...(filters.associationId ? { association_id: filters.associationId } : {}),
        status: { not: "DELETED" }
      },
      _count: { id: true }
    }),
    prisma.trip.groupBy({
      by: ["status"],
      where: tripWhere(filters),
      _count: { id: true }
    }),
    prisma.trip.count({ where: tripWhere(filters) }),
    prisma.trip.aggregate({
      where: tripWhere(filters, { dateField: "completed_at", forceStatus: finishedStatus }),
      _sum: { final_fare: true }
    }),
    getTripsByAssociation(filters)
  ]);

  const associationsByStatus = mapAssociationStatusCounts(associations);
  const usersByRole = mapRoleCounts(users);

  return {
    scope: "SUPER_ADMIN",
    filters: serializeFilters(filters),
    summary: {
      totalAssociations: Object.values(associationsByStatus).reduce((total, value) => total + value, 0),
      activeAssociations: associationsByStatus.ACTIVE || 0,
      suspendedAssociations: associationsByStatus.SUSPENDED || 0,
      totalDrivers: usersByRole.DRIVER || 0,
      totalTrips,
      totalIncome: money(income._sum.final_fare)
    },
    associationsByStatus,
    usersByRole,
    tripsByStatus: mapStatusCounts(tripsByStatus),
    tripsByCity: aggregateTripsByCity(tripsByAssociation),
    tripsByAssociation
  };
}

async function getAssociationDashboard(user, query = {}) {
  const filters = parseFilters(user, query);
  const associationId = filters.associationId || user.association_id;

  if (!associationId) {
    throw new ApiError(400, "associationId is required for association reports.");
  }

  if (user.role !== Roles.SUPER_ADMIN && associationId !== user.association_id) {
    throw new ApiError(403, "Association report access denied.");
  }

  const todayStart = startOfDay();
  const todayEnd = addDays(todayStart, 1);
  const monthStart = startOfMonth();
  const monthEnd = addMonths(monthStart, 1);
  const scopedFilters = {
    ...filters,
    associationId
  };

  const [
    tripsToday,
    tripsMonth,
    activeDrivers,
    inactiveDrivers,
    customers,
    incomeToday,
    incomeMonth,
    cancelledTrips,
    finishedTrips,
    tripsByStatus,
    rangeTrips,
    rangeIncome,
    topDrivers
  ] = await Promise.all([
    prisma.trip.count({
      where: {
        association_id: associationId,
        requested_at: { gte: todayStart, lt: todayEnd },
        ...(filters.driverUserId ? { driver_user_id: filters.driverUserId } : {})
      }
    }),
    prisma.trip.count({
      where: {
        association_id: associationId,
        requested_at: { gte: monthStart, lt: monthEnd },
        ...(filters.driverUserId ? { driver_user_id: filters.driverUserId } : {})
      }
    }),
    prisma.driverProfile.count({
      where: {
        association_id: associationId,
        status: "ACTIVE"
      }
    }),
    prisma.driverProfile.count({
      where: {
        association_id: associationId,
        status: { in: ["INACTIVE", "BLOCKED", "PENDING"] }
      }
    }),
    prisma.user.count({
      where: {
        association_id: associationId,
        role: Roles.CUSTOMER,
        status: "ACTIVE"
      }
    }),
    prisma.trip.aggregate({
      where: {
        association_id: associationId,
        status: finishedStatus,
        completed_at: { gte: todayStart, lt: todayEnd },
        ...(filters.driverUserId ? { driver_user_id: filters.driverUserId } : {})
      },
      _sum: { final_fare: true }
    }),
    prisma.trip.aggregate({
      where: {
        association_id: associationId,
        status: finishedStatus,
        completed_at: { gte: monthStart, lt: monthEnd },
        ...(filters.driverUserId ? { driver_user_id: filters.driverUserId } : {})
      },
      _sum: { final_fare: true }
    }),
    prisma.trip.count({
      where: {
        ...tripWhere(scopedFilters),
        status: cancelledStatus
      }
    }),
    prisma.trip.count({
      where: {
        ...tripWhere(scopedFilters),
        status: finishedStatus
      }
    }),
    prisma.trip.groupBy({
      by: ["status"],
      where: tripWhere(scopedFilters),
      _count: { id: true }
    }),
    prisma.trip.count({ where: tripWhere(scopedFilters) }),
    prisma.trip.aggregate({
      where: tripWhere(scopedFilters, { dateField: "completed_at", forceStatus: finishedStatus }),
      _sum: { final_fare: true }
    }),
    getTopDrivers(associationId, scopedFilters)
  ]);

  return {
    scope: "ASSOCIATION_ADMIN",
    associationId,
    filters: serializeFilters(scopedFilters),
    summary: {
      tripsToday,
      tripsMonth,
      activeDrivers,
      inactiveDrivers,
      customers,
      incomeToday: money(incomeToday._sum.final_fare),
      incomeMonth: money(incomeMonth._sum.final_fare),
      cancelledTrips,
      finishedTrips,
      rangeTrips,
      rangeIncome: money(rangeIncome._sum.final_fare)
    },
    tripsByStatus: mapStatusCounts(tripsByStatus),
    topDrivers
  };
}

async function getDashboardReport(user, query = {}) {
  if (user.role === Roles.SUPER_ADMIN && query.associationId) {
    return getAssociationDashboard(user, query);
  }

  if (user.role === Roles.SUPER_ADMIN) {
    return getSuperAdminDashboard(user, query);
  }

  if (user.role === Roles.ASSOCIATION_ADMIN) {
    return getAssociationDashboard(user, query);
  }

  throw new ApiError(403, "Only admins can view reports.");
}

async function getAssociationSummary(associationId) {
  const [dashboard, completedTotals] = await Promise.all([
    getAssociationDashboard(
      { role: Roles.ASSOCIATION_ADMIN, association_id: associationId },
      {}
    ),
    prisma.trip.aggregate({
      where: {
        association_id: associationId,
        status: finishedStatus
      },
      _avg: { final_fare: true }
    })
  ]);

  return {
    tripsByStatus: dashboard.tripsByStatus,
    activeDrivers: dashboard.summary.activeDrivers,
    inactiveDrivers: dashboard.summary.inactiveDrivers,
    customers: dashboard.summary.customers,
    revenue: {
      totalCompletedFare: dashboard.summary.rangeIncome,
      averageCompletedFare: money(completedTotals._avg.final_fare)
    }
  };
}

async function getPlatformSummary() {
  const dashboard = await getSuperAdminDashboard({ role: Roles.SUPER_ADMIN }, {});

  return {
    associationsByStatus: dashboard.associationsByStatus,
    usersByRole: dashboard.usersByRole,
    tripsByStatus: dashboard.tripsByStatus,
    totalCompletedFare: dashboard.summary.totalIncome,
    totalAssociations: dashboard.summary.totalAssociations,
    totalDrivers: dashboard.summary.totalDrivers,
    totalTrips: dashboard.summary.totalTrips
  };
}

async function getTodaySummary(associationId) {
  const dashboard = await getAssociationDashboard(
    { role: Roles.ASSOCIATION_ADMIN, association_id: associationId },
    {}
  );

  return {
    activeDrivers: dashboard.summary.activeDrivers,
    tripsToday: dashboard.summary.tripsToday,
    incomeToday: dashboard.summary.incomeToday,
    date: startOfDay().toISOString().slice(0, 10)
  };
}

async function getDriverEarnings(user) {
  const [completedTrips, totals] = await prisma.$transaction([
    prisma.trip.count({
      where: {
        association_id: user.association_id,
        driver_user_id: user.id,
        status: finishedStatus
      }
    }),
    prisma.trip.aggregate({
      where: {
        association_id: user.association_id,
        driver_user_id: user.id,
        status: finishedStatus
      },
      _sum: { final_fare: true },
      _avg: { final_fare: true }
    })
  ]);

  return {
    completedTrips,
    grossEarnings: money(totals._sum.final_fare),
    averageTripFare: money(totals._avg.final_fare)
  };
}

module.exports = {
  getAssociationDashboard,
  getAssociationSummary,
  getDashboardReport,
  getDriverEarnings,
  getPlatformSummary,
  getSuperAdminDashboard,
  getTodaySummary
};
