import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  CircleCheckBig,
  CreditCard,
  Headphones,
  History,
  House,
  LogOut,
  Route,
  Scooter,
  SendHorizontal,
  Star,
  User,
  X
} from "lucide-react-native";
import { AppModes, modeLabels } from "../../config/roles";
import { ratingsApi, tripsApi } from "../../api/resources";
import { useAuth } from "../../providers/AuthProvider";

const terminalStatuses = ["TRIP_FINISHED", "TRIP_CANCELLED", "REJECTED", "EXPIRED"];
const activeStatuses = ["REQUESTED", "SEARCHING_DRIVER", "DRIVER_ASSIGNED", "DRIVER_ARRIVING", "TRIP_STARTED"];

const colors = {
  primary: "#0F8B7A",
  primaryDark: "#087263",
  background: "#F7F8FA",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  danger: "#EF476F",
  white: "#FFFFFF"
};

const UI_SCALE = 0.75;
const ICON_STROKE = 2.35;
const SCALABLE_STYLE_PROPS = new Set([
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "top",
  "right",
  "bottom",
  "left",
  "fontSize",
  "lineHeight",
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "marginHorizontal",
  "marginVertical",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "paddingHorizontal",
  "paddingVertical",
  "shadowRadius",
  "elevation"
]);

function scaleValue(prop, value) {
  if (typeof value !== "number" || !SCALABLE_STYLE_PROPS.has(prop)) {
    return value;
  }

  const scaled = value * UI_SCALE;

  if (prop === "fontSize") {
    return Math.max(10, Math.round(scaled));
  }

  if (prop === "lineHeight") {
    return Math.max(12, Math.round(scaled));
  }

  return Math.round(scaled);
}

function compactStyles(styleMap) {
  return Object.fromEntries(
    Object.entries(styleMap).map(([styleName, style]) => [
      styleName,
      Object.fromEntries(
        Object.entries(style).map(([prop, value]) => {
          if (value && typeof value === "object" && !Array.isArray(value)) {
            return [
              prop,
              Object.fromEntries(
                Object.entries(value).map(([nestedProp, nestedValue]) => [nestedProp, scaleValue(nestedProp, nestedValue)])
              )
            ];
          }

          return [prop, scaleValue(prop, value)];
        })
      )
    ])
  );
}

function iconSize(value) {
  return Math.round(value * UI_SCALE);
}

function apiMessage(error) {
  const message = error?.response?.data?.error?.message || error?.message || "No se pudo completar la operacion.";

  if (message.includes("No active fare config")) {
    return "La asociacion aun no tiene una tarifa activa configurada.";
  }

  if (message.includes("outside active coverage zones")) {
    return "Tu origen esta fuera de las zonas activas de cobertura.";
  }

  return message;
}

function stageTitle(status) {
  const labels = {
    REQUESTED: "Solicitud creada",
    SEARCHING_DRIVER: "Buscando mototaxista",
    DRIVER_ASSIGNED: "Mototaxista asignado",
    DRIVER_ARRIVING: "Mototaxista en camino",
    TRIP_STARTED: "Viaje en curso",
    TRIP_FINISHED: "Viaje finalizado",
    TRIP_CANCELLED: "Viaje cancelado",
    REJECTED: "Solicitud rechazada",
    EXPIRED: "Solicitud expirada"
  };

  return labels[status] || "Estado del viaje";
}

function coordinateFromEvent(event) {
  return event.nativeEvent.coordinate;
}

function getUserName(user) {
  const fullName = user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(" ");

  if (fullName) {
    return fullName;
  }

  if (user?.email) {
    return user.email.split("@")[0];
  }

  return "Pasajero";
}

function getInitials(user) {
  const parts = getUserName(user).split(" ").filter(Boolean);

  if (parts.length > 1) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return getUserName(user).slice(0, 2).toUpperCase();
}

