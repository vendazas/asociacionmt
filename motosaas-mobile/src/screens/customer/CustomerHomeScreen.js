import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
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
  Camera,
  ChevronRight,
  CircleCheckBig,
  CreditCard,
  Headphones,
  History,
  House,
  LocateFixed,
  LogOut,
  Menu,
  Navigation,
  Scooter,
  SendHorizontal,
  Star,
  User,
  X
} from "lucide-react-native";
import { AppModes, modeLabels } from "../../config/roles";
import { ratingsApi, tripsApi } from "../../api/resources";
import { useAuth } from "../../providers/AuthProvider";
import { useRealtimeTripRoom } from "../../providers/RealtimeProvider";

const terminalStatuses = ["TRIP_FINISHED", "TRIP_CANCELLED", "REJECTED", "EXPIRED"];
const activeStatuses = ["REQUESTED", "SEARCHING_DRIVER", "DRIVER_ASSIGNED", "DRIVER_ARRIVING", "TRIP_STARTED"];

const colors = {
  primary: "#0F9D8A",
  primaryDark: "#0F766E",
  background: "#F8FAFC",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  danger: "#EF4444",
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

function sameId(left, right) {
  return left !== undefined && left !== null && right !== undefined && right !== null && String(left) === String(right);
}

function statusRank(status) {
  const ranks = {
    REQUESTED: 1,
    SEARCHING_DRIVER: 2,
    DRIVER_ASSIGNED: 3,
    DRIVER_ARRIVING: 4,
    TRIP_STARTED: 5,
    TRIP_FINISHED: 6,
    TRIP_CANCELLED: 6,
    REJECTED: 6,
    EXPIRED: 6
  };

  return ranks[status] || 0;
}

function pickVisibleTrip(candidates) {
  return candidates.filter(Boolean).reduce((selected, candidate) => {
    if (!selected) {
      return candidate;
    }

    if (sameId(selected.id, candidate.id)) {
      return statusRank(candidate.status) >= statusRank(selected.status) ? candidate : selected;
    }

    return selected;
  }, null);
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
  const drawerProgress = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState("home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pointMode, setPointMode] = useState("origin");
  const [origin, setOrigin] = useState({ latitude: "-17.7833", longitude: "-63.1821" });
  const [destination, setDestination] = useState({ latitude: "-17.7750", longitude: "-63.1950" });
  const [activeTripId, setActiveTripId] = useState(null);
  const [ratingTrip, setRatingTrip] = useState(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [ratedTripIds, setRatedTripIds] = useState([]);

  useEffect(() => {
    Animated.timing(drawerProgress, {
      toValue: drawerOpen ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [drawerOpen, drawerProgress]);

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
    queryFn: tripsApi.current
  });

  useEffect(() => {
    if (!activeTripId && sameId(currentTripQuery.data?.customer_user_id, session?.user?.id)) {
      setActiveTripId(currentTripQuery.data.id);
    }
  }, [activeTripId, currentTripQuery.data?.customer_user_id, currentTripQuery.data?.id, session?.user?.id]);

  const statusQuery = useQuery({
    queryKey: ["trip-status", activeTripId],
    queryFn: () => tripsApi.status(activeTripId),
    enabled: Boolean(activeTripId)
  });

  const historyQuery = useQuery({
    queryKey: ["customer-history"],
    queryFn: () => tripsApi.history({ limit: 12 })
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

  const currentPassengerTrip = sameId(currentTripQuery.data?.customer_user_id, session?.user?.id) ? currentTripQuery.data : null;
  const trip = pickVisibleTrip([cancelMutation.data, statusQuery.data, currentPassengerTrip, requestMutation.data]);
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
  useRealtimeTripRoom(trip?.id || activeTripId);

  useEffect(() => {
    if (hasBlockingTrip) {
      return undefined;
    }

    const originLatitude = Number(origin.latitude);
    const originLongitude = Number(origin.longitude);
    const destinationLatitude = Number(destination.latitude);
    const destinationLongitude = Number(destination.longitude);

    if (
      !Number.isFinite(originLatitude) ||
      !Number.isFinite(originLongitude) ||
      !Number.isFinite(destinationLatitude) ||
      !Number.isFinite(destinationLongitude)
    ) {
      return undefined;
    }

    const timer = setTimeout(() => {
      estimateMutation.mutate();
    }, 450);

    return () => clearTimeout(timer);
  }, [
    destination.latitude,
    destination.longitude,
    hasBlockingTrip,
    origin.latitude,
    origin.longitude
  ]);

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

  function selectDrawerTab(tab) {
    setActiveTab(tab);
    setDrawerOpen(false);
  }

  function closeDrawer() {
    setDrawerOpen(false);
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
        <PassengerHeader activeTab={activeTab} onMenuPress={() => setDrawerOpen(true)} />

        <View style={styles.body}>
          {activeTab === "home" ? (
            <View style={styles.homeScreen}>
              <View style={styles.passengerMapPanel}>
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
                <MapFloatingButtons onCenter={() => {}} onLocate={() => {}} />
              </View>

              <BottomSheet>

                {!hasBlockingTrip ? (
                  <>
                    <RideLocationCard
                      destinationActive={pointMode === "destination"}
                      destinationSubtitle={pointMode === "destination" ? "Toca el mapa para ajustar el destino" : "A donde quieres ir?"}
                      onDestinationPress={() => choosePoint("destination")}
                      onOriginPress={() => choosePoint("origin")}
                      originActive={pointMode === "origin"}
                      originSubtitle={pointMode === "origin" ? "Toca el mapa para ajustar el origen" : "Ubicacion actual"}
                    />

                    <FareCard
                      distanceKm={distanceKm}
                      durationMin={durationMin}
                      estimateData={estimateMutation.data}
                      isEstimateLoading={estimateMutation.isPending}
                      onRequest={handlePrimaryRequest}
                      requestDisabled={!estimateMutation.data || estimateMutation.isPending || requestMutation.isPending}
                      requestPending={requestMutation.isPending}
                    />

                    {estimateMutation.error ? <Text style={styles.error}>{apiMessage(estimateMutation.error)}</Text> : null}
                    {requestMutation.error ? <Text style={styles.error}>{apiMessage(requestMutation.error)}</Text> : null}
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
              </BottomSheet>
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

        <PassengerDrawer
          activeMode={activeMode}
          activeTab={activeTab}
          availableModes={availableModes}
          drawerOpen={drawerOpen}
          progress={drawerProgress}
          user={user}
          userName={userName}
          onClose={closeDrawer}
          onLogout={logout}
          onSelect={selectDrawerTab}
          onSelectMode={setActiveMode}
        />
      </View>
    </SafeAreaView>
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

function passengerTitleFor(tab) {
  if (tab === "trips") {
    return "Mis viajes";
  }

  if (tab === "account") {
    return "Cuenta";
  }

  return "Pasajero";
}

function PassengerHeader({ activeTab, onMenuPress }) {
  return (
    <View style={styles.passengerHeaderBar}>
      <Pressable
        android_ripple={{ color: "rgba(15,157,138,0.12)" }}
        onPress={onMenuPress}
        style={({ pressed }) => [styles.passengerHeaderButton, pressed ? styles.pressed : null]}
      >
        <Menu color={colors.text} size={iconSize(28)} strokeWidth={ICON_STROKE} />
      </Pressable>

      <View style={styles.passengerHeaderCopy}>
        <Text style={styles.passengerHeaderTitle}>{passengerTitleFor(activeTab)}</Text>
        <Text style={styles.passengerHeaderSubtitle}>
          {activeTab === "home" ? "A donde vamos hoy?" : "Gestiona tus viajes y cuenta"}
        </Text>
      </View>

      <View style={styles.passengerHeaderAvatar}>
        <User color={colors.primary} size={iconSize(23)} strokeWidth={ICON_STROKE} />
      </View>
    </View>
  );
}

function MapFloatingButtons({ onCenter, onLocate }) {
  return (
    <View style={styles.mapFloatingButtons}>
      <Pressable
        android_ripple={{ color: "rgba(15,157,138,0.12)", borderless: true }}
        onPress={onLocate}
        style={({ pressed }) => [styles.mapFloatingButton, pressed ? styles.pressedScale : null]}
      >
        <LocateFixed color="#0F9D8A" size={iconSize(24)} strokeWidth={ICON_STROKE} />
      </Pressable>
      <Pressable
        android_ripple={{ color: "rgba(15,157,138,0.12)", borderless: true }}
        onPress={onCenter}
        style={({ pressed }) => [styles.mapFloatingButton, pressed ? styles.pressedScale : null]}
      >
        <Navigation color="#0F9D8A" size={iconSize(23)} strokeWidth={ICON_STROKE} />
      </Pressable>
    </View>
  );
}

function BottomSheet({ children }) {
  return (
    <ScrollView style={styles.homeSheet} contentContainerStyle={styles.homeSheetContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sheetHandle} />
      {children}
    </ScrollView>
  );
}

function RideLocationCard({
  destinationActive,
  destinationSubtitle,
  onDestinationPress,
  onOriginPress,
  originActive,
  originSubtitle
}) {
  return (
    <View style={styles.rideLocationCard}>
      <View style={styles.locationRail}>
        <View style={[styles.locationDot, styles.locationDotOrigin]} />
        <View style={styles.locationLine} />
        <View style={[styles.locationDot, styles.locationDotDestination]} />
      </View>

      <View style={styles.locationRows}>
        <LocationChoiceRow active={originActive} onPress={onOriginPress} subtitle={originSubtitle} title="Origen" />
        <View style={styles.locationSeparator} />
        <LocationChoiceRow active={destinationActive} onPress={onDestinationPress} subtitle={destinationSubtitle} title="Destino" />
      </View>
    </View>
  );
}

function LocationChoiceRow({ active, onPress, subtitle, title }) {
  return (
    <Pressable
      android_ripple={{ color: "rgba(15,157,138,0.08)" }}
      onPress={onPress}
      style={({ pressed }) => [styles.locationChoiceRow, pressed ? styles.pressed : null]}
    >
      <View style={styles.locationChoiceCopy}>
        <Text style={[styles.locationChoiceTitle, active ? styles.locationChoiceTitleActive : null]}>{title}</Text>
        <Text style={styles.locationChoiceSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <ChevronRight color={active ? "#0F9D8A" : colors.text} size={iconSize(22)} strokeWidth={ICON_STROKE} />
    </Pressable>
  );
}

function FareCard({
  distanceKm,
  durationMin,
  estimateData,
  isEstimateLoading,
  onRequest,
  requestDisabled,
  requestPending
}) {
  const total = estimateTotal(estimateData);
  const fareValue = isEstimateLoading ? "Calculando..." : total ? formatMoney(total) : "Pendiente";

  return (
    <View style={styles.fareCard}>
      <View style={styles.fareIconWrap}>
        <CreditCard color="#FFFFFF" size={iconSize(25)} strokeWidth={ICON_STROKE} />
      </View>
      <View style={styles.fareCopy}>
        <Text style={styles.fareLabel}>Tarifa estimada</Text>
        <Text style={styles.fareValue}>{fareValue}</Text>
        <Text style={styles.fareMeta}>
          {isEstimateLoading ? "Calculando tarifa automaticamente" : total && distanceKm ? `${distanceKm.toFixed(1)} km` : "Elige origen y destino"}
          {total && durationMin ? `  -  ${durationMin} min` : ""}
        </Text>
      </View>
      <Pressable
        android_ripple={{ color: "rgba(15,157,138,0.1)" }}
        disabled={requestDisabled}
        onPress={onRequest}
        style={({ pressed }) => [
          styles.fareButton,
          pressed ? styles.pressedScale : null,
          requestDisabled ? styles.disabled : null
        ]}
      >
        {requestPending ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            <Scooter color={colors.white} size={iconSize(18)} strokeWidth={ICON_STROKE} />
            <Text style={styles.fareButtonText}>Solicitar viaje</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function PassengerDrawer({
  activeMode,
  activeTab,
  availableModes,
  drawerOpen,
  onClose,
  onLogout,
  onSelect,
  onSelectMode,
  progress,
  user,
  userName
}) {
  const overlayOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.36]
  });
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-360, 0]
  });

  function select(tab) {
    onSelect(tab);
  }

  function logout() {
    onClose();
    onLogout();
  }

  return (
    <View pointerEvents={drawerOpen ? "auto" : "none"} style={styles.drawerRoot}>
      <Animated.View style={[styles.drawerOverlay, { opacity: overlayOpacity }]}>
        <Pressable style={styles.drawerOverlayPressable} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.drawerPanel, { transform: [{ translateX }] }]}>
        <PassengerDrawerHeader user={user} userName={userName} />

        <View style={styles.drawerMenu}>
          <PassengerDrawerItem active={activeTab === "home"} Icon={House} label="Inicio" onPress={() => select("home")} />
          <PassengerDrawerItem active={activeTab === "trips"} Icon={History} label="Mis viajes" onPress={() => select("trips")} />
          <PassengerDrawerItem active={activeTab === "account"} Icon={User} label="Cuenta" onPress={() => select("account")} />
        </View>

        <View style={styles.drawerFooter}>
          {availableModes.length > 1 ? (
            <PassengerWorkModeSelector
              activeMode={activeMode}
              availableModes={availableModes}
              onSelectMode={onSelectMode}
            />
          ) : null}
          <PassengerDrawerLogoutButton onPress={logout} />
        </View>
      </Animated.View>
    </View>
  );
}

function PassengerDrawerHeader({ user, userName }) {
  return (
    <View style={styles.drawerHeader}>
      <View style={styles.drawerHeaderAccent} />
      <View style={styles.drawerHeaderGlow} />

      <Pressable
        android_ripple={{ color: "rgba(255,255,255,0.16)" }}
        onPress={() => {}}
        style={({ pressed }) => [styles.drawerEditButton, pressed ? styles.pressed : null]}
      >
        <Camera color={colors.white} size={iconSize(19)} strokeWidth={ICON_STROKE} />
      </Pressable>

      <View style={styles.drawerHeaderContent}>
        <View style={styles.drawerAvatarWrap}>
          <View style={styles.drawerAvatar}>
            <Text style={styles.drawerAvatarText}>{getInitials(user)}</Text>
          </View>
          <Pressable
            android_ripple={{ color: "rgba(15,157,138,0.12)" }}
            onPress={() => {}}
            style={({ pressed }) => [styles.drawerAvatarCamera, pressed ? styles.pressed : null]}
          >
            <Camera color={colors.text} size={iconSize(16)} strokeWidth={ICON_STROKE} />
          </Pressable>
        </View>

        <View style={styles.drawerHeaderCopy}>
          <Text style={styles.drawerName} numberOfLines={2}>
            {userName}
          </Text>
          <Text style={styles.drawerRole}>Pasajero</Text>
          <View style={styles.drawerStatusRow}>
            <View style={styles.drawerStatusDotActive} />
            <Text style={styles.drawerStatusText}>Activo</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function PassengerDrawerItem({ active = false, Icon, label, onPress }) {
  const iconColor = active ? "#0F9D8A" : colors.muted;

  return (
    <Pressable
      android_ripple={{ color: active ? "rgba(15,157,138,0.14)" : "rgba(17,24,39,0.06)" }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.drawerItem,
        active ? styles.drawerItemActive : null,
        pressed ? styles.pressed : null
      ]}
    >
      <View style={[styles.drawerItemIcon, active ? styles.drawerItemIconActive : null]}>
        <Icon color={iconColor} size={iconSize(23)} strokeWidth={ICON_STROKE} />
      </View>
      <Text style={[styles.drawerItemText, active ? styles.drawerItemTextActive : null]}>{label}</Text>
      <ChevronRight color={active ? "#0F9D8A" : colors.muted} size={iconSize(20)} strokeWidth={ICON_STROKE} />
    </Pressable>
  );
}

function PassengerWorkModeSelector({ activeMode, availableModes, onSelectMode }) {
  return (
    <View style={styles.drawerModeCard}>
      <Text style={styles.drawerModeTitle}>Modo de trabajo</Text>
      <View style={styles.drawerModeOptions}>
        {[AppModes.DRIVER, AppModes.PASSENGER]
          .filter((mode) => availableModes.includes(mode))
          .map((mode) => {
            const isActive = activeMode === mode;
            const Icon = mode === AppModes.DRIVER ? Scooter : User;

            return (
              <Pressable
                android_ripple={{ color: isActive ? "rgba(255,255,255,0.18)" : "rgba(15,157,138,0.08)" }}
                key={mode}
                onPress={() => onSelectMode(mode)}
                style={({ pressed }) => [
                  styles.drawerModeOption,
                  isActive ? styles.drawerModeOptionActive : null,
                  pressed ? styles.pressed : null
                ]}
              >
                <Icon color={isActive ? colors.white : colors.muted} size={iconSize(18)} strokeWidth={ICON_STROKE} />
                <Text style={[styles.drawerModeOptionText, isActive ? styles.drawerModeOptionTextActive : null]}>
                  {modeLabels[mode]}
                </Text>
              </Pressable>
            );
          })}
      </View>
    </View>
  );
}

function PassengerDrawerLogoutButton({ onPress }) {
  return (
    <Pressable
      android_ripple={{ color: "rgba(239,68,68,0.12)" }}
      onPress={onPress}
      style={({ pressed }) => [styles.drawerLogoutButton, pressed ? styles.pressed : null]}
    >
      <LogOut color="#EF4444" size={iconSize(22)} strokeWidth={ICON_STROKE} />
      <Text style={styles.drawerLogoutText}>Cerrar sesion</Text>
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
  passengerHeaderBar: {
    minHeight: 84,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 10,
    shadowColor: colors.text,
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    zIndex: 8
  },
  passengerHeaderButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center"
  },
  passengerHeaderCopy: {
    flex: 1,
    paddingHorizontal: 16
  },
  passengerHeaderTitle: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900"
  },
  passengerHeaderSubtitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4
  },
  passengerHeaderAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#E6F7F3",
    alignItems: "center",
    justifyContent: "center"
  },
  drawerRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50
  },
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000"
  },
  drawerOverlayPressable: {
    flex: 1
  },
  drawerPanel: {
    width: "82%",
    maxWidth: 560,
    height: "100%",
    backgroundColor: colors.white,
    borderTopRightRadius: 37,
    borderBottomRightRadius: 37,
    shadowColor: colors.text,
    shadowOpacity: 0.18,
    shadowRadius: 32,
    shadowOffset: { width: 12, height: 0 },
    elevation: 14
  },
  drawerHeader: {
    height: 240,
    borderTopRightRadius: 37,
    backgroundColor: "#0F766E",
    overflow: "hidden",
    justifyContent: "flex-end",
    paddingHorizontal: 32,
    paddingBottom: 28
  },
  drawerHeaderAccent: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: "62%",
    backgroundColor: "#0F9D8A",
    opacity: 0.62
  },
  drawerHeaderGlow: {
    position: "absolute",
    top: -82,
    right: -52,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "rgba(255,255,255,0.1)"
  },
  drawerHeaderContent: {
    flexDirection: "row",
    alignItems: "center"
  },
  drawerHeaderCopy: {
    flex: 1,
    paddingLeft: 22
  },
  drawerEditButton: {
    position: "absolute",
    top: 28,
    right: 28,
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2
  },
  drawerAvatarWrap: {
    width: 112,
    height: 112
  },
  drawerAvatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 5,
    borderColor: colors.white,
    backgroundColor: "rgba(6,95,85,0.28)",
    alignItems: "center",
    justifyContent: "center"
  },
  drawerAvatarCamera: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.text,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4
  },
  drawerAvatarText: {
    color: colors.white,
    fontSize: 36,
    fontWeight: "900"
  },
  drawerName: {
    color: colors.white,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  drawerRole: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 8
  },
  drawerStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12
  },
  drawerStatusDotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
    marginRight: 8
  },
  drawerStatusText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "900"
  },
  drawerMenu: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 34
  },
  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 32,
    paddingTop: 26,
    paddingBottom: 26
  },
  drawerItem: {
    minHeight: 72,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 16,
    backgroundColor: colors.white,
    shadowColor: colors.text,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1
  },
  drawerItemActive: {
    backgroundColor: "#E6F7F3",
    borderColor: "#D8F2EB"
  },
  drawerItemIcon: {
    width: 52,
    height: 52,
    borderRadius: 19,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 18
  },
  drawerItemIconActive: {
    backgroundColor: colors.white
  },
  drawerItemText: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: "900"
  },
  drawerItemTextActive: {
    color: "#0F9D8A"
  },
  drawerModeCard: {
    marginBottom: 24
  },
  drawerModeTitle: {
    color: colors.muted,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 14
  },
  drawerModeOptions: {
    flexDirection: "row",
    borderRadius: 27,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 4
  },
  drawerModeOption: {
    flex: 1,
    minHeight: 58,
    borderRadius: 23,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8
  },
  drawerModeOptionActive: {
    backgroundColor: "#0F9D8A",
    borderColor: "#0F9D8A"
  },
  drawerModeOptionText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 8
  },
  drawerModeOptionTextActive: {
    color: colors.white
  },
  drawerLogoutButton: {
    minHeight: 68,
    borderRadius: 21,
    borderWidth: 1.4,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  drawerLogoutText: {
    color: "#EF4444",
    fontSize: 17,
    fontWeight: "900",
    marginLeft: 12
  },
  homeScreen: {
    flex: 1,
    backgroundColor: colors.background
  },
  passengerMapPanel: {
    height: "60%",
    minHeight: 420,
    backgroundColor: "#E6F1EF",
    overflow: "hidden"
  },
  fullMap: {
    ...StyleSheet.absoluteFillObject
  },
  mapFloatingButtons: {
    position: "absolute",
    right: 22,
    bottom: 58,
    alignItems: "center"
  },
  mapFloatingButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    shadowColor: colors.text,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6
  },
  homeSheet: {
    flex: 1,
    marginTop: -46,
    borderTopLeftRadius: 44,
    borderTopRightRadius: 44,
    backgroundColor: colors.white,
    shadowColor: colors.text,
    shadowOpacity: 0.12,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -10 },
    elevation: 10
  },
  homeSheetContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 30
  },
  sheetHandle: {
    width: 54,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 22
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
    width: 74,
    height: 74,
    borderRadius: 37,
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
    borderRadius: 24,
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
  rideLocationCard: {
    borderRadius: 28,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    flexDirection: "row",
    paddingVertical: 18,
    paddingLeft: 20,
    paddingRight: 12,
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5
  },
  locationRail: {
    width: 26,
    alignItems: "center",
    paddingTop: 21,
    paddingBottom: 21
  },
  locationDot: {
    width: 13,
    height: 13,
    borderRadius: 7
  },
  locationDotOrigin: {
    backgroundColor: colors.danger
  },
  locationDotDestination: {
    backgroundColor: colors.primary
  },
  locationLine: {
    width: 1,
    flex: 1,
    minHeight: 42,
    backgroundColor: "#CBD5E1",
    marginVertical: 6
  },
  locationRows: {
    flex: 1
  },
  locationChoiceRow: {
    minHeight: 72,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    paddingRight: 8
  },
  locationChoiceCopy: {
    flex: 1,
    paddingRight: 10
  },
  locationChoiceTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900"
  },
  locationChoiceTitleActive: {
    color: colors.primary
  },
  locationChoiceSubtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22,
    marginTop: 6
  },
  locationSeparator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 14,
    marginRight: 18
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
    marginTop: 22,
    borderRadius: 28,
    backgroundColor: "#F0FDFA",
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDFBF4"
  },
  fareIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 18,
    shadowColor: colors.primary,
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4
  },
  fareCopy: {
    flex: 1,
    paddingRight: 12
  },
  fareLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800"
  },
  fareValue: {
    color: colors.text,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "900",
    marginTop: 5
  },
  fareMeta: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 4
  },
  fareButton: {
    minHeight: 52,
    borderRadius: 17,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    shadowColor: colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3
  },
  fareButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 7
  },
  primaryButton: {
    minHeight: 72,
    borderRadius: 24,
    marginTop: 24,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 21,
    fontWeight: "900",
    marginLeft: 12
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
  pressedScale: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }]
  },
  disabled: {
    opacity: 0.55
  }
}));
