import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Field } from "../../components/Field";
import { Metric } from "../../components/Metric";
import { PrimaryButton } from "../../components/PrimaryButton";
import { faresApi, tripsApi } from "../../api/resources";
import { useAuth } from "../../providers/AuthProvider";

const terminalStatuses = ["COMPLETED", "CANCELED", "REJECTED"];

export function CustomerHomeScreen() {
  const { logout, session } = useAuth();
  const [origin, setOrigin] = useState({ latitude: "-17.7833", longitude: "-63.1821" });
  const [destination, setDestination] = useState({ latitude: "-17.7750", longitude: "-63.1950" });
  const [activeTripId, setActiveTripId] = useState(null);

  const estimateMutation = useMutation({
    mutationFn: () =>
      faresApi.estimate({
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
    onSuccess: (trip) => setActiveTripId(trip.id)
  });

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
    queryFn: () => tripsApi.history({ limit: 10 }),
    refetchInterval: activeTripId ? 10000 : false
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

  const trip = statusQuery.data || requestMutation.data;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Cliente</Text>
          <Text style={styles.subtitle}>{session?.user?.email}</Text>
        </View>
        <PrimaryButton label="Salir" onPress={logout} variant="muted" />
      </View>

      <MapView style={styles.map} initialRegion={region} region={region}>
        <Marker coordinate={{ latitude: Number(origin.latitude), longitude: Number(origin.longitude) }} title="Origen" />
        <Marker
          coordinate={{ latitude: Number(destination.latitude), longitude: Number(destination.longitude) }}
          pinColor="#b45309"
          title="Destino"
        />
      </MapView>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Ubicacion y destino</Text>
        <View style={styles.grid}>
          <Field label="Latitud origen" value={origin.latitude} keyboardType="numeric" onChangeText={(value) => setOrigin((current) => ({ ...current, latitude: value }))} />
          <Field label="Longitud origen" value={origin.longitude} keyboardType="numeric" onChangeText={(value) => setOrigin((current) => ({ ...current, longitude: value }))} />
          <Field label="Latitud destino" value={destination.latitude} keyboardType="numeric" onChangeText={(value) => setDestination((current) => ({ ...current, latitude: value }))} />
          <Field label="Longitud destino" value={destination.longitude} keyboardType="numeric" onChangeText={(value) => setDestination((current) => ({ ...current, longitude: value }))} />
        </View>
        <PrimaryButton label="Ver tarifa estimada" onPress={() => estimateMutation.mutate()} disabled={estimateMutation.isPending} />
        {estimateMutation.data ? (
          <View style={styles.metrics}>
            <Metric label="Distancia" value={`${estimateMutation.data.estimate.distanceKm} km`} />
            <Metric label="Tarifa" value={`Bs ${estimateMutation.data.estimate.total}`} />
          </View>
        ) : null}
        <PrimaryButton label="Solicitar viaje" onPress={() => requestMutation.mutate()} disabled={requestMutation.isPending || Boolean(activeTripId)} />
      </View>

      {trip ? (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Estado del viaje</Text>
          <Text style={styles.item}>Estado: {trip.status}</Text>
          <Text style={styles.item}>Tarifa estimada: Bs {trip.estimated_fare}</Text>
          {trip.driver ? <Text style={styles.item}>Motociclista: {trip.driver.full_name} · {trip.driver.phone || trip.driver.email}</Text> : <Text style={styles.item}>Motociclista: pendiente</Text>}
          {trip.vehicle ? <Text style={styles.item}>Vehiculo: {trip.vehicle.plate} {trip.vehicle.model || ""}</Text> : null}
          {terminalStatuses.includes(trip.status) ? (
            <PrimaryButton label="Finalizar flujo" onPress={() => setActiveTripId(null)} variant="muted" />
          ) : null}
        </View>
      ) : null}

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Historial</Text>
        {(historyQuery.data?.items || []).map((item) => (
          <Text key={item.id} style={styles.item}>
            {item.status} · Bs {item.final_fare || item.estimated_fare} · {new Date(item.requested_at).toLocaleDateString()}
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
  map: { height: 260, borderRadius: 8, marginTop: 16 },
  panel: { marginTop: 16, backgroundColor: "#ffffff", borderRadius: 8, borderWidth: 1, borderColor: "#d4d4d4", padding: 14 },
  sectionTitle: { color: "#171717", fontSize: 16, fontWeight: "800", marginBottom: 4 },
  grid: { marginTop: 2 },
  metrics: { flexDirection: "row", flexWrap: "wrap", marginTop: 10, marginHorizontal: -4 },
  item: { color: "#525252", marginTop: 7 }
});
