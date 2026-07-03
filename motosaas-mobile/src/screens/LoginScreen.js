import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  Scooter,
  User,
  UserPlus
} from "lucide-react-native";
import { env } from "../config/env";
import { useAuth } from "../providers/AuthProvider";

const colors = {
  primary: "#0F8B7A",
  primaryDark: "#087263",
  background: "#F7F8FA",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  success: "#10B981",
  white: "#FFFFFF"
};

const tabs = [
  ["login", "Ingresar"],
  ["register", "Registro"],
  ["forgot", "Recuperar"]
];

const initialLoginForm = env.testLogin.credentials;
const initialRegisterForm = {
  associationSlug: env.testLogin.credentials.associationSlug,
  fullName: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: ""
};
const initialForgotForm = {
  associationSlug: env.testLogin.credentials.associationSlug,
  email: ""
};

function apiMessage(error, fallback) {
  return error?.response?.data?.error?.message || error?.message || fallback;
}

function AuthInput({
  autoCapitalize = "none",
  Icon,
  keyboardType = "default",
  onChangeText,
  onToggleSecure,
  placeholder,
  secureTextEntry,
  showSecureToggle = false,
  value,
  visiblePassword = false
}) {
  const ToggleIcon = visiblePassword ? EyeOff : Eye;

  return (
    <View style={styles.inputWrap}>
      {Icon ? <Icon color={colors.primary} size={18} strokeWidth={2.3} /> : null}
      <TextInput
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        secureTextEntry={secureTextEntry && !visiblePassword}
        style={styles.input}
        value={value}
      />
      {showSecureToggle ? (
        <Pressable hitSlop={10} onPress={onToggleSecure} style={styles.eyeButton}>
          <ToggleIcon color={colors.muted} size={18} strokeWidth={2.3} />
        </Pressable>
      ) : null}
    </View>
  );
}

function SubmitButton({ label, loading, onPress }) {
  return (
    <Pressable
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.submitButton, pressed ? styles.pressed : null, loading ? styles.disabled : null]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <>
          <Text style={styles.submitText}>{label}</Text>
          <View style={styles.submitIcon}>
            <ArrowRight color={colors.primary} size={18} strokeWidth={2.6} />
          </View>
        </>
      )}
    </Pressable>
  );
}

