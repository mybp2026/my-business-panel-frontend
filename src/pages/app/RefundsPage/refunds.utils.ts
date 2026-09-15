export const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString("es-CR") : "—";

export const formatCurrency = (value: number, symbol = "Bs.") =>
  `${symbol} ${Number(value).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`;

export const isUUID = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);