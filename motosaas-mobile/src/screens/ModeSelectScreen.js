import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { modeLabels } from "../config/roles";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../providers/AuthProvider";

export function ModeSelectScreen() {
  const { availableModes, logout, session, setActiveMode } = useAuth();

  return (
    <View style={styles.screen}>
      <View style={styles.panel}>
        <Text style={styles.title}>Elegir modo</Text>
        <Text style={styles.subtitle}>{session?.user?.full_name || session?.user?.email}</Text>

        {availableModes.map((mode) => (
          <PrimaryButton key={mode} label={modeLabels[mode] || mode} onPress={() => setActiveMode(mode)} />
        ))}

        <PrimaryButton label="Salir" onPress={logout} variant="muted" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#f5f5f4",
    padding: 20
  },
  panel: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d4d4d4",
    padding: 18
  },
  title: {
    color: "#171717",
    fontSize: 24,
    fontWeight: "800"
  },
  subtitle: {
    color: "#737373",
    marginTop: 4,
    marginBottom: 12
  }
});
