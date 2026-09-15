import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLoaderData } from "react-router-dom";

import { SegmentsTab } from "./SegmentsTab";
import { LoyaltyTab } from "./LoyaltyTab";
import { ExchangeRateTab } from "./ExchangeRateTab";
import type { Segment } from "@/interfaces/entities/Segment.interface";
import type { Margin } from "@/interfaces/entities/Margin.interface";

type Tab = "segments" | "loyalty" | "exchange_rate";

export function SettingsPage() {
  const { segments } = useLoaderData() as { segments: Segment[] };
  const { margins } = useLoaderData() as { margins: Margin[] };
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("segments");

  const tenantId = currentUser?.tenant.tenant_id || "";

  const tabs: { key: Tab; label: string }[] = [
    { key: "segments", label: "Segmentos y Márgenes" },
    { key: "loyalty", label: "Programa de Lealtad" },
    { key: "exchange_rate", label: "Tasa de Cambio" },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuración</h1>
        <p className="text-gray-600">
          Configura segmentos de clientes, programa de lealtad y tasa de
          cambio
        </p>
      </div>

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
