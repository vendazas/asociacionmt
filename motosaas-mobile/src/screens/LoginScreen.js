import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useAuth } from "../providers/AuthProvider";

const initialForm = {
  associationSlug: "platform",
  email: "admin@motosaas.local",
  password: "ChangeMe123!"
};

export function LoginScreen() {
  const { login } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit() {
    setError("");
    setIsSubmitting(true);

    try {
      await login(form);
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || "No se pudo iniciar sesion.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <View style={styles.panel}>
        <Text style={styles.title}>MotoSaaS</Text>
        <Text style={styles.subtitle}>Aplicacion movil</Text>

        <TextInput
          autoCapitalize="none"
          placeholder="Asociacion"
          style={styles.input}
          value={form.associationSlug}
          onChangeText={(value) => updateField("associationSlug", value)}
        />
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          style={styles.input}
          value={form.email}
          onChangeText={(value) => updateField("email", value)}
        />
        <TextInput
          placeholder="Password"
          secureTextEntry
          style={styles.input}
          value={form.password}
          onChangeText={(value) => updateField("password", value)}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          disabled={isSubmitting}
          onPress={submit}
          style={({ pressed }) => [
            styles.button,
            pressed ? styles.buttonPressed : null,
            isSubmitting ? styles.buttonDisabled : null
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Ingresar</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f5f5f4",
    justifyContent: "center",
    padding: 20
  },
  panel: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: "#d4d4d4"
  },
  title: {
    color: "#171717",
    fontSize: 28,
    fontWeight: "700"
  },
  subtitle: {
    color: "#737373",
    marginTop: 4,
    marginBottom: 20
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#d4d4d4",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    color: "#171717"
  },
  error: {
    color: "#b45309",
    marginBottom: 12
  },
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#0f766e"
  },
  buttonPressed: {
    backgroundColor: "#115e59"
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700"
  }
});
