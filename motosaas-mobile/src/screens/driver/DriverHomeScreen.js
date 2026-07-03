import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
  Bell,
  Briefcase,
  ChevronRight,
  CircleCheckBig,
  CircleDollarSign,
  Ellipsis,
  House,
  LocateFixed,
  MapPinned,
  Route,
  Scooter,
  SendHorizontal,
  Star,
  User,
  Wallet,
  X
} from "lucide-react-native";
import { AppModes, modeLabels } from "../../config/roles";
import { driversApi, reportsApi, tripsApi } from "../../api/resources";
import { useAuth } from "../../providers/AuthProvider";

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

export function DriverHomeScreen() {
  const { activeMode, availableModes, logout, session, setActiveMode } = useAuth();
  const queryClient = useQueryClient();
  const scrollRef = useRef(null);
  const mapRef = useRef(null);
  const [sectionPositions, setSectionPositions] = useState({});
  const [location] = useState({ latitude: "-17.7833", longitude: "-63.1821" });
  const [available, setAvailable] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(false);
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
    if (!autoUpdate) {
      return undefined;
    }

    const timer = setInterval(() => updateLocation.mutate(available), 15000);
    return () => clearInterval(timer);
  }, [autoUpdate, available]);

  const currentTrip = useQuery({
    queryKey: ["driver-current-trip"],
    queryFn: tripsApi.current,
    refetchInterval: 5000
  });

  const history = useQuery({
    queryKey: ["driver-history"],
    queryFn: () => tripsApi.history({ limit: 20 }),
    refetchInterval: 10000
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
    refetchInterval: 5000,
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
    queryFn: reportsApi.driverEarnings,
    refetchInterval: 15000
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

  function captureSection(name) {
    return (event) => {
      const { y } = event.nativeEvent.layout;
      setSectionPositions((current) => ({ ...current, [name]: y }));
    };
  }

  function scrollToSection(name) {
    const y = sectionPositions[name] || 0;
    scrollRef.current?.scrollTo({ y: Math.max(y - 12, 0), animated: true });
  }

  function centerOnLocation() {
    mapRef.current?.animateToRegion(region, 350);
  }

  function refreshLocation() {
    centerOnLocation();
    updateLocation.mutate(available);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appShell}>
        <ScrollView
          ref={scrollRef}
          style={styles.screen}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header} onLayout={captureSection("home")}>
            <View style={styles.profile}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(session?.user)}</Text>
              </View>
              <View style={styles.profileText}>
                <Text style={styles.greeting} numberOfLines={1}>
                  Hola, {userName}
                </Text>
                <Text style={styles.role}>Mototaxista</Text>
                <Text style={styles.email} numberOfLines={1}>
                  {session?.user?.email || "Cuenta activa"}
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <Pressable style={styles.iconButton} onPress={() => scrollToSection("trips")}>
                <Bell color="#6B7280" size={iconSize(24)} strokeWidth={ICON_STROKE} />
                {pendingTrips.length ? <View style={styles.notificationDot} /> : null}
              </Pressable>
              <Pressable style={styles.logoutButton} onPress={logout}>
                <Text style={styles.logoutText}>Salir</Text>
              </Pressable>
            </View>
          </View>

          {availableModes.length > 1 ? (
            <View style={styles.modeSelector}>
              {[AppModes.DRIVER, AppModes.PASSENGER]
                .filter((mode) => availableModes.includes(mode))
                .map((mode) => {
                  const isActive = activeMode === mode;
                  return (
                    <Pressable
                      key={mode}
                      onPress={() => setActiveMode(mode)}
                      style={({ pressed }) => [
                        styles.modeOption,
                        isActive ? styles.modeOptionActive : null,
                        pressed ? styles.pressed : null
                      ]}
                    >
                      <View style={[styles.modeBadge, isActive ? styles.modeBadgeActive : null]}>
                        {mode === AppModes.DRIVER ? (
                          <Scooter
                            color={isActive ? "#FFFFFF" : "#6B7280"}
                            size={iconSize(22)}
                            strokeWidth={ICON_STROKE}
                          />
                        ) : (
                          <User
                            color={isActive ? "#FFFFFF" : "#6B7280"}
                            size={iconSize(22)}
                            strokeWidth={ICON_STROKE}
                          />
                        )}
                      </View>
                      <Text style={[styles.modeOptionText, isActive ? styles.modeOptionTextActive : null]}>
                        {modeLabels[mode]}
                      </Text>
                    </Pressable>
                  );
                })}
            </View>
          ) : null}

          <View style={styles.mapCard}>
            <MapView ref={mapRef} style={styles.map} region={region} toolbarEnabled={false}>
              <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} title="Mi ubicacion">
                <View style={styles.currentMarkerHalo}>
                  <View style={styles.currentMarkerDot} />
                </View>
              </Marker>
              {originCoordinate ? <Marker coordinate={originCoordinate} pinColor="#0F8B7A" title="Origen" /> : null}
              {destinationCoordinate ? (
                <Marker coordinate={destinationCoordinate} pinColor="#F59E0B" title="Destino" />
              ) : null}
            </MapView>

            <Pressable style={styles.centerButton} onPress={centerOnLocation}>
              <LocateFixed color="#0F8B7A" size={iconSize(26)} strokeWidth={ICON_STROKE} />
            </Pressable>

            <View style={styles.availabilityCard}>
              <View style={styles.availabilityCopy}>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, available || activeTrip ? styles.statusDotActive : null]} />
                  <Text style={styles.availabilityTitle}>{availabilityTitle}</Text>
                </View>
                <Text style={styles.availabilityDescription}>{availabilityDescription}</Text>
              </View>
              <Switch
                value={available}
                onValueChange={changeAvailability}
                disabled={Boolean(activeTrip)}
                trackColor={{ false: "#D1D5DB", true: "#0F8B7A" }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#D1D5DB"
              />
            </View>
          </View>

          <View style={styles.locationPanel}>
            <Pressable
              disabled={updateLocation.isPending}
              onPress={refreshLocation}
              style={({ pressed }) => [
                styles.updateButton,
                pressed ? styles.pressed : null,
                updateLocation.isPending ? styles.disabled : null
              ]}
            >
              {updateLocation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View style={styles.updateButtonContent}>
                  <MapPinned color="#FFFFFF" size={iconSize(20)} strokeWidth={ICON_STROKE} />
                  <Text style={styles.updateButtonText}>Actualizar ubicacion</Text>
                </View>
              )}
            </Pressable>

            <View style={styles.autoUpdateRow}>
              <View>
                <Text style={styles.autoUpdateTitle}>Auto actualizacion</Text>
                <Text style={styles.technicalText}>
                  Coord. {Number(location.latitude).toFixed(4)}, {Number(location.longitude).toFixed(4)}
                </Text>
              </View>
              <Switch
                value={autoUpdate}
                onValueChange={setAutoUpdate}
                trackColor={{ false: "#D1D5DB", true: "#0F8B7A" }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#D1D5DB"
              />
            </View>

            {updateLocation.error ? <Text style={styles.error}>{apiMessage(updateLocation.error)}</Text> : null}
          </View>

          <View style={styles.metricsGrid} onLayout={captureSection("earnings")}>
            <MetricCard
              accent="#8BD96B"
              Icon={Briefcase}
              label="Viajes completados"
              value={earnings.data?.completedTrips || 0}
              detail="Hoy"
            />
            <MetricCard
              accent="#FBBF24"
              Icon={CircleDollarSign}
              label="Ganancias hoy"
              value={formatMoney(earnings.data?.grossEarnings)}
              detail="Total"
            />
            <MetricCard
              accent="#3B82F6"
              Icon={Star}
              label="Calificacion"
              value={ratingValue ? Number(ratingValue).toFixed(1) : "-"}
              detail={ratingValue ? "Promedio" : "Sin datos"}
            />
          </View>

          {activeTrip ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>Viaje activo</Text>
                  <Text style={styles.cardSubtitle}>{readableStatus(activeTrip.status)}</Text>
                </View>
                <Text style={styles.amountText}>{formatMoney(activeTrip.estimated_fare)}</Text>
              </View>
              <View style={styles.routeBox}>
                <Text style={styles.routeLabel}>Origen</Text>
                <Text style={styles.routeText}>{placeLabel(activeTrip.origin, "Origen sin direccion")}</Text>
                <Text style={styles.routeArrow}>to</Text>
                <Text style={styles.routeLabel}>Destino</Text>
                <Text style={styles.routeText}>{placeLabel(activeTrip.destination, "Destino sin direccion")}</Text>
              </View>
              <Text style={styles.metaText}>Pasajero: {activeTrip.customer?.full_name || "-"}</Text>
              {activeAction ? (
                <ActionButton
                  label={activeAction}
                  onPress={runActiveAction}
                  disabled={actionMutation.isPending || finishMutation.isPending}
                  Icon={CircleCheckBig}
                />
              ) : null}
              {actionMutation.error ? <Text style={styles.error}>{apiMessage(actionMutation.error)}</Text> : null}
              {finishMutation.error ? <Text style={styles.error}>{apiMessage(finishMutation.error)}</Text> : null}
            </View>
          ) : null}

          {!activeTrip ? (
            <View style={styles.card} onLayout={captureSection("trips")}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Solicitudes pendientes</Text>
                <Pressable onPress={() => scrollToSection("trips")}>
                  <Text style={styles.linkText}>Ver todas</Text>
                </Pressable>
              </View>

              {!available ? (
                <EmptyState
                  title="Disponibilidad pausada"
                  subtitle="Activa tu estado para empezar a recibir solicitudes."
                />
              ) : null}

              {available && openTrips.isFetching && !pendingTrips.length ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator color="#0F8B7A" />
                  <Text style={styles.loadingText}>Buscando solicitudes cercanas</Text>
                </View>
              ) : null}

              {available && !openTrips.isFetching && !pendingTrips.length ? (
                <EmptyState
                  title="No tienes solicitudes pendientes"
                  subtitle="Te notificaremos cuando tengas una nueva solicitud"
                />
              ) : null}

              {pendingTrips.map((trip) => (
                <View
                  key={trip.id}
                  style={[styles.requestCard, selectedRequest?.id === trip.id ? styles.requestCardActive : null]}
                >
                  <View style={styles.requestHeader}>
                    <View>
                      <Text style={styles.requestTitle}>Nueva solicitud</Text>
                      <Text style={styles.metaText}>Cliente: {trip.customer?.full_name || "-"}</Text>
                    </View>
                    <Text style={styles.amountText}>{formatMoney(trip.estimated_fare)}</Text>
                  </View>

                  <View style={styles.routeBoxCompact}>
                    <Text style={styles.routeText}>{placeLabel(trip.origin, "Origen sin direccion")}</Text>
                    <Text style={styles.routeArrow}>to</Text>
                    <Text style={styles.routeText}>{placeLabel(trip.destination, "Destino sin direccion")}</Text>
                  </View>

                  <View style={styles.requestMetaRow}>
                    <Text style={styles.metaPill}>Distancia {formatDistance(trip.estimated_distance_km)}</Text>
                    <Text style={styles.metaPill}>{readableStatus(trip.status)}</Text>
                  </View>

                  <View style={styles.requestActions}>
                    <ActionButton
                      label="Ver ruta"
                      variant="light"
                      onPress={() => setSelectedRequest(trip)}
                      Icon={Route}
                    />
                    <ActionButton
                      label="Rechazar"
                      variant="muted"
                      disabled={actionMutation.isPending}
                      onPress={() => actionMutation.mutate({ action: "reject", tripId: trip.id })}
                      Icon={X}
                    />
                    <ActionButton
                      label="Aceptar"
                      disabled={!available || actionMutation.isPending}
                      onPress={() => actionMutation.mutate({ action: "accept", tripId: trip.id })}
                      Icon={CircleCheckBig}
                    />
                  </View>
                </View>
              ))}

              {openTrips.error ? <Text style={styles.error}>{apiMessage(openTrips.error)}</Text> : null}
              {actionMutation.error && !activeTrip ? <Text style={styles.error}>{apiMessage(actionMutation.error)}</Text> : null}
            </View>
          ) : null}

          <View style={styles.card} onLayout={captureSection("history")}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Historial reciente</Text>
              <Pressable onPress={() => scrollToSection("history")}>
                <Text style={styles.linkText}>Ver todo</Text>
              </Pressable>
            </View>

            {(history.data?.items || []).slice(0, 5).map((trip) => (
              <View key={trip.id} style={styles.historyItem}>
                <View style={styles.historyIcon}>
                  <CircleCheckBig color="#087263" size={iconSize(24)} strokeWidth={ICON_STROKE} />
                </View>
                <View style={styles.historyBody}>
                  <Text style={styles.historyTitle}>{readableStatus(trip.status)}</Text>
                  <Text style={styles.historyRoute} numberOfLines={1}>
                    {placeLabel(trip.origin, "Origen")} to {placeLabel(trip.destination, "Destino")}
                  </Text>
                </View>
                <View style={styles.historyAmount}>
                  <Text style={styles.amountText}>{formatMoney(trip.final_fare || trip.estimated_fare)}</Text>
                  <Text style={styles.historyDate}>{formatDateTime(trip.requested_at)}</Text>
                </View>
                <ChevronRight color="#9CA3AF" size={iconSize(24)} strokeWidth={ICON_STROKE} />
              </View>
            ))}

            {history.isLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator color="#0F8B7A" />
              </View>
            ) : null}

            {!history.isLoading && !history.data?.items?.length ? (
              <EmptyState title="Aun no tienes viajes" subtitle="Tu historial aparecera cuando completes servicios." />
            ) : null}
          </View>
        </ScrollView>

        <BottomNavigation
          onHome={() => scrollToSection("home")}
          onTrips={() => scrollToSection("trips")}
          onRefresh={refreshLocation}
          onEarnings={() => scrollToSection("earnings")}
          onMore={() => scrollToSection("history")}
          refreshing={updateLocation.isPending}
        />
      </View>
    </SafeAreaView>
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

