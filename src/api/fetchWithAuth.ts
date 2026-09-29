import { refreshSession } from "./refreshSession";

let installed = false;

function isAuthEndpoint(input: RequestInfo | URL): boolean {
  const requestUrl =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  return requestUrl.includes("/auth/");
}

/**
 * Parchea window.fetch una sola vez para que cualquier 401 dispare un
 * refresh de sesion y reintente la request original antes de propagar el
 * error. La mayoria de src/api/*.ts llama a fetch directamente (no todos
 * pasan por la instancia axios de src/api/api.ts), asi que interceptar a
 * este nivel cubre todos los dominios sin tocar cada archivo uno por uno.
 */
export function installFetchAuthInterceptor(): void {
  if (installed) return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input, init);

    if (response.status !== 401 || isAuthEndpoint(input)) {
      return response;
    }

    const refreshed = await refreshSession();
    if (!refreshed) return response;

    return originalFetch(input, init);
  };
}