function formatMoney(value) {
  const amount = Number(value || 0);
  return `Bs ${amount.toFixed(2)}`;
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  try {
    return date.toLocaleString("es-BO", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (_error) {
    return date.toLocaleString();
  }
}

function getEstimatePayload(data) {
  return data?.estimate || data || {};
}

function estimateTotal(data) {
  const estimate = getEstimatePayload(data);
  return Number(estimate.total ?? estimate.estimatedFare ?? estimate.estimated_fare ?? 0);
}

function estimateDistance(data) {
  const estimate = getEstimatePayload(data);
  return Number(estimate.distanceKm ?? estimate.distance_km ?? estimate.estimated_distance_km ?? 0);
}

function estimateDuration(distanceKm) {
  if (!distanceKm) {
    return 0;
  }

  return Math.max(5, Math.round(distanceKm * 3));
}

function estimateRange(data) {
  const total = estimateTotal(data);

  if (!total) {
    return "Pendiente";
  }

  return `${formatMoney(total)} - ${formatMoney(total * 1.12)}`;
}

function pointLabel(point, fallback) {
  if (point?.address) {
    return point.address;
  }

  return fallback;
}

function pointMeta(point) {
  const latitude = Number(point?.latitude);
  const longitude = Number(point?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return "Toca el mapa para ajustar";
  }

  return `Mapa seleccionado`;
}

function tripAmount(trip) {
  return formatMoney(trip?.final_fare || trip?.estimated_fare || 0);
}

function tripRoute(trip) {
  const origin = pointLabel(trip?.origin, "Origen");
  const destination = pointLabel(trip?.destination, "Destino");
  return `${origin} -> ${destination}`;
}

export function CustomerHomeScreen() {
  const { activeMode, availableModes, logout, session, setActiveMode } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("home");
  const [pointMode, setPointMode] = useState("origin");
  const [origin, setOrigin] = useState({ latitude: "-17.7833", longitude: "-63.1821" });
  const [destination, setDestination] = useState({ latitude: "-17.7750", longitude: "-63.1950" });
  const [activeTripId, setActiveTripId] = useState(null);
  const [ratingTrip, setRatingTrip] = useState(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [ratedTripIds, setRatedTripIds] = useState([]);

  const estimateMutation = useMutation({
    mutationFn: () =>
      tripsApi.estimate({
        originLatitude: Number(origin.latitude),
        originLongitude: Number(origin.longitude),
        destinationLatitude: Number(destination.latitude),
        destinationLongitude: Number(destination.longitude)
      })
  });

  const requestMutation = useMutation({
    mutationFn: () =>
      tripsApi.request({
        originLatitude: Number(origin.latitude),
        originLongitude: Number(origin.longitude),
        destinationLatitude: Number(destination.latitude),
        destinationLongitude: Number(destination.longitude),
        originAddress: "Ubicacion actual",
        destinationAddress: "Destino seleccionado"
      }),
    onSuccess: (trip) => {
      setActiveTripId(trip.id);
      queryClient.invalidateQueries({ queryKey: ["customer-history"] });
    }
  });

  const currentTripQuery = useQuery({
    queryKey: ["current-trip"],
    queryFn: tripsApi.current,
    refetchInterval: activeTripId ? false : 10000
  });

  useEffect(() => {
    if (!activeTripId && currentTripQuery.data?.customer_user_id === session?.user?.id) {
      setActiveTripId(currentTripQuery.data.id);
    }
  }, [activeTripId, currentTripQuery.data?.customer_user_id, currentTripQuery.data?.id, session?.user?.id]);

  const statusQuery = useQuery({
    queryKey: ["trip-status", activeTripId],
    queryFn: () => tripsApi.status(activeTripId),
    enabled: Boolean(activeTripId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && terminalStatuses.includes(status) ? false : 5000;
    }
  });

  const historyQuery = useQuery({
    queryKey: ["customer-history"],
    queryFn: () => tripsApi.history({ limit: 12 }),
    refetchInterval: activeTripId ? 12000 : false
  });

  const cancelMutation = useMutation({
    mutationFn: (tripId) => tripsApi.cancel(tripId, { reason: "Cancelado por pasajero" }),
    onSuccess: (trip) => {
      queryClient.setQueryData(["trip-status", trip.id], trip);
      queryClient.invalidateQueries({ queryKey: ["customer-history"] });
      queryClient.invalidateQueries({ queryKey: ["current-trip"] });
    }
  });

  const ratingMutation = useMutation({
    mutationFn: () =>
      ratingsApi.create({
        tripId: ratingTrip.id,
        ratedUserId: ratingTrip.driver_user_id,
        score: ratingScore,
        comment: ratingComment
      }),
    onSuccess: () => {
      setRatedTripIds((current) => [...current, ratingTrip.id]);
      setRatingTrip(null);
      setRatingComment("");
      queryClient.invalidateQueries({ queryKey: ["customer-history"] });
    }
  });

  const region = useMemo(
    () => ({
      latitude: Number(origin.latitude) || -17.7833,
      longitude: Number(origin.longitude) || -63.1821,
      latitudeDelta: 0.045,
      longitudeDelta: 0.045
    }),
    [origin.latitude, origin.longitude]
  );

  const currentPassengerTrip =
    currentTripQuery.data?.customer_user_id === session?.user?.id ? currentTripQuery.data : null;
  const trip = cancelMutation.data || statusQuery.data || requestMutation.data || currentPassengerTrip;
  const isTerminal = trip?.status ? terminalStatuses.includes(trip.status) : false;
  const isActive = trip?.status ? activeStatuses.includes(trip.status) : false;
  const isTripLoading = Boolean(activeTripId && !trip);
  const hasBlockingTrip = Boolean(activeTripId || (trip && !isTerminal));
  const isTripStarted = trip?.status === "TRIP_STARTED";
  const canCancelTrip = Boolean(trip && !isTerminal && !isTripStarted);
  const distanceKm = estimateDistance(estimateMutation.data);
  const durationMin = estimateDuration(distanceKm);
  const userName = getUserName(session?.user);

  function canRateDriverForTrip(candidateTrip) {
    return Boolean(
      candidateTrip?.status === "TRIP_FINISHED" &&
      candidateTrip.driver_user_id &&
      candidateTrip.driver_user_id !== session?.user?.id &&
      !ratedTripIds.includes(candidateTrip.id)
    );
  }

  const canRateTrip = canRateDriverForTrip(trip);

  function resetEstimate() {
    if (estimateMutation.data || estimateMutation.error) {
      estimateMutation.reset();
    }
  }

  function setPointFromMap(event) {
    if (hasBlockingTrip) {
      return;
    }

    const coordinate = coordinateFromEvent(event);
    const nextPoint = {
      latitude: coordinate.latitude.toFixed(6),
      longitude: coordinate.longitude.toFixed(6)
    };

    resetEstimate();

    if (pointMode === "origin") {
      setOrigin(nextPoint);
    } else {
      setDestination(nextPoint);
    }
  }

  function choosePoint(mode) {
    setPointMode(mode);
    setActiveTab("home");
  }

  function handlePrimaryRequest() {
    if (hasBlockingTrip || isActive || requestMutation.isPending) {
      return;
    }

    if (!estimateMutation.data) {
      estimateMutation.mutate();
      return;
    }

    requestMutation.mutate();
  }

  function finishVisibleFlow() {
    setActiveTripId(null);
    requestMutation.reset();
    cancelMutation.reset();
    queryClient.removeQueries({ queryKey: ["trip-status"] });
    queryClient.invalidateQueries({ queryKey: ["current-trip"] });
    queryClient.invalidateQueries({ queryKey: ["customer-history"] });
  }

  const historyItems = historyQuery.data?.items || [];
  const user = session?.user || {};

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appShell}>
        <View style={styles.body}>
          {activeTab === "home" ? (
            <View style={styles.homeScreen}>
              <MapView style={styles.fullMap} initialRegion={region} region={region} onPress={setPointFromMap}>
                <Marker coordinate={{ latitude: Number(origin.latitude), longitude: Number(origin.longitude) }} title="Origen">
                  <View style={styles.currentMarkerHalo}>
                    <View style={styles.currentMarkerDot} />
                  </View>
                </Marker>
                <Marker
                  coordinate={{ latitude: Number(destination.latitude), longitude: Number(destination.longitude) }}
                  title="Destino"
                />
              </MapView>

              <ScrollView style={styles.homeSheet} contentContainerStyle={styles.homeSheetContent} showsVerticalScrollIndicator={false}>
                <View style={styles.sheetHandle} />

                {!hasBlockingTrip ? (
                  <>
                    <View style={styles.routeCard}>
                      <PointRow
                        active={pointMode === "origin"}
                        color={colors.danger}
                        title="Origen"
                        subtitle={pointMode === "origin" ? "Toca el mapa para ajustar el origen" : pointMeta(origin)}
                        onPress={() => choosePoint("origin")}
                      />
                      <View style={styles.routeDivider} />
                      <PointRow
                        active={pointMode === "destination"}
                        color={colors.primary}
                        title="Destino"
                        subtitle={pointMode === "destination" ? "Toca el mapa para ajustar el destino" : pointMeta(destination)}
                        onPress={() => choosePoint("destination")}
                      />
                    </View>

                    <View style={styles.fareCard}>
                      <View style={styles.fareIconWrap}>
                        <Route color={colors.white} size={iconSize(24)} strokeWidth={ICON_STROKE} />
                      </View>
                      <View style={styles.fareCopy}>
                        <Text style={styles.fareLabel}>Tarifa estimada</Text>
                        <Text style={styles.fareValue}>{estimateRange(estimateMutation.data)}</Text>
                        <Text style={styles.fareMeta}>
                          {distanceKm ? `${distanceKm.toFixed(1)} km` : "Calcula antes de solicitar"}
                          {durationMin ? `  ·  ${durationMin} min` : ""}
                        </Text>
                      </View>
                      <Pressable
                        disabled={estimateMutation.isPending}
                        onPress={() => estimateMutation.mutate()}
                        style={({ pressed }) => [
                          styles.fareButton,
                          pressed ? styles.pressed : null,
                          estimateMutation.isPending ? styles.disabled : null
                        ]}
                      >
                        {estimateMutation.isPending ? (
                          <ActivityIndicator color={colors.white} />
                        ) : (
                          <Text style={styles.fareButtonText}>Calcular</Text>
                        )}
                      </Pressable>
                    </View>

                    {estimateMutation.error ? <Text style={styles.error}>{apiMessage(estimateMutation.error)}</Text> : null}
                    {requestMutation.error ? <Text style={styles.error}>{apiMessage(requestMutation.error)}</Text> : null}

                    <Pressable
                      disabled={requestMutation.isPending}
                      onPress={handlePrimaryRequest}
                      style={({ pressed }) => [
                        styles.primaryButton,
                        pressed ? styles.pressed : null,
                        requestMutation.isPending ? styles.disabled : null
                      ]}
                    >
                      {requestMutation.isPending ? (
                        <ActivityIndicator color={colors.white} />
                      ) : (
                        <>
                          <Scooter color={colors.white} size={iconSize(21)} strokeWidth={ICON_STROKE} />
                          <Text style={styles.primaryButtonText}>Solicitar viaje</Text>
                        </>
                      )}
                    </Pressable>
                  </>
                ) : null}

                {isTripLoading ? (
                  <View style={styles.tripCard}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={styles.tripLoadingText}>Cargando datos del viaje...</Text>
                  </View>
                ) : null}

                {trip ? (
                  <View style={styles.tripCard}>
                    <View style={styles.tripHeader}>
                      <View>
                        <Text style={styles.tripTitle}>{stageTitle(trip.status)}</Text>
                        <Text style={styles.tripSubtitle}>Estado: {stageTitle(trip.status)}</Text>
                      </View>
                      <Text style={styles.tripAmount}>{tripAmount(trip)}</Text>
                    </View>
                    <View style={styles.tripRouteBox}>
                      <Text style={styles.tripRouteText}>{tripRoute(trip)}</Text>
                      {trip.driver ? (
                        <Text style={styles.tripMeta}>
                          Mototaxista: {trip.driver.full_name} · {trip.driver.phone || trip.driver.email}
                        </Text>
                      ) : (
                        <Text style={styles.tripMeta}>Mototaxista pendiente</Text>
                      )}
                      {trip.vehicle ? <Text style={styles.tripMeta}>Moto: {trip.vehicle.plate} {trip.vehicle.model || ""}</Text> : null}
                    </View>
                    {canCancelTrip || canRateTrip || isTerminal ? (
                      <View style={styles.tripActions}>
                        {canCancelTrip ? (
                          <SmallActionButton
                            Icon={X}
                            label="Cancelar"
                            muted
                            loading={cancelMutation.isPending}
                            onPress={() => cancelMutation.mutate(trip.id)}
                          />
                        ) : null}
                        {canRateTrip ? (
                          <SmallActionButton Icon={Star} label="Calificar" onPress={() => setRatingTrip(trip)} />
                        ) : null}
                        {isTerminal ? (
                          <SmallActionButton Icon={CircleCheckBig} label="Finalizar" muted onPress={finishVisibleFlow} />
                        ) : null}
                      </View>
                    ) : null}
                    {cancelMutation.error ? <Text style={styles.error}>{apiMessage(cancelMutation.error)}</Text> : null}
                  </View>
                ) : null}

                {ratingTrip ? (
                  <View style={styles.ratingCard}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.sectionTitle}>Calificacion</Text>
                      <Pressable onPress={() => setRatingTrip(null)}>
                        <X color={colors.muted} size={iconSize(20)} strokeWidth={ICON_STROKE} />
                      </Pressable>
                    </View>
                    <View style={styles.ratingRow}>
                      {[1, 2, 3, 4, 5].map((score) => (
                        <Pressable
                          key={score}
                          onPress={() => setRatingScore(score)}
                          style={[styles.scoreButton, ratingScore === score ? styles.scoreActive : null]}
                        >
                          <Star
                            color={ratingScore >= score ? "#F59E0B" : colors.muted}
                            fill={ratingScore >= score ? "#F59E0B" : "transparent"}
                            size={iconSize(20)}
                            strokeWidth={ICON_STROKE}
                          />
                        </Pressable>
                      ))}
                    </View>
                    <Pressable
                      onPress={() => setRatingComment(ratingComment ? "" : "Buen servicio")}
                      style={styles.commentButton}
                    >
                      <Text style={styles.commentText}>{ratingComment || "Agregar comentario rapido"}</Text>
                    </Pressable>
                    {ratingMutation.error ? <Text style={styles.error}>{apiMessage(ratingMutation.error)}</Text> : null}
                    <SmallActionButton
                      Icon={SendHorizontal}
                      label="Enviar calificacion"
                      loading={ratingMutation.isPending}
                      onPress={() => ratingMutation.mutate()}
                    />
                  </View>
                ) : null}
              </ScrollView>
            </View>
          ) : null}

          {activeTab === "trips" ? (
            <ScrollView style={styles.screen} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
              <View style={styles.pageHeader}>
                <Text style={styles.pageTitle}>Mis viajes</Text>
                <Text style={styles.pageSubtitle}>Historial de solicitudes y viajes realizados.</Text>
              </View>

              <View style={styles.historyCard}>
                {historyItems.map((item) => (
                  <Pressable key={item.id} style={styles.historyItem}>
                    <View style={styles.historyIcon}>
                      <CircleCheckBig color={colors.primary} size={iconSize(22)} strokeWidth={ICON_STROKE} />
                    </View>
                    <View style={styles.historyBody}>
                      <Text style={styles.historyRoute} numberOfLines={1}>{tripRoute(item)}</Text>
                      <Text style={styles.historyDate}>{formatDateTime(item.requested_at)}</Text>
                    </View>
                    <View style={styles.historyRight}>
                      <Text style={styles.historyAmount}>{tripAmount(item)}</Text>
                      <Text style={styles.historyStatus}>{stageTitle(item.status)}</Text>
                    </View>
                    <ChevronRight color="#9CA3AF" size={iconSize(18)} strokeWidth={ICON_STROKE} />
                  </Pressable>
                ))}

                {historyQuery.isLoading ? (
                  <View style={styles.emptyHistory}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : null}

                {!historyQuery.isLoading && !historyItems.length ? (
                  <View style={styles.emptyHistory}>
                    <History color={colors.muted} size={iconSize(30)} strokeWidth={ICON_STROKE} />
                    <Text style={styles.emptyHistoryText}>Aun no tienes viajes registrados.</Text>
                  </View>
                ) : null}
              </View>
            </ScrollView>
          ) : null}

          {activeTab === "account" ? (
            <ScrollView style={styles.screen} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
              <View style={styles.pageHeader}>
                <Text style={styles.pageTitle}>Cuenta</Text>
                <Text style={styles.pageSubtitle}>Datos del pasajero y accesos rapidos.</Text>
              </View>

              <View style={styles.accountCard}>
                <View style={styles.accountHeader}>
                  <View style={styles.accountAvatar}>
                    <Text style={styles.accountAvatarText}>{getInitials(user)}</Text>
                  </View>
                  <View style={styles.accountCopy}>
                    <Text style={styles.accountName} numberOfLines={1}>{userName}</Text>
                    <Text style={styles.accountRole}>Pasajero</Text>
                  </View>
                </View>

                <View style={styles.accountInfoRow}>
                  <Text style={styles.accountLabel}>Email</Text>
                  <Text style={styles.accountValue}>{user.email || "Sin email"}</Text>
                </View>
                <View style={styles.accountInfoRow}>
                  <Text style={styles.accountLabel}>Telefono</Text>
                  <Text style={styles.accountValue}>{user.phone || "Sin telefono"}</Text>
                </View>
                <View style={styles.accountInfoRow}>
                  <Text style={styles.accountLabel}>Rol del sistema</Text>
                  <Text style={styles.accountValue}>{user.role || "PASSENGER"}</Text>
                </View>
              </View>

              {availableModes.length > 1 ? (
                <View style={styles.modeSelector}>
                  {[AppModes.DRIVER, AppModes.PASSENGER]
                    .filter((mode) => availableModes.includes(mode))
                    .map((mode) => {
                      const isSelected = activeMode === mode;
                      const Icon = mode === AppModes.DRIVER ? Scooter : User;

                      return (
                        <Pressable
                          key={mode}
                          onPress={() => setActiveMode(mode)}
                          style={({ pressed }) => [
                            styles.modeOption,
                            isSelected ? styles.modeOptionActive : null,
                            pressed ? styles.pressed : null
                          ]}
                        >
                          <Icon
                            color={isSelected ? colors.white : colors.text}
                            size={iconSize(18)}
                            strokeWidth={ICON_STROKE}
                          />
                          <Text style={[styles.modeText, isSelected ? styles.modeTextActive : null]}>
                            {modeLabels[mode]}
                          </Text>
                        </Pressable>
                      );
                    })}
                </View>
              ) : null}

              <View style={styles.accountMenu}>
                <AccountOption Icon={Star} title="Favoritos" subtitle="Lugares guardados" onPress={() => choosePoint("destination")} />
                <AccountOption Icon={CreditCard} title="Metodos de pago" subtitle="Tarjeta, efectivo" />
                <AccountOption Icon={Headphones} title="Soporte" subtitle="Ayuda rapida" />
              </View>

              <Pressable style={styles.logoutButton} onPress={logout}>
                <LogOut color={colors.primary} size={iconSize(18)} strokeWidth={ICON_STROKE} />
                <Text style={styles.logoutText}>Salir</Text>
              </Pressable>
            </ScrollView>
          ) : null}
        </View>

        <BottomNavigation activeTab={activeTab} onSelect={setActiveTab} />
      </View>
    </SafeAreaView>
  );
}

function PointRow({ active, color, onPress, subtitle, title }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pointRow, pressed ? styles.pressed : null]}>
      <View style={styles.pointRail}>
        <View style={[styles.pointDot, { backgroundColor: color }]} />
        {title === "Origen" ? <View style={styles.pointLine} /> : null}
      </View>
      <View style={styles.pointCopy}>
        <Text style={styles.pointTitle}>{title}</Text>
        <Text style={styles.pointSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight color={active ? colors.primary : colors.text} size={iconSize(20)} strokeWidth={ICON_STROKE} />
    </Pressable>
  );
}

