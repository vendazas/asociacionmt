export const AppRoles = Object.freeze({
  CUSTOMER: "CUSTOMER",
  DRIVER: "DRIVER",
  ASSOCIATION_ADMIN: "ASSOCIATION_ADMIN"
});

export const AppModes = Object.freeze({
  PASSENGER: "PASSENGER",
  DRIVER: "DRIVER",
  ASSOCIATION_ADMIN: "ASSOCIATION_ADMIN"
});

export const roleLabels = {
  [AppRoles.CUSTOMER]: "Cliente",
  [AppRoles.DRIVER]: "Motociclista",
  [AppRoles.ASSOCIATION_ADMIN]: "Admin Asociacion"
};

export const modeLabels = {
  [AppModes.PASSENGER]: "Pasajero",
  [AppModes.DRIVER]: "Mototaxista",
  [AppModes.ASSOCIATION_ADMIN]: "Admin"
};

export function modesForRole(role) {
  if (role === AppRoles.DRIVER) {
    return [AppModes.DRIVER, AppModes.PASSENGER];
  }

  if (role === AppRoles.CUSTOMER) {
    return [AppModes.PASSENGER];
  }

  if (role === AppRoles.ASSOCIATION_ADMIN) {
    return [AppModes.ASSOCIATION_ADMIN];
  }

  return [];
}
