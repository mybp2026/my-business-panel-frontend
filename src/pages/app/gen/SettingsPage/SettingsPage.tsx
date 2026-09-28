import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLoaderData, useSearchParams } from "react-router-dom";

import { SegmentsTab } from "./SegmentsTab";
import { LoyaltyTab } from "./LoyaltyTab";
import { ExchangeRateTab } from "./ExchangeRateTab";
import { PageHeaderBanner } from "@/components/layout/PageHeaderBanner";
import { DeferredPage } from "@/components/routing/DeferredPage";
import type { Segment } from "@/interfaces/entities/Segment.interface";
import type { Margin } from "@/interfaces/entities/Margin.interface";

type Tab = "segments" | "loyalty" | "exchange_rate";

interface SettingsPageLoaderData {
  segments: Segment[];
  margins: Margin[];
}

export function SettingsPage() {
  const { data } = useLoaderData() as { data: Promise<SettingsPageLoaderData> };

  return (
    <DeferredPage resolve={data}>
      {({ segments, margins }) => (
        <SettingsPageContent segments={segments} margins={margins} />
      )}
    </DeferredPage>
  );
}

const isTab = (value: string | null): value is Tab =>
  value === "segments" || value === "loyalty" || value === "exchange_rate";

function SettingsPageContent({ segments, margins }: SettingsPageLoaderData) {
  const { user: currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const requested = searchParams.get("tab");
    return isTab(requested) ? requested : "segments";
  });

  const tenantId = currentUser?.tenant.tenant_id || "";

  const tabs: { key: Tab; label: string }[] = [
    { key: "segments", label: "Segmentos y Márgenes" },
    { key: "loyalty", label: "Programa de Lealtad" },
    { key: "exchange_rate", label: "Tasa de Cambio" },
  ];

  return (
    <div className="p-6 lg:p-8">
      <PageHeaderBanner
        eyebrow="General"
        title="Configuración"
        description="Configura segmentos de clientes, programa de lealtad y tasa de cambio"
      />

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-300 overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 cursor-pointer min-w-max px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? "text-white bg-accent-950"
                  : "text-gray-600 border-l border-gray-200 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "segments" && (
            <SegmentsTab
              tenantId={tenantId}
              segments={segments}
              margins={margins}
            />
          )}
          {activeTab === "loyalty" && <LoyaltyTab tenantId={tenantId} />}
          {activeTab === "exchange_rate" && <ExchangeRateTab />}
        </div>
      </div>
    </div>
  );
}
