import { useNavigate } from "react-router-dom";
import { IconMenu, IconUser, LogoMark } from "@/assets/icons";
import { CurrencyToggle } from "@/components/layout/CurrencyToggle";
import { FinanceRateBadge } from "@/components/finances/FinanceRateBadge";
import { useAuth } from "@/context/AuthContext";
import { useSellerDisplayName } from "@/hooks/useSellerDisplayName";

interface AppHeaderProps {
  onMenuOpen: () => void;
}

export function AppHeader({ onMenuOpen }: AppHeaderProps) {
  const { user } = useAuth();
  const sellerDisplayName = useSellerDisplayName(user);
  const navigate = useNavigate();

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-300 bg-white px-4 shadow-xs">
      <button
        aria-label="menu"
        onClick={onMenuOpen}
        className="cursor-pointer rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 lg:hidden"
      >
        <IconMenu />
      </button>
      <button
        type="button"
        onClick={() => navigate("/app/dashboard")}
        className="font-display flex flex-1 items-center gap-2 lg:flex-none cursor-pointer"
      >
        <div className="text-accent-600">
          <LogoMark size={22} />
        </div>
        <span className="text-sm font-bold text-gray-900">
          My Business Panel
        </span>
      </button>
      {sellerDisplayName && (
        <div className="hidden items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm lg:flex">
          <IconUser />
          <span className="font-semibold text-gray-900">
            {sellerDisplayName}
          </span>
        </div>
      )}
      {/* Espaciador en desktop: sidebar ya muestra logo/tenant, el header
          solo aloja vendedor y toggle de moneda universal. */}
      <div className="hidden flex-1 lg:block" />
      <FinanceRateBadge />

      <CurrencyToggle />
    </header>
  );
}
