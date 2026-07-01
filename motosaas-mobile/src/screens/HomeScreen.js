import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AppRoles } from "../config/roles";
import { useAuth } from "../providers/AuthProvider";
import { AssociationAdminHomeScreen } from "./admin/AssociationAdminHomeScreen";
import { CustomerHomeScreen } from "./customer/CustomerHomeScreen";
import { DriverHomeScreen } from "./driver/DriverHomeScreen";

export function HomeScreen() {
  const { session, isBooting } = useAuth();
  const role = session?.user?.role;

  if (isBooting) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0f766e" />
      </View>
    );
  }

  if (role === AppRoles.CUSTOMER) {
    return <CustomerHomeScreen />;
  }

  if (role === AppRoles.DRIVER) {
    return <DriverHomeScreen />;
  }

  if (role === AppRoles.ASSOCIATION_ADMIN) {
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