function AccountOption({ Icon, onPress, subtitle, title }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.accountOption, pressed ? styles.pressed : null]}>
      <View style={styles.accountOptionIcon}>
        <Icon color={colors.primary} size={iconSize(22)} strokeWidth={ICON_STROKE} />
      </View>
      <View style={styles.accountOptionCopy}>
        <Text style={styles.accountOptionTitle}>{title}</Text>
        <Text style={styles.accountOptionSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight color="#9CA3AF" size={iconSize(18)} strokeWidth={ICON_STROKE} />
    </Pressable>
  );
}

function SmallActionButton({ Icon, label, loading, muted = false, onPress }) {
  return (
    <Pressable
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.smallActionButton,
        muted ? styles.smallActionMuted : null,
        pressed ? styles.pressed : null,
        loading ? styles.disabled : null
      ]}
    >
      {loading ? (
        <ActivityIndicator color={muted ? colors.primary : colors.white} />
      ) : (
        <>
          <Icon color={muted ? colors.primary : colors.white} size={iconSize(16)} strokeWidth={ICON_STROKE} />
          <Text style={[styles.smallActionText, muted ? styles.smallActionMutedText : null]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

function BottomNavigation({ activeTab, onSelect }) {
  return (
    <View style={styles.bottomNav}>
      <BottomNavItem active={activeTab === "home"} Icon={House} label="Inicio" onPress={() => onSelect("home")} />
      <BottomNavItem active={activeTab === "trips"} Icon={History} label="Mis viajes" onPress={() => onSelect("trips")} />
      <BottomNavItem active={activeTab === "account"} Icon={User} label="Cuenta" onPress={() => onSelect("account")} />
    </View>
  );
}

function BottomNavItem({ active = false, Icon, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.navItem, pressed ? styles.pressed : null]}>
      <Icon color={active ? colors.primary : colors.muted} size={iconSize(22)} strokeWidth={ICON_STROKE} />
      <Text style={[styles.navLabel, active ? styles.navLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create(compactStyles({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  appShell: {
    flex: 1,
    backgroundColor: colors.background
  },
  body: {
    flex: 1,
    backgroundColor: colors.background
  },
  homeScreen: {
    flex: 1,
    backgroundColor: colors.background
  },
  fullMap: {
    ...StyleSheet.absoluteFillObject
  },
  homeSheet: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    maxHeight: 430,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8
  },
  homeSheetContent: {
    padding: 12
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 10
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  pageContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 24
  },
  pageHeader: {
    marginBottom: 14
  },
  pageTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900"
  },
  pageSubtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 112
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 12
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  avatarText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "900"
  },
  profileCopy: {
    flex: 1
  },
  greeting: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "900"
  },
  headerSubtitle: {
    color: colors.text,
    fontSize: 14,
    marginTop: 2
  },
  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2
  },
  notificationDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#EF233C"
  },
  modeSelector: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 4,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  modeOption: {
    flex: 1,
    minHeight: 44,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  modeOptionActive: {
    backgroundColor: colors.primary
  },
  modeText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 8
  },
  modeTextActive: {
    color: colors.white
  },
  mapCard: {
    height: 260,
    borderRadius: 22,
    overflow: "hidden",
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white
  },
  map: {
    ...StyleSheet.absoluteFillObject
  },
  currentMarkerHalo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(37,99,235,0.13)",
    alignItems: "center",
    justifyContent: "center"
  },
  currentMarkerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    borderWidth: 3,
    borderColor: colors.white
  },
  mapActions: {
    position: "absolute",
    right: 14,
    top: 92
  },
  mapActionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: colors.text,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4
  },
  routeCard: {
    borderRadius: 18,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4
  },
  pointRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center"
  },
  pointRail: {
    width: 22,
    alignItems: "center",
    alignSelf: "stretch",
    paddingTop: 23
  },
  pointDot: {
    width: 9,
    height: 9,
    borderRadius: 5
  },
  pointLine: {
    width: 1,
    flex: 1,
    marginTop: 6,
    backgroundColor: "#D1D5DB"
  },
  pointCopy: {
    flex: 1,
    paddingHorizontal: 10
  },
  pointTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  pointSubtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4
  },
  routeDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 32
  },
  fareCard: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: "#EAF8F5",
    padding: 14,
    flexDirection: "row",
    alignItems: "center"
  },
  fareIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  fareCopy: {
    flex: 1,
    paddingRight: 10
  },
  fareLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800"
  },
  fareValue: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 4
  },
  fareMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3
  },
  fareButton: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14
  },
  fareButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "900"
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 13,
    marginTop: 14,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "900",
    marginLeft: 10
  },
  tripCard: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16
  },
  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  tripTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900"
  },
  tripSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4
  },
  tripAmount: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  tripRouteBox: {
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginTop: 12
  },
  tripRouteText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800"
  },
  tripMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 6
  },
  tripLoadingText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 10
  },
  tripActions: {
    flexDirection: "row",
    marginHorizontal: -4,
    marginTop: 12
  },
  quickGrid: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    paddingVertical: 14,
    shadowColor: colors.text,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 2
  },
  quickItem: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 5
  },
  quickIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EAF8F5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8
  },
  quickTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center"
  },
  quickSubtitle: {
    color: colors.muted,
    fontSize: 10,
    textAlign: "center",
    marginTop: 3
  },
  ratingCard: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900"
  },
  ratingRow: {
    flexDirection: "row",
    marginTop: 12
  },
  scoreButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8
  },
  scoreActive: {
    backgroundColor: "#FFF7ED",
    borderColor: "#F59E0B"
  },
  commentButton: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    paddingHorizontal: 12,
    marginTop: 12
  },
  commentText: {
    color: colors.muted,
    fontSize: 13
  },
  historySection: {
    marginTop: 22
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  viewAll: {
    flexDirection: "row",
    alignItems: "center"
  },
  viewAllText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900"
  },
  historyCard: {
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden"
  },
  historyItem: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  historyIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EAF8F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10
  },
  historyBody: {
    flex: 1,
    paddingRight: 8
  },
  historyRoute: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900"
  },
  historyDate: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4
  },
  historyAmount: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
    marginRight: 8
  },
  historyRight: {
    alignItems: "flex-end",
    marginRight: 6
  },
  historyStatus: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 3,
    maxWidth: 110,
    textAlign: "right"
  },
  emptyHistory: {
    minHeight: 92,
    alignItems: "center",
    justifyContent: "center",
    padding: 16
  },
  emptyHistoryText: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 8
  },
  smallActionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
    paddingHorizontal: 8
  },
  smallActionMuted: {
    backgroundColor: "#EAF8F5"
  },
  smallActionText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "900",
    marginLeft: 6
  },
  smallActionMutedText: {
    color: colors.primary
  },
  accountCard: {
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    shadowColor: colors.text,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 2
  },
  accountHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14
  },
  accountAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  accountAvatarText: {
    color: colors.white,
    fontSize: 19,
    fontWeight: "900"
  },
  accountCopy: {
    flex: 1
  },
  accountName: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "900"
  },
  accountRole: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 3
  },
  accountInfoRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 10
  },
  accountLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800"
  },
  accountValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 3
  },
  accountMenu: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden"
  },
  accountOption: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  accountOptionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EAF8F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  accountOptionCopy: {
    flex: 1
  },
  accountOptionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900"
  },
  accountOptionSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3
  },
  logoutButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#EAF8F5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16
  },
  logoutText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 8
  },
  bottomNav: {
    minHeight: 80,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -8 },
    elevation: 8
  },
  navItem: {
    flex: 1,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center"
  },
  navLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4
  },
  navLabelActive: {
    color: colors.primary
  },
  requestNavSlot: {
    width: 72,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 66
  },
  requestNavButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -26,
    shadowColor: colors.primary,
    shadowOpacity: 0.34,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8
  },
  requestNavLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 5
  },
  error: {
    color: "#B45309",
    marginTop: 10,
    fontSize: 13,
    fontWeight: "800"
  },
  pressed: {
    opacity: 0.86
  },
  disabled: {
    opacity: 0.55
  }
}));