function BottomNavigation({ onEarnings, onHome, onMore, onRefresh, onTrips, refreshing }) {
  return (
    <View style={styles.bottomNav}>
      <BottomNavItem active Icon={House} label="Inicio" onPress={onHome} />
      <BottomNavItem Icon={Briefcase} label="Viajes" onPress={onTrips} />
      <View style={styles.refreshNavSlot}>
        <Pressable
          disabled={refreshing}
          onPress={onRefresh}
          style={({ pressed }) => [styles.refreshNavButton, pressed ? styles.pressed : null, refreshing ? styles.disabled : null]}
        >
          {refreshing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <SendHorizontal color="#FFFFFF" size={iconSize(27)} strokeWidth={ICON_STROKE} />
          )}
        </Pressable>
        <Text style={styles.refreshNavLabel}>Actualizar</Text>
      </View>
      <BottomNavItem Icon={Wallet} label="Ganancias" onPress={onEarnings} />
      <BottomNavItem Icon={Ellipsis} label="Mas" onPress={onMore} />
    </View>
  );
}

function BottomNavItem({ active = false, Icon, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.navItem, pressed ? styles.pressed : null]}>
      <Icon color={active ? "#0F8B7A" : "#6B7280"} size={iconSize(24)} strokeWidth={ICON_STROKE} />
      <Text style={[styles.navLabel, active ? styles.navLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create(compactStyles({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F8FA"
  },
  appShell: {
    flex: 1,
    backgroundColor: "#F7F8FA"
  },
  screen: {
    flex: 1,
    backgroundColor: "#F7F8FA"
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 22
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center"
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  notificationDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#0F8B7A"
  },
  logoutButton: {
    minHeight: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  logoutText: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "800"
  },
  modeSelector: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 5,
    marginTop: 22,
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
  mapCard: {
    height: 336,
    marginTop: 20,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4
  },
  map: {
    ...StyleSheet.absoluteFillObject
  },
  currentMarkerHalo: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "rgba(15,139,122,0.16)",
    alignItems: "center",
    justifyContent: "center"
  },
  currentMarkerDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#2563EB",
    borderWidth: 3,
    borderColor: "#FFFFFF"
  },
  centerButton: {
    position: "absolute",
    right: 18,
    top: 138,
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
  availabilityCard: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    minHeight: 82,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
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
    backgroundColor: "#22C55E"
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
  locationPanel: {
    marginTop: 14,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14
  },
  updateButton: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F8B7A"
  },
  updateButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  updateButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 8
  },
  autoUpdateRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  autoUpdateTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "800"
  },
  technicalText: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 3
  },
  metricsGrid: {
    flexDirection: "row",
    marginTop: 16,
    marginHorizontal: -4
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
  linkText: {
    color: "#087263",
    fontSize: 14,
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
    fontSize: 16,
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
  bottomNav: {
    minHeight: 80,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -8 },
    elevation: 8
  },
  refreshNavSlot: {
    width: 76,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 66
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 58
  },
  navLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4
  },
  navLabelActive: {
    color: "#0F8B7A"
  },
  refreshNavButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#0F8B7A",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
    marginTop: -28,
    shadowColor: "#0F8B7A",
    shadowOpacity: 0.34,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8
  },
  refreshNavLabel: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 5
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
