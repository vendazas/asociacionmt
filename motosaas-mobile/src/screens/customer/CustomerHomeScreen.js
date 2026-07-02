import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Field } from "../../components/Field";
import { Metric } from "../../components/Metric";
import { PrimaryButton } from "../../components/PrimaryButton";
import { AppModes, modeLabels } from "../../config/roles";
import { ratingsApi, tripsApi } from "../../api/resources";
import { useAuth } from "../../providers/AuthProvider";

const terminalStatuses = ["TRIP_FINISHED", "TRIP_CANCELLED", "REJECTED", "EXPIRED"];
const activeStatuses = ["REQUESTED", "SEARCHING_DRIVER", "DRIVER_ASSIGNED", "DRIVER_ARRIVING", "TRIP_STARTED"];

function apiMessage(error) {
  const message = error?.response?.data?.error?.message || error?.message || "No se pudo completar la operacion.";

  if (message.includes("No active fare config")) {
    return "La asociacion aun no tiene una tarifa activa configurada.";
  }

  if (message.includes("outside active coverage zones")) {
    return "Tu origen esta fuera de las zonas activas de cobertura.";
  }

  return message;
}

function stageTitle(status) {
  const labels = {
    REQUESTED: "Solicitud creada",
    SEARCHING_DRIVER: "Esperando mototaxista",
    DRIVER_ASSIGNED: "Mototaxista asignado",
    DRIVER_ARRIVING: "Mototaxista en camino",
    TRIP_STARTED: "Viaje en curso",
    TRIP_FINISHED: "Viaje finalizado",
    TRIP_CANCELLED: "Viaje cancelado",
    REJECTED: "Solicitud rechazada",
    EXPIRED: "Solicitud expirada"
  };

  return labels[status] || "Estado del viaje";
}

function coordinateFromEvent(event) {
  return event.nativeEvent.coordinate;
}

