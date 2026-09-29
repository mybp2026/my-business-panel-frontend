import { url } from ".";

// Un solo refresh en vuelo aunque varios fetch reciban 401 a la vez.
let refreshInFlight: Promise<boolean> | null = null;

async function requestRefresh(): Promise<boolean> {
  try {
    const response = await fetch(`${url}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = requestRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}
