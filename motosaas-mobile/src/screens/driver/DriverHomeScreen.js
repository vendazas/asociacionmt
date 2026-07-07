import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Bell,
  Briefcase,
  Building2,
  Camera,
  ChevronRight,
  Clock3,
  CircleCheckBig,
  CircleDollarSign,
  HelpCircle,
  House,
  Languages,
  LocateFixed,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Navigation,
  Phone,
  Route,
  Scooter,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  User,
  Wallet,
  X
} from "lucide-react-native";
import { AppModes, modeLabels } from "../../config/roles";
import { driversApi, reportsApi, tripsApi } from "../../api/resources";
import { useAuth } from "../../providers/AuthProvider";
import { useRealtimeTripRoom } from "../../providers/RealtimeProvider";

const driverTripStatuses = ["DRIVER_ASSIGNED", "DRIVER_ARRIVING", "TRIP_STARTED"];

const tripStatusLabels = {
  REQUESTED: "Solicitado",
  SEARCHING_DRIVER: "Buscando conductor",
  DRIVER_ASSIGNED: "Mototaxista asignado",
  DRIVER_ARRIVING: "Llegando al pasajero",
  TRIP_STARTED: "Viaje en curso",
  TRIP_FINISHED: "Viaje completado",
  TRIP_CANCELLED: "Viaje cancelado",
  REJECTED: "Rechazado",
  EXPIRED: "Expirado"
};

const palette = {
  primary: "#0F9D8A",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  background: "#F8FAFC",
  card: "#FFFFFF",
  text: "#111827",
  secondary: "#6B7280",
  border: "#E5E7EB"
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
              Object.fromEntries(Object.entries(value).map(([nestedProp, nestedValue]) => [nestedProp, scaleValue(nestedProp, nestedValue)]))
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
  return error?.response?.data?.error?.message || error?.message || "No se pudo completar la operacion.";
}

function tripActionLabel(status) {
  if (status === "DRIVER_ASSIGNED") {
    return "Marcar llegada";
  }

  if (status === "DRIVER_ARRIVING") {
    return "Iniciar viaje";
  }

  if (status === "TRIP_STARTED") {
    return "Finalizar viaje";
  }

  return null;
}

function isDriverActiveTrip(trip, userId) {
  return Boolean(trip && trip.driver_user_id === userId && driverTripStatuses.includes(trip.status));
}

function getUserName(user) {
  const fullName = user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(" ");

  if (fullName) {
    return fullName;
  }

  if (user?.email) {
    return user.email.split("@")[0];
  }

  return "Mototaxista";
}

function getInitials(user) {
  const source = getUserName(user);
  const parts = source.split(" ").filter(Boolean);

  if (parts.length > 1) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function formatMoney(value) {
  const amount = Number(value || 0);
  return `Bs ${amount.toFixed(2)}`;
}

function formatDistance(value) {
  const distance = Number(value || 0);

  if (!distance) {
    return "-";
  }

  return `${distance.toFixed(1)} km`;
}

function formatDurationRange(trip) {
  const duration = Number(trip?.estimated_duration_minutes || 0);

  if (!duration) {
    return "5-8 min";
  }

  return `${Math.max(1, duration)}-${duration + 3} min`;
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
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (_error) {
    return date.toLocaleString();
  }
}

function placeLabel(point, fallback) {
  if (point?.address) {
    return point.address;
  }

  const latitude = Number(point?.latitude);
  const longitude = Number(point?.longitude);

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }

  return fallback;
}

