import { Suspense, useEffect, type ReactNode } from "react";
import { Await, useAsyncError, useNavigate } from "react-router-dom";
import { PageLoader } from "@/components/ui/PageLoader";

interface DeferredPageProps<T> {
  resolve: Promise<T>;
  children: (data: T) => ReactNode;
  fallback?: ReactNode;
  errorMessage?: string;
}

/**
 * `withAuthCheck` lanza `redirect()` (una Response 3xx) cuando la sesión
 * expiró. Como el loader ya no bloquea la navegación, React Router no
 * intercepta esa Response como lo haría en un loader síncrono — llega aquí
 * como un error de `<Await>`. La detectamos y navegamos manualmente.
 */
function DeferredError({ errorMessage }: { errorMessage: string }) {
  const error = useAsyncError();
  const navigate = useNavigate();

  const redirectTo =
    error instanceof Response && error.status >= 300 && error.status < 400
      ? error.headers.get("Location")
      : null;

  useEffect(() => {
    if (redirectTo) navigate(redirectTo, { replace: true });
  }, [redirectTo, navigate]);

  if (redirectTo) return null;

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
      <p className="text-sm text-red-600">{errorMessage}</p>
    </div>
  );
}

export function DeferredPage<T>({
  resolve,
  children,
  fallback = <PageLoader />,
  errorMessage = "No se pudo cargar la información de esta página.",
}: DeferredPageProps<T>) {
  return (
    <Suspense fallback={fallback}>
      <Await
        resolve={resolve}
        errorElement={<DeferredError errorMessage={errorMessage} />}
      >
        {(data) => children(data as T)}
      </Await>
    </Suspense>
  );
}
