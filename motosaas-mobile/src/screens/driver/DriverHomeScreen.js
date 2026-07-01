import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Field } from "../../components/Field";
import { Metric } from "../../components/Metric";
import { PrimaryButton } from "../../components/PrimaryButton";
import { driversApi, reportsApi, tripsApi } from "../../api/resources";
import { useAuth } from "../../providers/AuthProvider";

export function DriverHomeScreen() {
  const { logout, session } = useAuth();
  const queryClient = useQueryClient();
  const [location, setLocation] = useState({ latitude: "-17.7833", longitude: "-63.1821" });
  const [available, setAvailable] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(false);

  const updateLocation = useMutation({
    mutationFn: () =>
      driversApi.updateLocation({
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        availabilityStatus: available ? "AVAILABLE" : "OFFLINE"
      })
  });

  useEffect(() => {
    if (!autoUpdate) return undefined;
    const timer = setInterval(() => updateLocation.mutate(), 15000);
    return () => clearInterval(timer);
  }, [autoUpdate, updateLocation]);

  const openTrips = useQuery({
    queryKey: ["open-trips"],
    queryFn: tripsApi.open,
    refetchInterval: 5000,
    enabled: available
  });

  const history = useQuery({
    queryKey: ["driver-history"],
    queryFn: () => tripsApi.history({ limit: 20 }),
    refetchInterval: 7000
  });

  const earnings = useQuery({ queryKey: ["driver-earnings"], queryFn: reportsApi.driverEarnings });

  const actionMutation = useMutation({
    mutationFn: ({ action, tripId }) => tripsApi[action](tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["open-trips"] });
      queryClient.invalidateQueries({ queryKey: ["driver-history"] });
      queryClient.invalidateQueries({ queryKey: ["driver-earnings"] });
    }
  });

  const finishMutation = useMutation({
    mutationFn: (tripId) => tripsApi.finish(tripId, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-history"] });
      queryClient.invalidateQueries({ queryKey: ["driver-earnings"] });
    }
  });

  const activeTrip = useMemo(
    () => (history.data?.items || []).find((trip) => ["ACCEPTED", "IN_PROGRESS"].includes(trip.status)),
    [history.data]
  );

  const region = {
    latitude: Number(location.latitude) || -17.7833,
    longitude: Number(location.longitude) || -63.1821,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Motociclista</Text>
          <Text style={styles.subtitle}>{session?.user?.email}</Text>
        </View>
        <PrimaryButton label="Salir" onPress={logout} variant="muted" />
      </View>

      <MapView style={styles.map} region={region}>
        <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} title="Mi ubicacion" />
      </MapView>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Disponibilidad</Text>
        <View style={styles.row}>
          <Text style={styles.item}>{available ? "Disponible" : "No disponible"}</Text>
          <Switch value={available} onValueChange={setAvailable} />
        </View>
        <View style={styles.row}>
          <Text style={styles.item}>Actualizacion automatica</Text>
          <Switch value={autoUpdate} onValueChange={setAutoUpdate} />
        </View>
        <Field label="Latitud" value={location.latitude} keyboardType="numeric" onChangeText={(value) => setLocation((current) => ({ ...current, latitude: value }))} />
        <Field label="Longitud" value={location.longitude} keyboardType="numeric" onChangeText={(value) => setLocation((current) => ({ ...current, longitude: value }))} />
        <PrimaryButton label="Actualizar ubicacion" onPress={() => updateLocation.mutate()} disabled={updateLocation.isPending} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Solicitudes pendientes</Text>
        {(openTrips.data || []).map((trip) => (
          <View key={trip.id} style={styles.request}>
            <Text style={styles.item}>Cliente: {trip.customer?.full_name || "-"}</Text>
            <Text style={styles.item}>Tarifa: Bs {trip.estimated_fare}</Text>
            <PrimaryButton label="Aceptar" disabled={!available} onPress={() => actionMutation.mutate({ action: "accept", tripId: trip.id })} />
            <PrimaryButton label="Rechazar" variant="muted" onPress={() => actionMutation.mutate({ action: "reject", tripId: trip.id })} />
          </View>
        ))}
        {!openTrips.data?.length ? <Text style={styles.item}>Sin solicitudes pendientes.</Text> : null}
      </View>

      {activeTrip ? (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Viaje activo</Text>
          <Text style={styles.item}>Estado: {activeTrip.status}</Text>
          <Text style={styles.item}>Cliente: {activeTrip.customer?.full_name || "-"}</Text>
          {activeTrip.status === "ACCEPTED" ? (
            <PrimaryButton label="Iniciar viaje" onPress={() => actionMutation.mutate({ action: "start", tripId: activeTrip.id })} />
          ) : null}
          {activeTrip.status === "IN_PROGRESS" ? (
            <PrimaryButton label="Finalizar viaje" onPress={() => finishMutation.mutate(activeTrip.id)} />
          ) : null}
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
            {trip.status} · Bs {trip.final_fare || trip.estimated_fare}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f5f4" },
  content: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: "#171717", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "#737373", marginTop: 2 },
  map: { height: 220, borderRadius: 8, marginTop: 16 },
  panel: { marginTop: 16, backgroundColor: "#ffffff", borderRadius: 8, borderWidth: 1, borderColor: "#d4d4d4", padding: 14 },
  sectionTitle: { color: "#171717", fontSize: 16, fontWeight: "800", marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  item: { color: "#525252", marginTop: 7 },
  request: { borderTopWidth: 1, borderTopColor: "#e7e5e4", paddingTop: 10, marginTop: 10 },
  metrics: { flexDirection: "row", flexWrap: "wrap", marginTop: 12, marginHorizontal: -4 }
});
