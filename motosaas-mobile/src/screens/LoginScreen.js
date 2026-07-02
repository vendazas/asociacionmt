import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { env } from "../config/env";
import { useAuth } from "../providers/AuthProvider";

const initialLoginForm = env.testLogin.credentials;
const initialRegisterForm = {
  associationSlug: env.testLogin.credentials.associationSlug,
  fullName: "",
  phone: "",
  email: "",
  password: ""
};
const initialForgotForm = {
  associationSlug: env.testLogin.credentials.associationSlug,
  email: ""
};

function apiMessage(error, fallback) {
  return error?.response?.data?.error?.message || error?.message || fallback;
}

function AuthInput({ value, onChangeText, placeholder, keyboardType = "default", secureTextEntry }) {
  return (
    <TextInput
      autoCapitalize="none"
      keyboardType={keyboardType}
      placeholder={placeholder}
      secureTextEntry={secureTextEntry}
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
    />
  );
}

function SubmitButton({ label, loading, onPress }) {
  return (
    <Pressable
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null, loading ? styles.buttonDisabled : null]}
    >
      {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>{label}</Text>}
    </Pressable>
  );
}

export function LoginScreen() {
  const { login, registerPassenger, requestPasswordRecovery } = useAuth();
  const [view, setView] = useState("login");
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [forgotForm, setForgotForm] = useState(initialForgotForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function changeView(nextView) {
    setView(nextView);
    setError("");
    setMessage("");
  }

  function updateLoginField(name, value) {
    setLoginForm((current) => ({ ...current, [name]: value }));
  }

  function updateRegisterField(name, value) {
    setRegisterForm((current) => ({ ...current, [name]: value }));
  }

  function updateForgotField(name, value) {
    setForgotForm((current) => ({ ...current, [name]: value }));
  }

  async function submitLogin() {
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      await login(loginForm);
    } catch (requestError) {
      setError(apiMessage(requestError, "No se pudo iniciar sesion."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitRegister() {
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      await registerPassenger(registerForm);
    } catch (requestError) {
      setError(apiMessage(requestError, "No se pudo registrar el pasajero."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitForgot() {
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await requestPasswordRecovery(forgotForm);
      setMessage(response.message || "Solicitud recibida.");
    } catch (requestError) {
      setError(apiMessage(requestError, "No se pudo enviar la solicitud."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.panel}>
          <Text style={styles.title}>MotoSaaS</Text>
          <Text style={styles.subtitle}>App movil</Text>

          <View style={styles.tabs}>
            {[
              ["login", "Ingresar"],
              ["register", "Registro"],
              ["forgot", "Recuperar"]
            ].map(([key, label]) => (
              <Pressable
                key={key}
                onPress={() => changeView(key)}
                style={[styles.tab, view === key ? styles.tabActive : null]}
              >
                <Text style={[styles.tabText, view === key ? styles.tabTextActive : null]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          {view === "login" ? (
            <View>
              <AuthInput
                placeholder="Asociacion"
                value={loginForm.associationSlug}
                onChangeText={(value) => updateLoginField("associationSlug", value)}
              />
              <AuthInput
                keyboardType="email-address"
                placeholder="Email o usuario"
                value={loginForm.email}
                onChangeText={(value) => updateLoginField("email", value)}
              />
              <AuthInput
                placeholder="Contrasena"
                secureTextEntry
                value={loginForm.password}
                onChangeText={(value) => updateLoginField("password", value)}
              />
              <SubmitButton label="Ingresar" loading={isSubmitting} onPress={submitLogin} />
            </View>
          ) : null}

          {view === "register" ? (
            <View>
              <AuthInput
                placeholder="Asociacion"
                value={registerForm.associationSlug}
                onChangeText={(value) => updateRegisterField("associationSlug", value)}
              />
              <AuthInput
                placeholder="Nombre completo"
                value={registerForm.fullName}
                onChangeText={(value) => updateRegisterField("fullName", value)}
              />
              <AuthInput
                keyboardType="phone-pad"
                placeholder="Telefono"
                value={registerForm.phone}
                onChangeText={(value) => updateRegisterField("phone", value)}
              />
              <AuthInput
                keyboardType="email-address"
                placeholder="Email"
                value={registerForm.email}
                onChangeText={(value) => updateRegisterField("email", value)}
              />
              <AuthInput
                placeholder="Contrasena"
                secureTextEntry
                value={registerForm.password}
                onChangeText={(value) => updateRegisterField("password", value)}
              />
              <SubmitButton label="Crear pasajero" loading={isSubmitting} onPress={submitRegister} />
            </View>
          ) : null}

          {view === "forgot" ? (
            <View>
              <AuthInput
                placeholder="Asociacion"
                value={forgotForm.associationSlug}
                onChangeText={(value) => updateForgotField("associationSlug", value)}
              />
              <AuthInput
                keyboardType="email-address"
                placeholder="Email"
                value={forgotForm.email}
                onChangeText={(value) => updateForgotField("email", value)}
              />
              <SubmitButton label="Enviar solicitud" loading={isSubmitting} onPress={submitForgot} />
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f5f5f4"
  },
  content: {
    flexGrow: 1,
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
    marginBottom: 14
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#f5f5f4",
    borderRadius: 8,
    padding: 3,
    marginBottom: 14
  },
  tab: {
    flex: 1,
    minHeight: 38,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center"
  },
  tabActive: {
    backgroundColor: "#0f766e"
  },
  tabText: {
    color: "#525252",
    fontWeight: "700"
  },
  tabTextActive: {
    color: "#ffffff"
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
    marginTop: 12,
    fontWeight: "700"
  },
  message: {
    color: "#0f766e",
    marginTop: 12,
    fontWeight: "700"
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