function AuthTabs({ activeView, onChange }) {
  return (
    <View style={styles.tabs}>
      {tabs.map(([key, label]) => {
        const isActive = activeView === key;

        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={({ pressed }) => [styles.tab, isActive ? styles.tabActive : null, pressed ? styles.pressed : null]}
          >
            <Text style={[styles.tabText, isActive ? styles.tabTextActive : null]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AuthHeader({ view, onBack }) {
  if (view === "login") {
    return (
      <View style={styles.loginHero}>
        <View style={styles.cloudLeft} />
        <View style={styles.cloudRight} />
        <View style={styles.cityRow}>
          <View style={[styles.cityBlock, styles.citySmall]} />
          <View style={[styles.cityBlock, styles.cityMedium]} />
          <View style={[styles.cityBlock, styles.cityTall]} />
          <View style={[styles.cityBlock, styles.cityMedium]} />
          <View style={[styles.cityBlock, styles.citySmall]} />
        </View>
        <View style={styles.logoIcon}>
          <Scooter color={colors.primary} size={54} strokeWidth={2.4} />
        </View>
        <Text style={styles.title}>MotoSaaS</Text>
        <Text style={styles.subtitle}>App movil</Text>
      </View>
    );
  }

  const isRegister = view === "register";

  return (
    <View style={styles.formHero}>
      <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}>
        <ArrowLeft color={colors.text} size={18} strokeWidth={2.5} />
      </Pressable>
      <View style={styles.largeIconCircle}>
        {isRegister ? (
          <UserPlus color={colors.primary} size={46} strokeWidth={2.2} />
        ) : (
          <View style={styles.lockHero}>
            <Lock color={colors.white} size={42} strokeWidth={2.4} />
            <View style={styles.helpBubble}>
              <CircleHelp color={colors.white} size={18} strokeWidth={2.5} />
            </View>
          </View>
        )}
      </View>
      <Text style={styles.formTitle}>{isRegister ? "Crear cuenta" : "Recuperar contrasena"}</Text>
      <Text style={styles.formSubtitle}>
        {isRegister
          ? "Completa tus datos para registrarte"
          : "Ingresa tu correo electronico y te enviaremos instrucciones para restablecer tu contrasena."}
      </Text>
    </View>
  );
}

function CheckRow({ checked, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.checkRow, pressed ? styles.pressed : null]}>
      <View style={[styles.checkbox, checked ? styles.checkboxActive : null]}>
        {checked ? <Check color={colors.white} size={13} strokeWidth={3} /> : null}
      </View>
      <Text style={styles.checkText}>{label}</Text>
    </Pressable>
  );
}

function SocialButtons() {
  return (
    <View style={styles.socialBlock}>
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>o continua con</Text>
        <View style={styles.divider} />
      </View>
      <View style={styles.socialRow}>
        <Pressable style={({ pressed }) => [styles.socialButton, pressed ? styles.pressed : null]}>
          <Text style={[styles.socialText, styles.googleText]}>G</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.socialButton, pressed ? styles.pressed : null]}>
          <Text style={[styles.socialText, styles.facebookText]}>f</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.socialButton, pressed ? styles.pressed : null]}>
          <Text style={[styles.socialText, styles.appleText]}>Apple</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function LoginScreen() {
  const { login, registerPassenger, requestPasswordRecovery } = useAuth();
  const [view, setView] = useState("login");
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [forgotForm, setForgotForm] = useState(initialForgotForm);
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loginPasswordVisible, setLoginPasswordVisible] = useState(false);
  const [registerPasswordVisible, setRegisterPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
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

    if (!acceptedTerms) {
      setError("Debes aceptar los Terminos y Condiciones.");
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { confirmPassword: _confirmPassword, ...payload } = registerForm;
      await registerPassenger(payload);
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
      setMessage(response.message || "Solicitud recibida. Revisa tu correo electronico.");
    } catch (requestError) {
      setError(apiMessage(requestError, "No se pudo enviar la solicitud."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <AuthHeader view={view} onBack={() => changeView("login")} />

          <View style={styles.panel}>
            <AuthTabs activeView={view} onChange={changeView} />

            {view === "login" ? (
              <View>
                <AuthInput
                  Icon={Mail}
                  keyboardType="email-address"
                  placeholder="Correo electronico"
                  value={loginForm.email}
                  onChangeText={(value) => updateLoginField("email", value)}
                />
                <AuthInput
                  Icon={Lock}
                  placeholder="Contrasena"
                  secureTextEntry
                  showSecureToggle
                  visiblePassword={loginPasswordVisible}
                  value={loginForm.password}
                  onChangeText={(value) => updateLoginField("password", value)}
                  onToggleSecure={() => setLoginPasswordVisible((current) => !current)}
                />
                <View style={styles.loginMetaRow}>
                  <CheckRow checked={rememberMe} label="Recordarme" onPress={() => setRememberMe((current) => !current)} />
                  <Pressable onPress={() => changeView("forgot")}>
                    <Text style={styles.inlineLink}>Olvidaste tu contrasena?</Text>
                  </Pressable>
                </View>
                <SubmitButton label="Ingresar" loading={isSubmitting} onPress={submitLogin} />
                <SocialButtons />
                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>No tienes cuenta?</Text>
                  <Pressable onPress={() => changeView("register")}>
                    <Text style={styles.footerLink}>Registrate</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {view === "register" ? (
              <View>
                <AuthInput
                  Icon={User}
                  autoCapitalize="words"
                  placeholder="Nombre completo"
                  value={registerForm.fullName}
                  onChangeText={(value) => updateRegisterField("fullName", value)}
                />
                <AuthInput
                  Icon={Phone}
                  keyboardType="phone-pad"
                  placeholder="Telefono"
                  value={registerForm.phone}
                  onChangeText={(value) => updateRegisterField("phone", value)}
                />
                <AuthInput
                  Icon={Mail}
                  keyboardType="email-address"
                  placeholder="Correo electronico"
                  value={registerForm.email}
                  onChangeText={(value) => updateRegisterField("email", value)}
                />
                <AuthInput
                  Icon={Lock}
                  placeholder="Contrasena"
                  secureTextEntry
                  showSecureToggle
                  visiblePassword={registerPasswordVisible}
                  value={registerForm.password}
                  onChangeText={(value) => updateRegisterField("password", value)}
                  onToggleSecure={() => setRegisterPasswordVisible((current) => !current)}
                />
                <AuthInput
                  Icon={Lock}
                  placeholder="Confirmar contrasena"
                  secureTextEntry
                  showSecureToggle
                  visiblePassword={confirmPasswordVisible}
                  value={registerForm.confirmPassword}
                  onChangeText={(value) => updateRegisterField("confirmPassword", value)}
                  onToggleSecure={() => setConfirmPasswordVisible((current) => !current)}
                />
                <CheckRow
                  checked={acceptedTerms}
                  label="Acepto los Terminos y Condiciones"
                  onPress={() => setAcceptedTerms((current) => !current)}
                />
                <SubmitButton label="Crear cuenta" loading={isSubmitting} onPress={submitRegister} />
                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>Ya tienes cuenta?</Text>
                  <Pressable onPress={() => changeView("login")}>
                    <Text style={styles.footerLink}>Inicia sesion</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {view === "forgot" ? (
              <View>
                <AuthInput
                  Icon={Mail}
                  keyboardType="email-address"
                  placeholder="Correo electronico"
                  value={forgotForm.email}
                  onChangeText={(value) => updateForgotField("email", value)}
                />
                <SubmitButton label="Enviar instrucciones" loading={isSubmitting} onPress={submitForgot} />
                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>Ya recordaste tu contrasena?</Text>
                  <Pressable onPress={() => changeView("login")}>
                    <Text style={styles.footerLink}>Inicia sesion</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 20
  },
  loginHero: {
    minHeight: 186,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
    paddingBottom: 18
  },
  cloudLeft: {
    position: "absolute",
    left: 16,
    top: 40,
    width: 54,
    height: 22,
    borderRadius: 12,
    backgroundColor: "#DFF3EF"
  },
  cloudRight: {
    position: "absolute",
    right: 20,
    top: 58,
    width: 48,
    height: 20,
    borderRadius: 12,
    backgroundColor: "#DFF3EF"
  },
  cityRow: {
    position: "absolute",
    left: 26,
    right: 26,
    bottom: 0,
    height: 66,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    opacity: 0.48
  },
  cityBlock: {
    width: 28,
    borderRadius: 5,
    backgroundColor: "#DFF3EF"
  },
  citySmall: {
    height: 24
  },
  cityMedium: {
    height: 42
  },
  cityTall: {
    height: 58
  },
  logoIcon: {
    width: 74,
    height: 64,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4
  },
  formHero: {
    minHeight: 204,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20
  },
  backButton: {
    position: "absolute",
    left: 2,
    top: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  largeIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#EAF8F5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12
  },
  lockHero: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.26,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4
  },
  helpBubble: {
    position: "absolute",
    right: -9,
    bottom: -7,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryDark,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center"
  },
  formTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900"
  },
  formSubtitle: {
    color: colors.muted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 6
  },
  panel: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 4
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 3,
    marginBottom: 14
  },
  tab: {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  tabActive: {
    backgroundColor: colors.primary
  },
  tabText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800"
  },
  tabTextActive: {
    color: colors.white
  },
  inputWrap: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 0,
    marginLeft: 10
  },
  eyeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center"
  },
  loginMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8
  },
  checkboxActive: {
    backgroundColor: colors.primary
  },
  checkText: {
    color: colors.text,
    fontSize: 13
  },
  inlineLink: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  submitButton: {
    minHeight: 52,
    borderRadius: 11,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    shadowColor: colors.primary,
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4
  },
  submitText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "900"
  },
  submitIcon: {
    position: "absolute",
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center"
  },
  socialBlock: {
    marginTop: 18
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border
  },
  dividerText: {
    color: colors.muted,
    fontSize: 12,
    marginHorizontal: 10
  },
  socialRow: {
    flexDirection: "row",
    marginTop: 14
  },
  socialButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4
  },
  socialText: {
    fontSize: 16,
    fontWeight: "900"
  },
  googleText: {
    color: "#EA4335"
  },
  facebookText: {
    color: "#1877F2",
    fontSize: 20
  },
  appleText: {
    color: colors.text,
    fontSize: 12
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18
  },
  footerText: {
    color: colors.muted,
    fontSize: 12,
    marginRight: 6
  },
  footerLink: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  error: {
    color: "#B45309",
    marginTop: 12,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center"
  },
  message: {
    color: colors.success,
    marginTop: 12,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center"
  },
  pressed: {
    opacity: 0.86
  },
  disabled: {
    opacity: 0.65
  }
});