export function CustomerHomeScreen() {
  const { activeMode, availableModes, logout, session, setActiveMode } = useAuth();
  const queryClient = useQueryClient();
  const [pointMode, setPointMode] = useState("origin");
  const [origin, setOrigin] = useState({ latitude: "-17.7833", longitude: "-63.1821" });
  const [destination, setDestination] = useState({ latitude: "-17.7750", longitude: "-63.1950" });
  const [activeTripId, setActiveTripId] = useState(null);
  const [ratingTrip, setRatingTrip] = useState(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [ratedTripIds, setRatedTripIds] = useState([]);

  const estimateMutation = useMutation({
    mutationFn: () =>
      tripsApi.estimate({
        originLatitude: Number(origin.latitude),
        originLongitude: Number(origin.longitude),
        destinationLatitude: Number(destination.latitude),
        destinationLongitude: Number(destination.longitude)
      })
  });

  const requestMutation = useMutation({
    mutationFn: () =>
      tripsApi.request({
        originLatitude: Number(origin.latitude),
        originLongitude: Number(origin.longitude),
        destinationLatitude: Number(destination.latitude),
        destinationLongitude: Number(destination.longitude),
        originAddress: "Ubicacion actual",
        destinationAddress: "Destino seleccionado"
      }),
    onSuccess: (trip) => {
      setActiveTripId(trip.id);
      queryClient.invalidateQueries({ queryKey: ["customer-history"] });
    }
  });

  const currentTripQuery = useQuery({
    queryKey: ["current-trip"],
    queryFn: tripsApi.current,
    refetchInterval: activeTripId ? false : 10000
  });

  useEffect(() => {
    if (!activeTripId && currentTripQuery.data?.customer_user_id === session?.user?.id) {
      setActiveTripId(currentTripQuery.data.id);
    }
  }, [activeTripId, currentTripQuery.data?.customer_user_id, currentTripQuery.data?.id, session?.user?.id]);

  const statusQuery = useQuery({
    queryKey: ["trip-status", activeTripId],
    queryFn: () => tripsApi.status(activeTripId),
    enabled: Boolean(activeTripId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && terminalStatuses.includes(status) ? false : 5000;
    }
  });

  const historyQuery = useQuery({
    queryKey: ["customer-history"],
    queryFn: () => tripsApi.history({ limit: 12 }),
    refetchInterval: activeTripId ? 12000 : false
  });

  const cancelMutation = useMutation({
    mutationFn: (tripId) => tripsApi.cancel(tripId, { reason: "Cancelado por pasajero" }),
    onSuccess: (trip) => {
      queryClient.setQueryData(["trip-status", trip.id], trip);
      queryClient.invalidateQueries({ queryKey: ["customer-history"] });
      queryClient.invalidateQueries({ queryKey: ["current-trip"] });
    }
  });

  const ratingMutation = useMutation({
    mutationFn: () =>
      ratingsApi.create({
        tripId: ratingTrip.id,
        ratedUserId: ratingTrip.driver_user_id,
        score: ratingScore,
        comment: ratingComment
      }),
    onSuccess: () => {
      setRatedTripIds((current) => [...current, ratingTrip.id]);
      setRatingTrip(null);
      setRatingComment("");
      queryClient.invalidateQueries({ queryKey: ["customer-history"] });
    }
  });

  const region = useMemo(
    () => ({
      latitude: Number(origin.latitude) || -17.7833,
      longitude: Number(origin.longitude) || -63.1821,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05
    }),
    [origin.latitude, origin.longitude]
  );

  const currentPassengerTrip =
    currentTripQuery.data?.customer_user_id === session?.user?.id ? currentTripQuery.data : null;
  const trip = cancelMutation.data || statusQuery.data || requestMutation.data || currentPassengerTrip;
  const isTerminal = trip?.status ? terminalStatuses.includes(trip.status) : false;
  const isActive = trip?.status ? activeStatuses.includes(trip.status) : false;
  const canRateTrip = trip?.status === "TRIP_FINISHED" && trip.driver_user_id && !ratedTripIds.includes(trip.id);

  function resetEstimate() {
    if (estimateMutation.data || estimateMutation.error) {
      estimateMutation.reset();
    }
  }

  function setPointFromMap(event) {
    const coordinate = coordinateFromEvent(event);
    const nextPoint = {
      latitude: coordinate.latitude.toFixed(6),
      longitude: coordinate.longitude.toFixed(6)
    };

    resetEstimate();

    if (pointMode === "origin") {
      setOrigin(nextPoint);
    } else {
      setDestination(nextPoint);
    }
  }

  function finishVisibleFlow() {
    setActiveTripId(null);
    requestMutation.reset();
    cancelMutation.reset();
    queryClient.removeQueries({ queryKey: ["trip-status"] });
    queryClient.invalidateQueries({ queryKey: ["current-trip"] });
    queryClient.invalidateQueries({ queryKey: ["customer-history"] });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Pasajero</Text>
          <Text style={styles.subtitle}>{session?.user?.email}</Text>
        </View>
        <PrimaryButton label="Salir" onPress={logout} variant="muted" />
      </View>

      {availableModes.length > 1 ? (
        <View style={styles.modeBar}>
          {[AppModes.DRIVER, AppModes.PASSENGER].map((mode) => (
            <Pressable
              key={mode}
              onPress={() => setActiveMode(mode)}
              style={[styles.modeButton, activeMode === mode ? styles.modeButtonActive : null]}
            >
              <Text style={[styles.modeText, activeMode === mode ? styles.modeTextActive : null]}>
                {modeLabels[mode]}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.segment}>
        {[
          ["origin", "Origen"],
          ["destination", "Destino"]
        ].map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setPointMode(key)}
            style={[styles.segmentButton, pointMode === key ? styles.segmentActive : null]}
          >
            <Text style={[styles.segmentText, pointMode === key ? styles.segmentTextActive : null]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <MapView style={styles.map} initialRegion={region} region={region} onPress={setPointFromMap}>
        <Marker coordinate={{ latitude: Number(origin.latitude), longitude: Number(origin.longitude) }} title="Origen" />
        <Marker
          coordinate={{ latitude: Number(destination.latitude), longitude: Number(destination.longitude) }}
          pinColor="#b45309"
          title="Destino"
        />
      </MapView>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Ubicacion</Text>
        <View style={styles.grid}>
          <Field
            label="Latitud origen"
            value={origin.latitude}
            keyboardType="numeric"
            onChangeText={(value) => {
              resetEstimate();
              setOrigin((current) => ({ ...current, latitude: value }));
            }}
          />
          <Field
            label="Longitud origen"
            value={origin.longitude}
            keyboardType="numeric"
            onChangeText={(value) => {
              resetEstimate();
              setOrigin((current) => ({ ...current, longitude: value }));
            }}
          />
          <Field
            label="Latitud destino"
            value={destination.latitude}
            keyboardType="numeric"
            onChangeText={(value) => {
              resetEstimate();
              setDestination((current) => ({ ...current, latitude: value }));
            }}
          />
          <Field
            label="Longitud destino"
            value={destination.longitude}
            keyboardType="numeric"
            onChangeText={(value) => {
              resetEstimate();
              setDestination((current) => ({ ...current, longitude: value }));
            }}
          />
        </View>

        <PrimaryButton label="Ver tarifa estimada" onPress={() => estimateMutation.mutate()} disabled={estimateMutation.isPending || isActive} />
        {estimateMutation.error ? <Text style={styles.error}>{apiMessage(estimateMutation.error)}</Text> : null}
        {estimateMutation.data ? (
          <View style={styles.metrics}>
            <Metric label="Distancia" value={`${estimateMutation.data.estimate.distanceKm} km`} />
            <Metric label="Tarifa" value={`Bs ${estimateMutation.data.estimate.total}`} />
          </View>
        ) : null}
        {requestMutation.error ? <Text style={styles.error}>{apiMessage(requestMutation.error)}</Text> : null}
        <PrimaryButton
          label="Solicitar viaje"
          onPress={() => requestMutation.mutate()}
          disabled={requestMutation.isPending || Boolean(activeTripId) || !estimateMutation.data}
        />
      </View>

      {trip ? (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>{stageTitle(trip.status)}</Text>
          <Text style={styles.item}>Estado: {trip.status}</Text>
          <Text style={styles.item}>Tarifa estimada: Bs {trip.estimated_fare}</Text>
          {trip.final_fare ? <Text style={styles.item}>Tarifa final: Bs {trip.final_fare}</Text> : null}
          {trip.driver ? (
            <Text style={styles.item}>Mototaxista: {trip.driver.full_name} · {trip.driver.phone || trip.driver.email}</Text>
          ) : (
            <Text style={styles.item}>Mototaxista: pendiente</Text>
          )}
          {trip.vehicle ? <Text style={styles.item}>Moto: {trip.vehicle.plate} {trip.vehicle.model || ""}</Text> : null}

          {!isTerminal ? (
            <PrimaryButton
              label="Cancelar viaje"
              onPress={() => cancelMutation.mutate(trip.id)}
              disabled={cancelMutation.isPending}
              variant="muted"
            />
          ) : null}
          {cancelMutation.error ? <Text style={styles.error}>{apiMessage(cancelMutation.error)}</Text> : null}
          {canRateTrip ? <PrimaryButton label="Calificar mototaxista" onPress={() => setRatingTrip(trip)} /> : null}
          {isTerminal ? <PrimaryButton label="Finalizar flujo" onPress={finishVisibleFlow} variant="muted" /> : null}
        </View>
      ) : null}

      {ratingTrip ? (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Calificacion</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((score) => (
              <Pressable
                key={score}
                onPress={() => setRatingScore(score)}
                style={[styles.scoreButton, ratingScore === score ? styles.scoreActive : null]}
              >
                <Text style={[styles.scoreText, ratingScore === score ? styles.scoreTextActive : null]}>{score}</Text>
              </Pressable>
            ))}
          </View>
          <Field
            label="Comentario"
            value={ratingComment}
            multiline
            numberOfLines={3}
            onChangeText={setRatingComment}
          />
          {ratingMutation.error ? <Text style={styles.error}>{apiMessage(ratingMutation.error)}</Text> : null}
          <PrimaryButton label="Enviar calificacion" onPress={() => ratingMutation.mutate()} disabled={ratingMutation.isPending} />
          <PrimaryButton label="Cancelar" onPress={() => setRatingTrip(null)} variant="muted" />
        </View>
      ) : null}

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Historial</Text>
        {(historyQuery.data?.items || []).map((item) => (
          <View key={item.id} style={styles.historyItem}>
            <Text style={styles.item}>{item.status} · Bs {item.final_fare || item.estimated_fare}</Text>
            <Text style={styles.muted}>{new Date(item.requested_at).toLocaleString()}</Text>
            {item.status === "TRIP_FINISHED" && item.driver_user_id && !ratedTripIds.includes(item.id) ? (
              <PrimaryButton label="Calificar" onPress={() => setRatingTrip(item)} variant="muted" />
            ) : null}
          </View>
        ))}
        {!historyQuery.data?.items?.length ? <Text style={styles.item}>Sin viajes registrados.</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f5f4" },
  content: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerText: { flex: 1, paddingRight: 12 },
  title: { color: "#171717", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "#737373", marginTop: 2 },
  modeBar: { flexDirection: "row", backgroundColor: "#ffffff", borderRadius: 8, borderWidth: 1, borderColor: "#d4d4d4", marginTop: 14, padding: 3 },
  modeButton: { flex: 1, minHeight: 38, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  modeButtonActive: { backgroundColor: "#0f766e" },
  modeText: { color: "#525252", fontWeight: "700" },
  modeTextActive: { color: "#ffffff" },
  segment: { flexDirection: "row", marginTop: 14, backgroundColor: "#e7e5e4", borderRadius: 8, padding: 3 },
  segmentButton: { flex: 1, minHeight: 38, alignItems: "center", justifyContent: "center", borderRadius: 7 },
  segmentActive: { backgroundColor: "#171717" },
  segmentText: { color: "#525252", fontWeight: "800" },
  segmentTextActive: { color: "#ffffff" },
  map: { height: 260, borderRadius: 8, marginTop: 12 },
  panel: { marginTop: 16, backgroundColor: "#ffffff", borderRadius: 8, borderWidth: 1, borderColor: "#d4d4d4", padding: 14 },
  sectionTitle: { color: "#171717", fontSize: 16, fontWeight: "800", marginBottom: 4 },
  grid: { marginTop: 2 },
  metrics: { flexDirection: "row", flexWrap: "wrap", marginTop: 10, marginHorizontal: -4 },
  error: { color: "#b45309", marginTop: 8, fontWeight: "700" },
  item: { color: "#525252", marginTop: 7 },
  muted: { color: "#737373", marginTop: 3, fontSize: 12 },
  historyItem: { borderTopWidth: 1, borderTopColor: "#e7e5e4", paddingTop: 10, marginTop: 10 },
  ratingRow: { flexDirection: "row", marginTop: 8 },
  scoreButton: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: "#d4d4d4", alignItems: "center", justifyContent: "center", marginRight: 8 },
  scoreActive: { backgroundColor: "#0f766e", borderColor: "#0f766e" },
  scoreText: { color: "#525252", fontWeight: "800" },
  scoreTextActive: { color: "#ffffff" }
});
