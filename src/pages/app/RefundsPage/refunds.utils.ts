export const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString("es-CR") : "—";

export const isUUID = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);