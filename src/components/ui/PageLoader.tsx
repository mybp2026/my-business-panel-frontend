interface PageLoaderProps {
  label?: string;
}

export function PageLoader({ label = "Cargando..." }: PageLoaderProps) {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 p-6">
      <span className="inline-block w-10 h-10 border-4 border-accent-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
