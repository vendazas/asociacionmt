export function getApiError(error, fallback = "No se pudo completar la operacion.") {
  return error?.response?.data?.error?.message || fallback;
}
