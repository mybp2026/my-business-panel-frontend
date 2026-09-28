import { LogoMark } from "@/assets/icons";

interface PageLoaderProps {
  label?: string;
}

export function PageLoader({ label = "Cargando..." }: PageLoaderProps) {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 p-6">
      <LogoMark size={40} animated />
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
