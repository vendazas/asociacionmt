import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Field } from "../../components/Field";
import { Metric } from "../../components/Metric";
import { PrimaryButton } from "../../components/PrimaryButton";
import { AppModes, modeLabels } from "../../config/roles";
import { driversApi, reportsApi, tripsApi } from "../../api/resources";
import { useAuth } from "../../providers/AuthProvider";

const driverTripStatuses = ["DRIVER_ASSIGNED", "DRIVER_ARRIVING", "TRIP_STARTED"];

function apiMessage(error) {
  return error?.response?.data?.error?.message || error?.message || "No se pudo completar la operacion.";
}

function tripActionLabel(status) {
  if (status === "DRIVER_ASSIGNED") {
    return "Llegue al pasajero";
  }

  if (status === "DRIVER_ARRIVING") {
    return "Iniciar viaje";
  }

  if (status === "TRIP_STARTED") {
    return "Finalizar viaje";
  }

  return null;
}

function isDriverActiveTrip(trip, userId) {
  return Boolean(trip && trip.driver_user_id === userId && driverTripStatuses.includes(trip.status));
}

export function DriverHomeScreen() {
  const { activeMode, availableModes, logout, session, setActiveMode } = useAuth();
  const queryClient = useQueryClient();
  const [location, setLocation] = useState({ latitude: "-17.7833", longitude: "-63.1821" });
  const [available, setAvailable] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const updateLocation = useMutation({
    mutationFn: (nextAvailable = available) =>
      driversApi.updateLocation({
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        availabilityStatus: nextAvailable ? "AVAILABLE" : "OFFLINE"
      })
  });

  function changeAvailability(nextAvailable) {
    setAvailable(nextAvailable);
    updateLocation.mutate(nextAvailable);
  }

  useEffect(() => {
    if (!autoUpdate) return undefined;
    const timer = setInterval(() => updateLocation.mutate(available), 15000);
    return () => clearInterval(timer);
  }, [autoUpdate, available, updateLocation]);

  const currentTrip = useQuery({
    queryKey: ["driver-current-trip"],
    queryFn: tripsApi.current,
    refetchInterval: 5000
  });

  const history = useQuery({
    queryKey: ["driver-history"],
    queryFn: () => tripsApi.history({ limit: 20 }),
    refetchInterval: 10000
  });

  const activeTrip = useMemo(() => {
    if (isDriverActiveTrip(currentTrip.data, session?.user?.id)) {
      return currentTrip.data;
    }

    return (history.data?.items || []).find((trip) => isDriverActiveTrip(trip, session?.user?.id));
  }, [currentTrip.data, history.data, session?.user?.id]);

  const openTrips = useQuery({
    queryKey: ["open-trips"],
    queryFn: tripsApi.open,
    refetchInterval: 5000,
    enabled: available && !activeTrip
  });

  useEffect(() => {
    if (!selectedRequest) {
      return;
    }

    const stillOpen = (openTrips.data || []).some((trip) => trip.id === selectedRequest.id);
    if (!stillOpen) {
      setSelectedRequest(null);
    }
  }, [openTrips.data, selectedRequest]);

  const earnings = useQuery({ queryKey: ["driver-earnings"], queryFn: reportsApi.driverEarnings, refetchInterval: 15000 });

  const actionMutation = useMutation({
    mutationFn: ({ action, tripId }) => tripsApi[action](tripId),
    onSuccess: (_trip, variables) => {
      if (variables.action === "accept") {
        setAvailable(false);
        setSelectedRequest(null);
      }

      queryClient.invalidateQueries({ queryKey: ["open-trips"] });
      queryClient.invalidateQueries({ queryKey: ["driver-current-trip"] });
      queryClient.invalidateQueries({ queryKey: ["driver-history"] });
      queryClient.invalidateQueries({ queryKey: ["driver-earnings"] });
    }
  });

  const finishMutation = useMutation({
    mutationFn: (tripId) => tripsApi.finish(tripId, {}),
    onSuccess: () => {
      setAvailable(true);
      queryClient.invalidateQueries({ queryKey: ["driver-current-trip"] });
      queryClient.invalidateQueries({ queryKey: ["driver-history"] });
      queryClient.invalidateQueries({ queryKey: ["driver-earnings"] });
      queryClient.invalidateQueries({ queryKey: ["open-trips"] });
    }
  });

  const region = {
    latitude: Number(location.latitude) || -17.7833,
    longitude: Number(location.longitude) || -63.1821,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05
  };

  const previewTrip = activeTrip || selectedRequest;
  const activeAction = activeTrip ? tripActionLabel(activeTrip.status) : null;

  function runActiveAction() {
    if (!activeTrip) {
      return;
    }

    if (activeTrip.status === "DRIVER_ASSIGNED") {
      actionMutation.mutate({ action: "arrived", tripId: activeTrip.id });
      return;
    }

    if (activeTrip.status === "DRIVER_ARRIVING") {
      actionMutation.mutate({ action: "start", tripId: activeTrip.id });
      return;
    }

    if (activeTrip.status === "TRIP_STARTED") {
      finishMutation.mutate(activeTrip.id);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Mototaxista</Text>
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

      <MapView style={styles.map} region={region}>
        <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} title="Mi ubicacion" />
        {previewTrip ? (
          <Marker
            coordinate={{
              latitude: previewTrip.origin.latitude,
              longitude: previewTrip.origin.longitude
            }}
            pinColor="#0f766e"
            title="Origen"
          />
        ) : null}
        {previewTrip ? (
          <Marker
            coordinate={{
              latitude: previewTrip.destination.latitude,
              longitude: previewTrip.destination.longitude
            }}
            pinColor="#b45309"
            title="Destino"
          />
        ) : null}
      </MapView>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Disponibilidad</Text>
        <View style={styles.row}>
          <Text style={styles.item}>{available ? "Disponible" : activeTrip ? "En viaje" : "No disponible"}</Text>
          <Switch value={available} onValueChange={changeAvailability} disabled={Boolean(activeTrip)} />
        </View>
        <View style={styles.row}>
          <Text style={styles.item}>Actualizacion automatica</Text>
          <Switch value={autoUpdate} onValueChange={setAutoUpdate} />
        </View>
        <Field
          label="Latitud"
          value={location.latitude}
          keyboardType="numeric"
          onChangeText={(value) => setLocation((current) => ({ ...current, latitude: value }))}
        />
        <Field
          label="Longitud"
          value={location.longitude}
          keyboardType="numeric"
          onChangeText={(value) => setLocation((current) => ({ ...current, longitude: value }))}
        />
        <PrimaryButton label="Actualizar ubicacion" onPress={() => updateLocation.mutate(available)} disabled={updateLocation.isPending} />
        {updateLocation.error ? <Text style={styles.error}>{apiMessage(updateLocation.error)}</Text> : null}
      </View>

      {activeTrip ? (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Viaje activo</Text>
          <Text style={styles.item}>Estado: {activeTrip.status}</Text>
          <Text style={styles.item}>Cliente: {activeTrip.customer?.full_name || "-"}</Text>
          <Text style={styles.item}>Tarifa: Bs {activeTrip.estimated_fare}</Text>
          <Text style={styles.item}>Origen: {activeTrip.origin.address || `${activeTrip.origin.latitude}, ${activeTrip.origin.longitude}`}</Text>
          <Text style={styles.item}>Destino: {activeTrip.destination.address || `${activeTrip.destination.latitude}, ${activeTrip.destination.longitude}`}</Text>
          {activeAction ? (
            <PrimaryButton
              label={activeAction}
              onPress={runActiveAction}
              disabled={actionMutation.isPending || finishMutation.isPending}
            />
          ) : null}
          {actionMutation.error ? <Text style={styles.error}>{apiMessage(actionMutation.error)}</Text> : null}
          {finishMutation.error ? <Text style={styles.error}>{apiMessage(finishMutation.error)}</Text> : null}
        </View>
      ) : null}

      {!activeTrip ? (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Solicitudes pendientes</Text>
          {(openTrips.data || []).map((trip) => (
            <Pressable
              key={trip.id}
              onPress={() => setSelectedRequest(trip)}
              style={[styles.request, selectedRequest?.id === trip.id ? styles.requestActive : null]}
            >
              <Text style={styles.item}>Cliente: {trip.customer?.full_name || "-"}</Text>
              <Text style={styles.item}>Tarifa: Bs {trip.estimated_fare}</Text>
              <Text style={styles.muted}>Estado: {trip.status}</Text>
            </Pressable>
          ))}
          {!available ? <Text style={styles.item}>Activa tu disponibilidad para recibir solicitudes.</Text> : null}
          {available && !openTrips.data?.length ? <Text style={styles.item}>Sin solicitudes pendientes.</Text> : null}
          {openTrips.error ? <Text style={styles.error}>{apiMessage(openTrips.error)}</Text> : null}
        </View>
      ) : null}

      {selectedRequest && !activeTrip ? (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Detalle de solicitud</Text>
          <Text style={styles.item}>Cliente: {selectedRequest.customer?.full_name || "-"}</Text>
          <Text style={styles.item}>Tarifa estimada: Bs {selectedRequest.estimated_fare}</Text>
          <Text style={styles.item}>Distancia: {selectedRequest.estimated_distance_km} km</Text>
          <Text style={styles.item}>Origen: {selectedRequest.origin.address || `${selectedRequest.origin.latitude}, ${selectedRequest.origin.longitude}`}</Text>
          <Text style={styles.item}>Destino: {selectedRequest.destination.address || `${selectedRequest.destination.latitude}, ${selectedRequest.destination.longitude}`}</Text>
          <PrimaryButton
            label="Aceptar"
            disabled={!available || actionMutation.isPending}
            onPress={() => actionMutation.mutate({ action: "accept", tripId: selectedRequest.id })}
          />
          <PrimaryButton
            label="Rechazar"
            variant="muted"
            disabled={actionMutation.isPending}
            onPress={() => actionMutation.mutate({ action: "reject", tripId: selectedRequest.id })}
          />
          {actionMutation.error ? <Text style={styles.error}>{apiMessage(actionMutation.error)}</Text> : null}
        </View>
      ) : null}

      <View style={styles.metrics}>
        <Metric label="Viajes completados" value={earnings.data?.completedTrips || 0} />
        <Metric label="Ganancias" value={`Bs ${earnings.data?.grossEarnings || 0}`} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Historial</Text>
        {(history.data?.items || []).slice(0, 8).map((trip) => (
          <Text key={trip.id} style={styles.item}>
            {trip.status} · Bs {trip.final_fare || trip.estimated_fare} · {new Date(trip.requested_at).toLocaleDateString()}
          </Text>
        ))}
        {!history.data?.items?.length ? <Text style={styles.item}>Sin viajes registrados.</Text> : null}
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
  map: { height: 230, borderRadius: 8, marginTop: 16 },
  panel: { marginTop: 16, backgroundColor: "#ffffff", borderRadius: 8, borderWidth: 1, borderColor: "#d4d4d4", padding: 14 },
  sectionTitle: { color: "#171717", fontSize: 16, fontWeight: "800", marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  item: { color: "#525252", marginTop: 7 },
  muted: { color: "#737373", marginTop: 3, fontSize: 12 },
  error: { color: "#b45309", marginTop: 8, fontWeight: "700" },
  request: { borderTopWidth: 1, borderTopColor: "#e7e5e4", paddingTop: 10, paddingBottom: 8, marginTop: 10 },
  requestActive: { backgroundColor: "#f0fdfa", borderRadius: 8, paddingHorizontal: 8, borderTopColor: "#ccfbf1" },
  metrics: { flexDirection: "row", flexWrap: "wrap", marginTop: 12, marginHorizontal: -4 }
});
