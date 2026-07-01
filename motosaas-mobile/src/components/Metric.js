import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value ?? "-"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metric: {
    flex: 1,
    minWidth: 120,
    borderWidth: 1,
    borderColor: "#d4d4d4",
    borderRadius: 8,
    padding: 10,
    margin: 4,
    backgroundColor: "#ffffff"
  },
  label: {
    color: "#737373",
    fontSize: 12
  },
  value: {
    color: "#171717",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 3
  }
});
