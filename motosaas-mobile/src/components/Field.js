import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

export function Field({ label, value, onChangeText, keyboardType = "default", secureTextEntry, placeholder }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder || label}
        secureTextEntry={secureTextEntry}
        style={styles.input}
        value={String(value ?? "")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginTop: 10
  },
  label: {
    color: "#525252",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4
  },
  input: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#d4d4d4",
    borderRadius: 8,
    paddingHorizontal: 10,
    color: "#171717"
  }
});
