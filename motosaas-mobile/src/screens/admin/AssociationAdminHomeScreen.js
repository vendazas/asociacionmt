import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Metric } from "../../components/Metric";
import { PrimaryButton } from "../../components/PrimaryButton";
import { driversApi, reportsApi } from "../../api/resources";
import { useAuth } from "../../providers/AuthProvider";

export function AssociationAdminHomeScreen() {
  const { logout, session } = useAuth();
  const today = useQuery({ queryKey: ["mobile-admin-today"], queryFn: reportsApi.today, refetchInterval: 10000 });
  const drivers = useQuery({ queryKey: ["mobile-admin-drivers"], queryFn: () => driversApi.list({ limit: 50 }), refetchInterval: 10000 });

  const activeDrivers = (drivers.data || []).filter((driver) =>
    ["AVAILABLE", "BUSY"].includes(driver.driver_profile?.availability_status)
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Admin Asociacion</Text>
          <Text style={styles.subtitle}>{session?.user?.email}</Text>
        </View>
        <PrimaryButton label="Salir" onPress={logout} variant="muted" />
      </View>

      <View style={styles.metrics}>
        <Metric label="Conductores activos" value={today.data?.activeDrivers ?? activeDrivers.length} />
        <Metric label="Viajes del dia" value={today.data?.tripsToday || 0} />
        <Metric label="Ingresos del dia" value={`Bs ${today.data?.incomeToday || 0}`} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Conductores activos</Text>
        {activeDrivers.map((driver) => (
          <Text key={driver.id} style={styles.item}>
            {driver.full_name} · {driver.driver_profile?.availability_status || "-"}
          </Text>
        ))}
        {!activeDrivers.length ? <Text style={styles.item}>Sin conductores activos.</Text> : null}
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
  metrics: { flexDirection: "row", flexWrap: "wrap", marginTop: 16, marginHorizontal: -4 },
  panel: { marginTop: 16, backgroundColor: "#ffffff", borderRadius: 8, borderWidth: 1, borderColor: "#d4d4d4", padding: 14 },
  sectionTitle: { color: "#171717", fontSize: 16, fontWeight: "800", marginBottom: 4 },
  item: { color: "#525252", marginTop: 7 }
});
