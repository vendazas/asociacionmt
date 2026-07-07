import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppRoles } from "../config/roles";
import { useAuth } from "./AuthProvider";
import { connectRealtime, disconnectRealtime, emitRealtime } from "../services/realtime.service";

const RealtimeContext = createContext({ connected: false });
const openTripStatuses = ["REQUESTED", "SEARCHING_DRIVER"];

function tripFromPayload(payload) {
  return payload?.trip || payload?.data?.trip || payload;
}

function metadataFromPayload(payload) {
  return payload?.metadata || payload?.data?.metadata || {};
}

function sameId(left, right) {
  return left !== undefined && left !== null && right !== undefined && right !== null && String(left) === String(right);
}

function isTerminalStatus(status) {
  return ["TRIP_FINISHED", "TRIP_CANCELLED", "REJECTED", "EXPIRED"].includes(status);
}

function isOpenTrip(trip) {
  return openTripStatuses.includes(trip?.status) && !trip?.driver_user_id;
}

function isCandidateForDriver(trip, userId) {
  const candidateDriverIds = trip?.fare_breakdown?.candidateDriverIds;

  if (!Array.isArray(candidateDriverIds) || !candidateDriverIds.length) {
    return true;
  }

  return candidateDriverIds.some((driverId) => String(driverId) === String(userId));
}

function updateOpenTripsCache(queryClient, trip, userId, metadata = {}) {
  if (!trip?.id) {
    return;
  }

  queryClient.setQueryData(["open-trips"], (current) => {
    const list = Array.isArray(current) ? current : [];
    const withoutTrip = list.filter((item) => !sameId(item.id, trip.id));

    if (metadata.reason === "driver_rejected" && String(metadata.driverId) === String(userId)) {
      return withoutTrip;
    }

    if (!isOpenTrip(trip) || !isCandidateForDriver(trip, userId)) {
      return withoutTrip;
    }

    return [trip, ...withoutTrip];
  });
}

function refreshPassengerQueries(queryClient, trip) {
  if (trip?.id) {
    queryClient.setQueryData(["trip-status", trip.id], trip);
  }

  queryClient.setQueryData(["current-trip"], trip);

  queryClient.invalidateQueries({ queryKey: ["customer-history"] });
}

function refreshDriverQueries(queryClient, trip) {
  if (!trip?.id) {
    return;
  }

  if (isTerminalStatus(trip.status)) {
    queryClient.setQueryData(["driver-current-trip"], (current) => (sameId(current?.id, trip.id) ? null : current));
  } else {
    queryClient.setQueryData(["driver-current-trip"], trip);
  }

  queryClient.invalidateQueries({ queryKey: ["driver-history"] });
  queryClient.invalidateQueries({ queryKey: ["driver-earnings"] });
}

export function RealtimeProvider({ children }) {
  const { isAuthenticated, session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;
  const isDriverUser = session?.user?.role === AppRoles.DRIVER;
  const associationId = session?.association_id || session?.user?.association_id;

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      disconnectRealtime();
      return undefined;
    }

    let cancelled = false;

    function joinBaseRooms(socket) {
      // Todo usuario puede actuar como pasajero; los conductores ademas escuchan su asociacion y sala propia.
      socket.emit("join_pasajero", { pasajeroId: userId });

      if (isDriverUser) {
        socket.emit("join_conductor", { conductorId: userId });

        if (associationId) {
          socket.emit("join_asociacion", { asociacionId: associationId });
        }
      }
    }

    function handleTripEvent(event, payload) {
      const trip = tripFromPayload(payload);
      const metadata = metadataFromPayload(payload);

      if (!trip?.id) {
        return;
      }

      const belongsToPassenger = sameId(trip.customer_user_id, userId);
      const belongsToDriver = sameId(trip.driver_user_id, userId);

      if (belongsToPassenger) {
        refreshPassengerQueries(queryClient, trip);
      }

      if (isDriverUser) {
        updateOpenTripsCache(queryClient, trip, userId, metadata);
        queryClient.invalidateQueries({ queryKey: ["open-trips"] });
      }

      if (belongsToDriver) {
        refreshDriverQueries(queryClient, trip);
      }
    }

    connectRealtime({
      onConnect: (socket) => {
        if (!cancelled) {
          joinBaseRooms(socket);
          queryClient.invalidateQueries({ queryKey: ["current-trip"] });
          queryClient.invalidateQueries({ queryKey: ["trip-status"] });

          if (isDriverUser) {
            queryClient.invalidateQueries({ queryKey: ["open-trips"] });
            queryClient.invalidateQueries({ queryKey: ["driver-current-trip"] });
          }
        }
      },
      onTripEvent: handleTripEvent
    }).then((socket) => {
      if (cancelled && socket) {
        disconnectRealtime();
      }
    });

    return () => {
      cancelled = true;
      disconnectRealtime();
    };
  }, [associationId, isAuthenticated, isDriverUser, queryClient, userId]);

  const value = useMemo(() => ({ connected: isAuthenticated }), [isAuthenticated]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return useContext(RealtimeContext);
}

export function useRealtimeTripRoom(tripId) {
  useEffect(() => {
    if (!tripId) {
      return undefined;
    }

    emitRealtime("join_viaje", { viajeId: tripId });

    return () => {
      emitRealtime("leave_viaje", { viajeId: tripId });
    };
  }, [tripId]);
}
