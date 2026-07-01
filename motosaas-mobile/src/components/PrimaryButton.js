import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

export function PrimaryButton({ label, onPress, disabled, variant = "primary" }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "muted" ? styles.muted : styles.primary,
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null
      ]}
    >
      <Text style={[styles.text, variant === "muted" ? styles.mutedText : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    marginTop: 10
  },
  primary: {
    backgroundColor: "#0f766e"
  },
  muted: {
    backgroundColor: "#f5f5f4",
    borderWidth: 1,
    borderColor: "#d4d4d4"
  },
  pressed: {
    opacity: 0.86
  },
  disabled: {
    opacity: 0.55
  },
  text: {
    color: "#ffffff",
    fontWeight: "700"
  },
  mutedText: {
    color: "#171717"
  }
});