function coordinateFor(point) {
  const latitude = Number(point?.latitude);
  const longitude = Number(point?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

function readableStatus(status) {
  return tripStatusLabels[status] || status || "Sin estado";
}

function profileStatusLabel(status) {
  if (!status) {
    return "Activo";
  }

  if (status === "ACTIVE") {
    return "Activo";
  }

  const normalized = String(status).replace(/_/g, " ").toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function DriverHomeScreen() {
  const { activeMode, availableModes, logout, session, setActiveMode } = useAuth();
  const queryClient = useQueryClient();
  const mapRef = useRef(null);
  const drawerProgress = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState("home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [location] = useState({ latitude: "-17.7833", longitude: "-63.1821" });
  const [available, setAvailable] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const updateLocation = useMutation({
    mutationFn: (nextAvailable = available) =>
      driversApi.updateLocation({
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        availabilityStatus: nextAvailable ? "AVAILABLE" : "OFFLINE"
      })
  });

  function changeAvailability(nextAvailable) {
    setAvailable(nextAvailable);
    updateLocation.mutate(nextAvailable);
  }

  useEffect(() => {
    Animated.timing(drawerProgress, {
      toValue: drawerOpen ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [drawerOpen, drawerProgress]);

  const currentTrip = useQuery({
    queryKey: ["driver-current-trip"],
    queryFn: tripsApi.current
  });

  const history = useQuery({
    queryKey: ["driver-history"],
    queryFn: () => tripsApi.history({ limit: 100 })
  });

  const activeTrip = useMemo(() => {
    if (isDriverActiveTrip(currentTrip.data, session?.user?.id)) {
      return currentTrip.data;
    }

    return (history.data?.items || []).find((trip) => isDriverActiveTrip(trip, session?.user?.id));
  }, [currentTrip.data, history.data, session?.user?.id]);

  const openTrips = useQuery({
    queryKey: ["open-trips"],
    queryFn: tripsApi.open,
    enabled: available && !activeTrip
  });

  useEffect(() => {
    if (!selectedRequest || !openTrips.data) {
      return;
    }

    const stillOpen = (openTrips.data || []).some((trip) => trip.id === selectedRequest.id);
    if (!stillOpen) {
      setSelectedRequest(null);
    }
  }, [openTrips.data, selectedRequest]);

  const earnings = useQuery({
    queryKey: ["driver-earnings"],
    queryFn: reportsApi.driverEarnings
  });

  const actionMutation = useMutation({
    mutationFn: ({ action, tripId }) => tripsApi[action](tripId),
    onSuccess: (_trip, variables) => {
      if (variables.action === "accept") {
        setAvailable(false);
      }

      if (variables.action === "accept" || variables.action === "reject") {
        setSelectedRequest(null);
      }

      queryClient.invalidateQueries({ queryKey: ["open-trips"] });
      queryClient.invalidateQueries({ queryKey: ["driver-current-trip"] });
      queryClient.invalidateQueries({ queryKey: ["driver-history"] });
      queryClient.invalidateQueries({ queryKey: ["driver-earnings"] });
    }
  });

  const finishMutation = useMutation({
    mutationFn: (tripId) => tripsApi.finish(tripId, {}),
    onSuccess: () => {
      setAvailable(true);
      queryClient.invalidateQueries({ queryKey: ["driver-current-trip"] });
      queryClient.invalidateQueries({ queryKey: ["driver-history"] });
      queryClient.invalidateQueries({ queryKey: ["driver-earnings"] });
      queryClient.invalidateQueries({ queryKey: ["open-trips"] });
    }
  });

  const region = useMemo(
    () => ({
      latitude: Number(location.latitude) || -17.7833,
      longitude: Number(location.longitude) || -63.1821,
      latitudeDelta: 0.045,
      longitudeDelta: 0.045
    }),
    [location.latitude, location.longitude]
  );

  const pendingTrips = available && !activeTrip ? openTrips.data || [] : [];
  const previewTrip = activeTrip || selectedRequest || pendingTrips[0];
  const originCoordinate = coordinateFor(previewTrip?.origin);
  const destinationCoordinate = coordinateFor(previewTrip?.destination);
  const activeAction = activeTrip ? tripActionLabel(activeTrip.status) : null;
  const userName = getUserName(session?.user);
  const ratingValue =
    earnings.data?.averageRating || earnings.data?.rating || session?.user?.driver_profile?.average_rating || null;
  const availabilityTitle = activeTrip ? "En viaje" : available ? "Disponible" : "No disponible";
  const availabilityDescription = activeTrip
    ? "Completa el viaje activo para recibir nuevas solicitudes"
    : available
      ? "Recibiendo solicitudes de viaje"
      : "Activa tu estado para recibir solicitudes";
  const historyItems = (history.data?.items || []).filter((trip) => trip.driver_user_id === session?.user?.id);
  useRealtimeTripRoom(activeTrip?.id || selectedRequest?.id);
  const profileRows = [
    ["Nombre", userName],
    ["Correo", session?.user?.email || "-"],
    ["Telefono", session?.user?.phone || "Sin telefono"],
    ["Documento", session?.user?.document_number || "Sin documento"],
    ["Asociacion", session?.association?.name || session?.association_id || "-"],
    ["Estado", profileStatusLabel(session?.user?.status)]
  ];

  function centerOnLocation() {
    mapRef.current?.animateToRegion(region, 350);
  }

  function runActiveAction() {
    if (!activeTrip) {
      return;
    }

    if (activeTrip.status === "DRIVER_ASSIGNED") {
      actionMutation.mutate({ action: "arrived", tripId: activeTrip.id });
      return;
    }

    if (activeTrip.status === "DRIVER_ARRIVING") {
      actionMutation.mutate({ action: "start", tripId: activeTrip.id });
      return;
    }

    if (activeTrip.status === "TRIP_STARTED") {
      finishMutation.mutate(activeTrip.id);
    }
  }

  function selectDrawerTab(tab) {
    setActiveTab(tab);
    setDrawerOpen(false);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  function confirmLogout() {
    Alert.alert("Cerrar sesion", "Quieres cerrar tu sesion?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesion", style: "destructive", onPress: logout }
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appShell}>
        <HeaderBar
          available={available || Boolean(activeTrip)}
          isProfile={activeTab === "profile"}
          onMenuPress={() => setDrawerOpen(true)}
        />

        {activeTab === "home" ? (
          <View style={styles.homeMapScreen}>
            <View style={styles.mapPanel}>
              <MapView ref={mapRef} style={styles.map} region={region} toolbarEnabled={false}>
                <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} title="Mi ubicacion">
                  <View style={styles.currentMarkerHalo}>
                    <View style={styles.currentMarkerDot} />
                  </View>
                </Marker>
                {originCoordinate ? <Marker coordinate={originCoordinate} pinColor={palette.primary} title="Origen" /> : null}
                {destinationCoordinate ? (
                  <Marker coordinate={destinationCoordinate} pinColor="#F59E0B" title="Destino" />
                ) : null}
              </MapView>

              <View style={styles.mapButtonStack}>
                <FloatingMapButton Icon={LocateFixed} onPress={centerOnLocation} />
                <FloatingMapButton Icon={Navigation} onPress={centerOnLocation} />
                <FloatingMapButton Icon={SlidersHorizontal} onPress={() => {}} />
              </View>
            </View>

            <ScrollView style={styles.homeContentScroll} contentContainerStyle={styles.homeContent} showsVerticalScrollIndicator={false}>
              <AnimatedEntrance>
                <StatusCard
                  active={available || Boolean(activeTrip)}
                  title={availabilityTitle}
                  subtitle={availabilityDescription}
                  value={available}
                  onValueChange={changeAvailability}
                  disabled={Boolean(activeTrip)}
                />
              </AnimatedEntrance>

              {updateLocation.error ? <Text style={styles.error}>{apiMessage(updateLocation.error)}</Text> : null}

              {activeTrip ? (
                <AnimatedEntrance delay={80}>
                  <View style={styles.activeTripCard}>
                    <View style={styles.requestHeader}>
                      <View style={styles.requestTitleColumn}>
                        <Text style={styles.cardEyebrow}>Viaje activo</Text>
                        <Text style={styles.requestTitle}>{readableStatus(activeTrip.status)}</Text>
                      </View>
                      <View style={styles.fareColumn}>
                        <Text style={styles.requestFare}>{formatMoney(activeTrip.estimated_fare)}</Text>
                        <Text style={styles.fareLabel}>Tarifa estimada</Text>
                      </View>
                    </View>

                    <RouteTimeline origin={activeTrip.origin} destination={activeTrip.destination} />
                    <Text style={styles.driverPassengerText}>Pasajero: {activeTrip.customer?.full_name || "-"}</Text>

                    {activeAction ? (
                      <ScalePressable
                        disabled={actionMutation.isPending || finishMutation.isPending}
                        onPress={runActiveAction}
                        style={[
                          styles.fullActionButton,
                          actionMutation.isPending || finishMutation.isPending ? styles.disabled : null
                        ]}
                      >
                        <CircleCheckBig color="#FFFFFF" size={iconSize(20)} strokeWidth={ICON_STROKE} />
                        <Text style={styles.fullActionButtonText}>{activeAction}</Text>
                      </ScalePressable>
                    ) : null}
                    {actionMutation.error ? <Text style={styles.error}>{apiMessage(actionMutation.error)}</Text> : null}
                    {finishMutation.error ? <Text style={styles.error}>{apiMessage(finishMutation.error)}</Text> : null}
                  </View>
                </AnimatedEntrance>
              ) : (
                <AnimatedEntrance delay={90}>
                  <View style={styles.requestsSection}>
                    <View style={styles.requestsHeader}>
                      <Text style={styles.requestsTitle}>Solicitudes de viaje</Text>
                      <BadgeCounter count={pendingTrips.length} />
                    </View>

                    {!available ? (
                      <EmptyState
                        title="Disponibilidad pausada"
                        subtitle="Activa tu estado para empezar a recibir solicitudes."
                      />
                    ) : null}

                    {available && openTrips.isFetching && !pendingTrips.length ? (
                      <View style={styles.loadingState}>
                        <ActivityIndicator color={palette.primary} />
                        <Text style={styles.loadingText}>Buscando solicitudes cercanas</Text>
                      </View>
                    ) : null}

                    {available && !openTrips.isFetching && !pendingTrips.length ? (
                      <EmptyState
                        title="No tienes solicitudes pendientes"
                        subtitle="Te notificaremos cuando tengas una nueva solicitud"
                      />
                    ) : null}

                    {pendingTrips.map((trip, index) => (
                      <AnimatedEntrance key={trip.id} delay={130 + index * 45}>
                        <RideRequestCard
                          trip={trip}
                          selected={selectedRequest?.id === trip.id}
                          available={available}
                          actionMutation={actionMutation}
                          onViewRoute={() => setSelectedRequest(trip)}
                          onReject={() => actionMutation.mutate({ action: "reject", tripId: trip.id })}
                          onAccept={() => actionMutation.mutate({ action: "accept", tripId: trip.id })}
                        />
                      </AnimatedEntrance>
                    ))}

                    {openTrips.error ? <Text style={styles.error}>{apiMessage(openTrips.error)}</Text> : null}
                    {actionMutation.error && !activeTrip ? (
                      <Text style={styles.error}>{apiMessage(actionMutation.error)}</Text>
                    ) : null}
                  </View>
                </AnimatedEntrance>
              )}
            </ScrollView>
          </View>
        ) : (
          <ScrollView style={styles.screen} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
            {activeTab === "trips" ? (
              <>
                <View style={styles.pageHeader}>
                  <Text style={styles.pageTitle}>Viajes</Text>
                  <Text style={styles.pageSubtitle}>Historial de tus servicios como mototaxista.</Text>
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Historial de viajes</Text>
                    {historyItems.length ? (
                      <Text style={styles.cardSubtitle}>{historyItems.length} total</Text>
                    ) : null}
                  </View>

                  {historyItems.map((trip) => (
                    <View key={trip.id} style={styles.historyItem}>
                      <View style={styles.historyIcon}>
                        <CircleCheckBig color="#087263" size={iconSize(24)} strokeWidth={ICON_STROKE} />
                      </View>
                      <View style={styles.historyBody}>
                        <Text style={styles.historyTitle}>{readableStatus(trip.status)}</Text>
                        <Text style={styles.historyRoute} numberOfLines={1}>
                          {placeLabel(trip.origin, "Origen")} to {placeLabel(trip.destination, "Destino")}
                        </Text>
                        <Text style={styles.metaText}>Pasajero: {trip.customer?.full_name || "-"}</Text>
                      </View>
                      <View style={styles.historyAmount}>
                        <Text style={styles.amountText}>{formatMoney(trip.final_fare || trip.estimated_fare)}</Text>
                        <Text style={styles.historyDate}>{formatDateTime(trip.requested_at)}</Text>
                      </View>
                    </View>
                  ))}

                  {history.isLoading ? (
                    <View style={styles.loadingState}>
                      <ActivityIndicator color="#0F8B7A" />
                    </View>
                  ) : null}

                  {!history.isLoading && !historyItems.length ? (
                    <EmptyState title="Aun no tienes viajes" subtitle="Tu historial aparecera cuando completes servicios." />
                  ) : null}
                </View>
              </>
            ) : (
              <>
                <ProfileHeader />

                <AnimatedEntrance>
                  <ProfileCard
                    association={session?.association?.name || session?.association_id || "-"}
                    status={profileStatusLabel(session?.user?.status)}
                    user={session?.user}
                    userName={userName}
                  />
                </AnimatedEntrance>

                <AnimatedEntrance delay={60}>
                  <DriverStatsCard
                    completedTrips={earnings.data?.completedTrips || 0}
                    earningsToday={formatMoney(earnings.data?.grossEarnings)}
                    rating={ratingValue ? Number(ratingValue).toFixed(1) : "-"}
                  />
                </AnimatedEntrance>

                <AnimatedEntrance delay={110}>
                  <ProfileSection title="Informacion personal">
                    {profileRows.map(([label, value]) => (
                      <ProfileItem key={label} label={label} value={value} />
                    ))}
                  </ProfileSection>
                </AnimatedEntrance>

                <AnimatedEntrance delay={210}>
                  <SettingsCard />
                </AnimatedEntrance>

                <AnimatedEntrance delay={260}>
                  <LogoutButton onPress={confirmLogout} />
                </AnimatedEntrance>
              </>
            )}
          </ScrollView>
        )}

        <DriverDrawer
          activeMode={activeMode}
          activeTab={activeTab}
          available={available || Boolean(activeTrip)}
          availableModes={availableModes}
          drawerOpen={drawerOpen}
          progress={drawerProgress}
          user={session?.user}
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

function HeaderBar({ available, isProfile = false, onMenuPress }) {
  return (
    <View style={styles.headerBar}>
      <ScalePressable onPress={onMenuPress} style={styles.headerIconButton}>
        <Menu color={palette.text} size={iconSize(28)} strokeWidth={ICON_STROKE} />
      </ScalePressable>

      <View style={styles.headerTitleBlock}>
        <Text style={styles.headerTitle}>{isProfile ? "Perfil" : "Conductor"}</Text>
        {isProfile ? (
          <Text style={styles.headerSubtitle}>Gestiona tu informacion personal</Text>
        ) : (
          <View style={styles.headerStatusRow}>
            <View style={[styles.headerStatusDot, available ? styles.headerStatusDotActive : null]} />
            <Text style={styles.headerStatusText}>{available ? "Disponible" : "No disponible"}</Text>
          </View>
        )}
      </View>

      <ScalePressable onPress={() => {}} style={styles.headerIconButton}>
        <Bell color={palette.text} size={iconSize(26)} strokeWidth={ICON_STROKE} />
      </ScalePressable>
    </View>
  );
}

function DriverDrawer({
  activeMode,
  activeTab,
  available,
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
        <DrawerHeader available={available} user={user} userName={userName} />

        <View style={styles.drawerMenu}>
          <DrawerMenuItem active={activeTab === "home"} Icon={House} label="Inicio" onPress={() => select("home")} />
          <DrawerMenuItem active={activeTab === "trips"} Icon={Briefcase} label="Viajes" onPress={() => select("trips")} />
          <DrawerMenuItem active={activeTab === "profile"} Icon={User} label="Perfil" onPress={() => select("profile")} />
        </View>

        <View style={styles.drawerFooter}>
          {availableModes.length > 1 ? (
            <WorkModeSelector
              activeMode={activeMode}
              availableModes={availableModes}
              onSelectMode={onSelectMode}
            />
          ) : null}
          <DrawerLogoutButton onPress={logout} />
        </View>
      </Animated.View>
    </View>
  );
}

function DrawerHeader({ available, user, userName }) {
  return (
    <View style={styles.drawerHeader}>
      <View style={styles.drawerHeaderAccent} />
      <View style={styles.drawerHeaderGlow} />

      <Pressable
        android_ripple={{ color: "rgba(255,255,255,0.16)" }}
        onPress={() => {}}
        style={({ pressed }) => [styles.drawerEditButton, pressed ? styles.drawerItemPressed : null]}
      >
        <Camera color="#FFFFFF" size={iconSize(19)} strokeWidth={ICON_STROKE} />
      </Pressable>

      <View style={styles.drawerHeaderContent}>
        <View style={styles.drawerAvatarWrap}>
          <View style={styles.drawerAvatar}>
            <Text style={styles.drawerAvatarText}>{getInitials(user)}</Text>
          </View>
          <Pressable
            android_ripple={{ color: "rgba(15,157,138,0.12)" }}
            onPress={() => {}}
            style={({ pressed }) => [styles.drawerAvatarCamera, pressed ? styles.drawerItemPressed : null]}
          >
            <Camera color={palette.text} size={iconSize(16)} strokeWidth={ICON_STROKE} />
          </Pressable>
        </View>

        <View style={styles.drawerHeaderCopy}>
          <Text style={styles.drawerName} numberOfLines={2}>
            {userName}
          </Text>
          <Text style={styles.drawerRole}>Mototaxista</Text>
          <View style={styles.drawerStatusRow}>
            <View style={[styles.drawerStatusDot, available ? styles.drawerStatusDotActive : null]} />
            <Text style={styles.drawerStatusText}>{available ? "Disponible" : "No disponible"}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function DrawerMenuItem({ active = false, Icon, label, onPress }) {
  const iconColor = active ? palette.primary : palette.secondary;
  const textStyle = active ? styles.drawerItemTextActive : styles.drawerItemText;

  return (
    <Pressable
      android_ripple={{ color: active ? "rgba(15,157,138,0.14)" : "rgba(17,24,39,0.06)" }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.drawerItem,
        active ? styles.drawerItemActive : null,
        pressed ? styles.drawerItemPressed : null
      ]}
    >
      <View style={[styles.drawerItemIcon, active ? styles.drawerItemIconActive : null]}>
        <Icon color={iconColor} size={iconSize(23)} strokeWidth={ICON_STROKE} />
      </View>
      <Text style={textStyle}>{label}</Text>
      <ChevronRight color={active ? palette.primary : palette.secondary} size={iconSize(20)} strokeWidth={ICON_STROKE} />
    </Pressable>
  );
}

function WorkModeSelector({ activeMode, availableModes, onSelectMode }) {
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
                  pressed ? styles.drawerItemPressed : null
                ]}
              >
                <Icon
                  color={isActive ? "#FFFFFF" : palette.secondary}
                  size={iconSize(18)}
                  strokeWidth={ICON_STROKE}
                />
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

function DrawerLogoutButton({ onPress }) {
  return (
    <Pressable
      android_ripple={{ color: "rgba(239,68,68,0.12)" }}
      onPress={onPress}
      style={({ pressed }) => [styles.drawerLogoutButton, pressed ? styles.drawerItemPressed : null]}
    >
      <LogOut color={palette.danger} size={iconSize(22)} strokeWidth={ICON_STROKE} />
      <Text style={styles.drawerLogoutText}>Cerrar sesion</Text>
    </Pressable>
  );
}

function ProfileHeader() {
  return <View style={styles.profileHeaderSpacer} />;
}

function AvatarPicker({ user }) {
  return (
    <View style={styles.profileAvatarWrap}>
      <View style={styles.profileAvatar}>
        <Text style={styles.profileAvatarText}>{getInitials(user)}</Text>
      </View>
      <ScalePressable onPress={() => {}} style={styles.avatarCameraButton}>
        <Camera color={palette.text} size={iconSize(17)} strokeWidth={ICON_STROKE} />
      </ScalePressable>
    </View>
  );
}

function ProfileCard({ association, status, user, userName }) {
  return (
    <View style={styles.profileHeroCard}>
      <AvatarPicker user={user} />
      <View style={styles.profileHeroCopy}>
        <Text style={styles.profileHeroName} numberOfLines={2}>
          {userName}
        </Text>
        <Text style={styles.profileHeroRole}>Mototaxista</Text>
        <Text style={styles.profileHeroAssociation} numberOfLines={1}>
          {association}
        </Text>
        <View style={styles.profileStatusBadge}>
          <View style={styles.profileStatusDot} />
          <Text style={styles.profileStatusText}>{status}</Text>
        </View>
      </View>
    </View>
  );
}

function DriverStatsCard({ completedTrips, earningsToday, rating }) {
  return (
    <View style={styles.driverStatsCard}>
      <DriverStat Icon={Briefcase} label="Viajes" value={completedTrips} />
      <View style={styles.driverStatDivider} />
      <DriverStat Icon={Wallet} label="Hoy" value={earningsToday} />
      <View style={styles.driverStatDivider} />
      <DriverStat Icon={Star} label="Calificacion" value={rating} />
    </View>
  );
}

function DriverStat({ Icon, label, value }) {
  return (
    <View style={styles.driverStatItem}>
      <View style={styles.driverStatIcon}>
        <Icon color={palette.primary} size={iconSize(21)} strokeWidth={ICON_STROKE} />
      </View>
      <Text style={styles.driverStatValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.driverStatLabel}>{label}</Text>
    </View>
  );
}

function ProfileSection({ children, title }) {
  return (
    <View style={styles.profileSection}>
      <Text style={styles.profileSectionTitle}>{title}</Text>
      <View style={styles.profileSectionBody}>{children}</View>
    </View>
  );
}

function ProfileItem({ label, value }) {
  const Icon = profileIconFor(label);
  const isStatus = label === "Estado";

  return (
    <Pressable
      android_ripple={{ color: "rgba(15,157,138,0.08)" }}
      onPress={() => {}}
      style={({ pressed }) => [styles.profileItemCard, pressed ? styles.profileItemPressed : null]}
    >
      <View style={styles.profileItemIcon}>
        <Icon color={palette.primary} size={iconSize(22)} strokeWidth={ICON_STROKE} />
      </View>
      <View style={styles.profileItemCopy}>
        <Text style={styles.profileItemLabel}>{label}</Text>
        {isStatus ? (
          <View style={styles.profileItemStatusBadge}>
            <View style={styles.profileItemStatusDot} />
            <Text style={styles.profileItemStatusText}>{value}</Text>
          </View>
        ) : (
          <Text style={styles.profileItemValue} numberOfLines={2}>
            {value}
          </Text>
        )}
      </View>
      <ChevronRight color={palette.secondary} size={iconSize(21)} strokeWidth={ICON_STROKE} />
    </Pressable>
  );
}

function ModeSelector({ activeMode, availableModes, onSelectMode }) {
  return (
    <View style={styles.modeCard}>
      <Text style={styles.modeCardTitle}>Modo de trabajo</Text>
      <Text style={styles.modeCardSubtitle}>Selecciona como utilizaras la aplicacion.</Text>
      <View style={styles.modernModeSelector}>
        {[AppModes.DRIVER, AppModes.PASSENGER]
          .filter((mode) => availableModes.includes(mode))
          .map((mode) => {
            const isActive = activeMode === mode;
            const Icon = mode === AppModes.DRIVER ? Scooter : User;

            return (
              <ScalePressable
                key={mode}
                onPress={() => onSelectMode(mode)}
                style={[styles.modernModeOption, isActive ? styles.modernModeOptionActive : null]}
              >
                <View style={[styles.modeRadio, isActive ? styles.modeRadioActive : null]}>
                  {isActive ? <View style={styles.modeRadioDot} /> : null}
                </View>
                <Icon
                  color={isActive ? "#FFFFFF" : palette.secondary}
                  size={iconSize(21)}
                  strokeWidth={ICON_STROKE}
                />
                <Text style={[styles.modernModeText, isActive ? styles.modernModeTextActive : null]}>
                  {modeLabels[mode]}
                </Text>
              </ScalePressable>
            );
          })}
      </View>
    </View>
  );
}

function SettingsCard() {
  const items = [
    ["Cambiar contrasena", LockKeyhole],
    ["Notificaciones", Bell],
    ["Idioma", Languages],
    ["Privacidad", ShieldCheck],
    ["Ayuda", HelpCircle]
  ];

  return (
    <View style={styles.settingsCard}>
      <Text style={styles.settingsTitle}>Configuracion rapida</Text>
      <View style={styles.settingsList}>
        {items.map(([label, Icon]) => (
          <Pressable
            android_ripple={{ color: "rgba(15,157,138,0.08)" }}
            key={label}
            onPress={() => {}}
            style={({ pressed }) => [styles.settingsItem, pressed ? styles.profileItemPressed : null]}
          >
            <View style={styles.settingsIcon}>
              <Icon color={palette.primary} size={iconSize(20)} strokeWidth={ICON_STROKE} />
            </View>
            <Text style={styles.settingsItemText}>{label}</Text>
            <ChevronRight color={palette.secondary} size={iconSize(20)} strokeWidth={ICON_STROKE} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function LogoutButton({ onPress }) {
  return (
    <Pressable
      android_ripple={{ color: "rgba(239,68,68,0.1)" }}
      onPress={onPress}
      style={({ pressed }) => [styles.logoutOutlineButton, pressed ? styles.profileItemPressed : null]}
    >
      <LogOut color={palette.danger} size={iconSize(20)} strokeWidth={ICON_STROKE} />
      <Text style={styles.logoutOutlineButtonText}>Cerrar sesion</Text>
    </Pressable>
  );
}

function profileIconFor(label) {
  const icons = {
    Nombre: User,
    Correo: Mail,
    Telefono: Phone,
    Documento: BadgeCheck,
    Asociacion: Building2,
    Estado: ShieldCheck
  };

  return icons[label] || User;
}

function AnimatedEntrance({ children, delay = 0, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 360,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

function ScalePressable({ children, disabled, onPress, style }) {
  const scale = useRef(new Animated.Value(1)).current;

  function animate(toValue) {
    Animated.spring(scale, {
      toValue,
      friction: 7,
      tension: 120,
      useNativeDriver: true
    }).start();
  }

  return (
    <Pressable
      android_ripple={{ color: "rgba(15,157,138,0.12)", borderless: false }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => animate(0.97)}
      onPressOut={() => animate(1)}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

function FloatingMapButton({ Icon, onPress }) {
  return (
    <ScalePressable onPress={onPress} style={styles.floatingMapButton}>
      <Icon color={palette.primary} size={iconSize(23)} strokeWidth={ICON_STROKE} />
    </ScalePressable>
  );
}

function StatusCard({ active, disabled, onValueChange, subtitle, title, value }) {
  return (
    <View style={styles.statusCard}>
      <View style={styles.statusIconWrap}>
        <Scooter color={palette.primary} size={iconSize(28)} strokeWidth={ICON_STROKE} />
      </View>
      <View style={styles.statusCopy}>
        <View style={styles.statusTitleRow}>
          <View style={[styles.statusDot, active ? styles.statusDotActive : null]} />
          <Text style={styles.statusCardTitle}>{title}</Text>
        </View>
        <Text style={styles.statusCardSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: "#D1D5DB", true: palette.primary }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#D1D5DB"
      />
    </View>
  );
}

function BadgeCounter({ count }) {
  if (!count) {
    return <View style={styles.badgeCounterEmpty} />;
  }

  return (
    <View style={styles.badgeCounter}>
      <Text style={styles.badgeCounterText}>{count}</Text>
    </View>
  );
}

function RouteTimeline({ destination, origin }) {
  return (
    <View style={styles.routeTimeline}>
      <View style={styles.routeRail}>
        <View style={styles.routeStartDot} />
        <View style={styles.routeLine} />
        <View style={styles.routeEndDot} />
      </View>
      <View style={styles.routeTimelineCopy}>
        <Text style={styles.routeTimelineText} numberOfLines={1}>
          {placeLabel(origin, "Ubicacion actual")}
        </Text>
        <View style={styles.routeTimelineDivider} />
        <Text style={styles.routeTimelineText} numberOfLines={1}>
          {placeLabel(destination, "Destino seleccionado")}
        </Text>
      </View>
    </View>
  );
}

function RideInfoCard({ Icon, label, value }) {
  return (
    <View style={styles.rideInfoCard}>
      <Icon color={palette.primary} size={iconSize(21)} strokeWidth={ICON_STROKE} />
      <View style={styles.rideInfoCopy}>
        <Text style={styles.rideInfoValue}>{value}</Text>
        <Text style={styles.rideInfoLabel}>{label}</Text>
      </View>
    </View>
  );
}

function RideActionButtons({ actionMutation, available, onAccept, onReject, onViewRoute }) {
  return (
    <View style={styles.rideActionRow}>
      <ScalePressable onPress={onViewRoute} style={styles.rideActionButtonOutline}>
        <Route color={palette.primary} size={iconSize(18)} strokeWidth={ICON_STROKE} />
        <Text style={styles.rideActionButtonTextPrimary}>Ver ruta</Text>
      </ScalePressable>

      <ScalePressable disabled={actionMutation.isPending} onPress={onReject} style={styles.rideActionButtonDanger}>
        <X color={palette.danger} size={iconSize(18)} strokeWidth={ICON_STROKE} />
        <Text style={styles.rideActionButtonTextDanger}>Rechazar</Text>
      </ScalePressable>

      <ScalePressable
        disabled={!available || actionMutation.isPending}
        onPress={onAccept}
        style={[styles.rideActionButtonPrimary, !available || actionMutation.isPending ? styles.disabled : null]}
      >
        <CircleCheckBig color="#FFFFFF" size={iconSize(19)} strokeWidth={ICON_STROKE} />
        <Text style={styles.rideActionButtonTextWhite}>Aceptar</Text>
      </ScalePressable>
    </View>
  );
}

function RideRequestCard({ actionMutation, available, onAccept, onReject, onViewRoute, selected, trip }) {
  return (
    <View style={[styles.rideRequestCard, selected ? styles.rideRequestCardActive : null]}>
      <View style={styles.requestHeader}>
        <View style={styles.requestTitleColumn}>
          <View style={styles.requestStatusRow}>
            <View style={styles.requestGreenDot} />
            <Text style={styles.requestTitle}>Nueva solicitud</Text>
          </View>
          <Text style={styles.requestClientLabel}>
            Cliente: <Text style={styles.requestClientName}>{trip.customer?.full_name || "-"}</Text>
          </Text>
        </View>
        <View style={styles.fareColumn}>
          <Text style={styles.requestFare}>{formatMoney(trip.estimated_fare)}</Text>
          <Text style={styles.fareLabel}>Tarifa estimada</Text>
        </View>
      </View>

      <RouteTimeline origin={trip.origin} destination={trip.destination} />

      <View style={styles.rideInfoRow}>
        <RideInfoCard Icon={MapPin} label="Distancia" value={formatDistance(trip.estimated_distance_km)} />
        <RideInfoCard Icon={Clock3} label="Tiempo estimado" value={formatDurationRange(trip)} />
      </View>

      <RideActionButtons
        actionMutation={actionMutation}
        available={available}
        onAccept={onAccept}
        onReject={onReject}
        onViewRoute={onViewRoute}
      />
    </View>
  );
}

function MetricCard({ accent, detail, Icon, label, value }) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: accent }]}>
        <Icon color="#FFFFFF" size={iconSize(23)} strokeWidth={ICON_STROKE} />
      </View>
      <View style={styles.metricContent}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricDetail}>{detail}</Text>
      </View>
    </View>
  );
}

function EmptyState({ subtitle, title }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Bell color="#0F8B7A" size={iconSize(38)} strokeWidth={ICON_STROKE} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

function ActionButton({ disabled, Icon, label, onPress, variant = "primary" }) {
  const isMuted = variant === "muted";
  const isLight = variant === "light";
  const iconColor = isMuted ? "#111827" : isLight ? "#087263" : "#FFFFFF";

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        isMuted ? styles.actionButtonMuted : null,
        isLight ? styles.actionButtonLight : null,
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null
      ]}
    >
      {Icon ? (
        <Icon color={iconColor} size={iconSize(16)} strokeWidth={ICON_STROKE} style={styles.actionButtonIcon} />
      ) : null}
      <Text
        style={[
          styles.actionButtonText,
          isMuted ? styles.actionButtonMutedText : null,
          isLight ? styles.actionButtonLightText : null
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create(compactStyles({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  appShell: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  headerBar: {
    minHeight: 84,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 10,
    shadowColor: "#111827",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    zIndex: 8
  },
  headerIconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center"
  },
  headerTitleBlock: {
    flex: 1,
    paddingHorizontal: 16
  },
  headerTitle: {
    color: "#111827",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900"
  },
  headerStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3
  },
  headerStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#9CA3AF",
    marginRight: 7
  },
  headerStatusDotActive: {
    backgroundColor: "#10B981"
  },
  headerStatusText: {
    color: "#0F9D8A",
    fontSize: 15,
    fontWeight: "800"
  },
  headerSubtitle: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4
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
    backgroundColor: "#FFFFFF",
    borderTopRightRadius: 37,
    borderBottomRightRadius: 37,
    shadowColor: "#111827",
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
    borderColor: "#FFFFFF",
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
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#111827",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4
  },
  drawerAvatarText: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "900"
  },
  drawerName: {
    color: "#FFFFFF",
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
  drawerStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#CBD5E1",
    marginRight: 8
  },
  drawerStatusDotActive: {
    backgroundColor: "#10B981"
  },
  drawerStatusText: {
    color: "#FFFFFF",
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
    borderTopColor: "#E5E7EB",
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
    backgroundColor: "#FFFFFF",
    shadowColor: "#111827",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1
  },
  drawerItemActive: {
    backgroundColor: "#E6F7F3",
    borderColor: "#D8F2EB"
  },
  drawerItemPressed: {
    opacity: 0.86
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
    backgroundColor: "#FFFFFF"
  },
  drawerItemText: {
    flex: 1,
    color: "#111827",
    fontSize: 18,
    fontWeight: "900"
  },
  drawerItemTextActive: {
    flex: 1,
    color: "#0F9D8A",
    fontSize: 18,
    fontWeight: "900"
  },
  drawerModeCard: {
    marginBottom: 24
  },
  drawerModeTitle: {
    color: "#6B7280",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 14
  },
  drawerModeOptions: {
    flexDirection: "row",
    borderRadius: 27,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    padding: 4
  },
  drawerModeOption: {
    flex: 1,
    minHeight: 58,
    borderRadius: 23,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 8
  },
  drawerModeOptionTextActive: {
    color: "#FFFFFF"
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
  homeMapScreen: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  mapPanel: {
    height: "64%",
    minHeight: 320,
    backgroundColor: "#E6F1EF",
    overflow: "hidden"
  },
  mapButtonStack: {
    position: "absolute",
    right: 18,
    bottom: 28,
    alignItems: "center"
  },
  floatingMapButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: "#111827",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6
  },
  homeContentScroll: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    marginTop: -34
  },
  homeContent: {
    paddingHorizontal: 18,
    paddingBottom: 28
  },
  statusCard: {
    minHeight: 96,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: "#111827",
    shadowOpacity: 0.09,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5
  },
  statusIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#DDFBF4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14
  },
  statusCopy: {
    flex: 1,
    paddingRight: 10
  },
  statusTitleRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  statusCardTitle: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "900"
  },
  statusCardSubtitle: {
    color: "#6B7280",
    fontSize: 16,
    marginTop: 5
  },
  requestsSection: {
    marginTop: 28
  },
  requestsHeader: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14
  },
  requestsTitle: {
    flex: 1,
    color: "#111827",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900"
  },
  badgeCounter: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#0F9D8A",
    alignItems: "center",
    justifyContent: "center"
  },
  badgeCounterEmpty: {
    width: 30,
    height: 30
  },
  badgeCounterText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900"
  },
  rideRequestCard: {
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    padding: 18,
    marginBottom: 16,
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 5
  },
  rideRequestCardActive: {
    borderColor: "#0F9D8A",
    backgroundColor: "#FFFFFF"
  },
  requestTitleColumn: {
    flex: 1,
    paddingRight: 12
  },
  requestStatusRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  requestGreenDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    marginRight: 11
  },
  requestClientLabel: {
    color: "#6B7280",
    fontSize: 15,
    marginTop: 7
  },
  requestClientName: {
    color: "#0F9D8A",
    fontWeight: "900"
  },
  fareColumn: {
    alignItems: "flex-end",
    minWidth: 98
  },
  requestFare: {
    color: "#111827",
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "900"
  },
  fareLabel: {
    color: "#6B7280",
    fontSize: 13,
    marginTop: 4,
    textAlign: "right"
  },
  routeTimeline: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: 24,
    marginBottom: 18
  },
  routeRail: {
    width: 22,
    alignItems: "center",
    paddingVertical: 2
  },
  routeStartDot: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 4,
    borderColor: "#0F9D8A",
    backgroundColor: "#FFFFFF"
  },
  routeLine: {
    width: 2,
    flex: 1,
    minHeight: 32,
    backgroundColor: "#CBD5E1",
    marginVertical: 4
  },
  routeEndDot: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 4,
    borderColor: "#6B7280",
    backgroundColor: "#FFFFFF"
  },
  routeTimelineCopy: {
    flex: 1,
    paddingLeft: 10
  },
  routeTimelineText: {
    color: "#111827",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800"
  },
  routeTimelineDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 13
  },
  rideInfoRow: {
    flexDirection: "row",
    marginHorizontal: -6,
    marginBottom: 18
  },
  rideInfoCard: {
    flex: 1,
    minHeight: 86,
    borderRadius: 20,
    backgroundColor: "#ECFDF5",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginHorizontal: 6
  },
  rideInfoCopy: {
    flex: 1,
    marginLeft: 11
  },
  rideInfoValue: {
    color: "#087263",
    fontSize: 20,
    fontWeight: "900"
  },
  rideInfoLabel: {
    color: "#6B7280",
    fontSize: 14,
    marginTop: 5
  },
  rideActionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: -5
  },
  rideActionButtonOutline: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1.4,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 5,
    paddingHorizontal: 10
  },
  rideActionButtonDanger: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1.4,
    borderColor: "#FCA5A5",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 5,
    paddingHorizontal: 10
  },
  rideActionButtonPrimary: {
    flex: 1.25,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: "#0F9D8A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 5,
    paddingHorizontal: 12,
    shadowColor: "#0F9D8A",
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4
  },
  rideActionButtonTextPrimary: {
    color: "#0F9D8A",
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 7
  },
  rideActionButtonTextDanger: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 7
  },
  rideActionButtonTextWhite: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 7
  },
  activeTripCard: {
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    padding: 18,
    marginTop: 18,
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 5
  },
  cardEyebrow: {
    color: "#0F9D8A",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 4
  },
  driverPassengerText: {
    color: "#6B7280",
    fontSize: 15,
    marginBottom: 16
  },
  fullActionButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: "#0F9D8A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F9D8A",
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4
  },
  fullActionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    marginLeft: 8
  },
  pageContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 28
  },
  pageHeader: {
    marginBottom: 2
  },
  pageTitle: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "900"
  },
  pageSubtitle: {
    color: "#6B7280",
    fontSize: 14,
    marginTop: 4
  },
  profileHeaderSpacer: {
    height: 2
  },
  profileHeroCard: {
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    shadowColor: "#111827",
    shadowOpacity: 0.07,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4
  },
  profileAvatarWrap: {
    width: 86,
    height: 86,
    marginRight: 16
  },
  profileAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#0F9D8A",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F9D8A",
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5
  },
  profileAvatarText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900"
  },
  avatarCameraButton: {
    position: "absolute",
    right: -2,
    bottom: -1,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#111827",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4
  },
  profileHeroCopy: {
    flex: 1
  },
  profileHeroName: {
    color: "#111827",
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "900"
  },
  profileHeroRole: {
    color: "#0F9D8A",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 6
  },
  profileHeroAssociation: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4
  },
  profileStatusBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10
  },
  profileStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#10B981",
    marginRight: 6
  },
  profileStatusText: {
    color: "#087263",
    fontSize: 12,
    fontWeight: "900"
  },
  driverStatsCard: {
    minHeight: 122,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    shadowColor: "#111827",
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3
  },
  driverStatItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6
  },
  driverStatIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E7F8F4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8
  },
  driverStatValue: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center"
  },
  driverStatLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 4
  },
  driverStatDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 10
  },
  profileSection: {
    marginTop: 18
  },
  profileSectionTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10
  },
  profileSectionBody: {
    marginBottom: -10
  },
  profileItemCard: {
    minHeight: 76,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 10,
    shadowColor: "#111827",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  profileItemPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }]
  },
  profileItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E7F8F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  profileItemCopy: {
    flex: 1,
    paddingRight: 10
  },
  profileItemLabel: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "700"
  },
  profileItemValue: {
    color: "#111827",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
    marginTop: 4
  },
  profileItemStatusBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginTop: 5
  },
  profileItemStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#10B981",
    marginRight: 6
  },
  profileItemStatusText: {
    color: "#087263",
    fontSize: 12,
    fontWeight: "900"
  },
  modeCard: {
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    marginTop: 18,
    padding: 18,
    shadowColor: "#111827",
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3
  },
  modeCardTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900"
  },
  modeCardSubtitle: {
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5
  },
  modernModeSelector: {
    flexDirection: "row",
    marginHorizontal: -5,
    marginTop: 16
  },
  modernModeOption: {
    flex: 1,
    minHeight: 58,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 5,
    paddingHorizontal: 10
  },
  modernModeOptionActive: {
    backgroundColor: "#0F9D8A",
    borderColor: "#0F9D8A",
    shadowColor: "#0F9D8A",
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4
  },
  modeRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#9CA3AF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8
  },
  modeRadioActive: {
    borderColor: "#FFFFFF"
  },
  modeRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF"
  },
  modernModeText: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 7
  },
  modernModeTextActive: {
    color: "#FFFFFF"
  },
  settingsCard: {
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    marginTop: 18,
    padding: 18,
    shadowColor: "#111827",
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3
  },
  settingsTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12
  },
  settingsList: {
    marginBottom: -8
  },
  settingsItem: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 8
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E7F8F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11
  },
  settingsItemText: {
    flex: 1,
    color: "#111827",
    fontSize: 15,
    fontWeight: "800"
  },
  logoutOutlineButton: {
    minHeight: 54,
    borderRadius: 20,
    borderWidth: 1.4,
    borderColor: "#FCA5A5",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    marginBottom: 4
  },
  logoutOutlineButtonText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 8
  },
  profile: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0F8B7A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900"
  },
  profileText: {
    flex: 1
  },
  greeting: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "900"
  },
  role: {
    color: "#0F8B7A",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 1
  },
  email: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 2
  },
  modeSelector: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 5,
    marginTop: 4,
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  modeOption: {
    flex: 1,
    minHeight: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row"
  },
  modeOptionActive: {
    backgroundColor: "#0F8B7A"
  },
  modeBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8
  },
  modeBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.18)"
  },
  modeOptionText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "800"
  },
  modeOptionTextActive: {
    color: "#FFFFFF"
  },
  map: {
    ...StyleSheet.absoluteFillObject
  },
  currentMarkerHalo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(15,157,138,0.16)",
    alignItems: "center",
    justifyContent: "center"
  },
  currentMarkerDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#0F9D8A",
    borderWidth: 3,
    borderColor: "#FFFFFF"
  },
  centerButton: {
    position: "absolute",
    right: 18,
    top: 18,
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#111827",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5
  },
  availabilityCopy: {
    flex: 1,
    paddingRight: 12
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  statusDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#9CA3AF",
    marginRight: 10
  },
  statusDotActive: {
    backgroundColor: "#10B981"
  },
  availabilityTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "900"
  },
  availabilityDescription: {
    color: "#6B7280",
    fontSize: 14,
    marginTop: 4
  },
  homeSheet: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    maxHeight: 430,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#111827",
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
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 12
  },
  availabilityRow: {
    minHeight: 72,
    borderRadius: 20,
    backgroundColor: "#F7F8FA",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  sheetSection: {
    marginTop: 12
  },
  badgeText: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    color: "#FFFFFF",
    backgroundColor: "#0F8B7A",
    overflow: "hidden",
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 13,
    lineHeight: 28,
    fontWeight: "900"
  },
  metricsGrid: {
    flexDirection: "row",
    marginTop: 16,
    marginHorizontal: -4
  },
  profileCard: {
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    shadowColor: "#111827",
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  metricCard: {
    flex: 1,
    minHeight: 136,
    marginHorizontal: 4,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    shadowColor: "#111827",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2
  },
  metricIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8
  },
  metricContent: {
    flex: 1
  },
  metricLabel: {
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 16
  },
  metricValue: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 5
  },
  metricDetail: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 3
  },
  card: {
    marginTop: 16,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    shadowColor: "#111827",
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  cardTitle: {
    color: "#111827",
    fontSize: 21,
    fontWeight: "900"
  },
  cardSubtitle: {
    color: "#6B7280",
    fontSize: 13,
    marginTop: 2
  },
  profileRow: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingVertical: 13
  },
  profileRowLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  profileRowValue: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 5
  },
  logoutFullButton: {
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16
  },
  logoutFullButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900"
  },
  amountText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900"
  },
  routeBox: {
    borderRadius: 18,
    backgroundColor: "#F7F8FA",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginTop: 4,
    marginBottom: 12
  },
  routeBoxCompact: {
    borderRadius: 16,
    backgroundColor: "#F7F8FA",
    padding: 12,
    marginTop: 12
  },
  routeLabel: {
    color: "#087263",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  routeText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4
  },
  routeArrow: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 8
  },
  metaText: {
    color: "#6B7280",
    fontSize: 13,
    marginTop: 2
  },
  requestCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginTop: 12
  },
  requestCardActive: {
    borderColor: "#0F8B7A",
    backgroundColor: "#F0FDFA"
  },
  requestHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between"
  },
  requestTitle: {
    color: "#111827",
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "900"
  },
  requestMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10
  },
  metaPill: {
    color: "#087263",
    backgroundColor: "#ECFDF5",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "800",
    marginRight: 8,
    marginBottom: 6
  },
  requestActions: {
    flexDirection: "row",
    marginHorizontal: -4,
    marginTop: 8
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#0F8B7A",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginHorizontal: 4,
    paddingHorizontal: 8
  },
  actionButtonIcon: {
    marginRight: 5
  },
  actionButtonMuted: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  actionButtonLight: {
    backgroundColor: "#ECFDF5"
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  actionButtonMutedText: {
    color: "#111827"
  },
  actionButtonLightText: {
    color: "#087263"
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 38,
    paddingHorizontal: 12
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16
  },
  emptyTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center"
  },
  emptySubtitle: {
    color: "#6B7280",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28
  },
  loadingText: {
    color: "#6B7280",
    fontSize: 14,
    marginTop: 10
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingVertical: 14
  },
  historyIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  historyBody: {
    flex: 1,
    paddingRight: 8
  },
  historyTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900"
  },
  historyRoute: {
    color: "#6B7280",
    fontSize: 13,
    marginTop: 3
  },
  historyAmount: {
    alignItems: "flex-end",
    maxWidth: 112
  },
  historyDate: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 3,
    textAlign: "right"
  },
  error: {
    color: "#B45309",
    marginTop: 10,
    fontWeight: "800"
  },
  pressed: {
    opacity: 0.86
  },
  disabled: {
    opacity: 0.55
  }
}));
