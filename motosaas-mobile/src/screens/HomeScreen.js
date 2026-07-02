import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AppModes, AppRoles } from "../config/roles";
import { useAuth } from "../providers/AuthProvider";
import { AssociationAdminHomeScreen } from "./admin/AssociationAdminHomeScreen";
import { CustomerHomeScreen } from "./customer/CustomerHomeScreen";
import { DriverHomeScreen } from "./driver/DriverHomeScreen";
import { ModeSelectScreen } from "./ModeSelectScreen";

export function HomeScreen() {
  const { activeMode, availableModes, session, isBooting } = useAuth();
  const role = session?.user?.role;

  if (isBooting) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0f766e" />
      </View>
    );
  }

  if (availableModes.length > 1 && !activeMode) {
    return <ModeSelectScreen />;
  }

  if (activeMode === AppModes.PASSENGER) {
    return <CustomerHomeScreen />;
  }

  if (activeMode === AppModes.DRIVER) {
    return <DriverHomeScreen />;
  }

  if (activeMode === AppModes.ASSOCIATION_ADMIN || role === AppRoles.ASSOCIATION_ADMIN) {
    return <AssociationAdminHomeScreen />;
  }

  return (
    <View style={styles.center}>
      <Text style={styles.text}>Rol no habilitado para la app movil.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f4",
    padding: 20
  },
  text: {
    color: "#171717",
    fontWeight: "700"
  }
});
