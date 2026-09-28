import { useState, type ReactNode } from "react";

import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { PageHeaderBanner } from "@/components/layout/PageHeaderBanner";
import { HrEmployeeProvider, useHrEmployee } from "@/context/HrEmployeeContext";

export interface HrTab {
  id: string;
  label: string;
  /**
   * "employee" muestra el selector de empleado compartido y solo
   * renderiza el contenido cuando hay uno elegido. "tenant" es para
   * pestanas que operan sobre toda la empresa (turnos, parametros).
   */
  scope: "employee" | "tenant";
  render: () => ReactNode;
}

interface HrTabbedPageProps {
  title: string;
  description: string;
  tabs: HrTab[];
}

function HrTabbedPageContent({ title, description, tabs }: HrTabbedPageProps) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");
  const { employeeId, setEmployeeId, employeeOptions } = useHrEmployee();

  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];
  const needsEmployee = activeTab?.scope === "employee";

  return (
    <div className="p-6 lg:p-8">
      <PageHeaderBanner eyebrow="HR" title={title} description={description} />

      <div className="mb-6">
        <Tabs
          tabs={tabs.map(({ id, label }) => ({ id, label }))}
          activeId={activeTab?.id ?? ""}
          onChange={setActiveId}
        />
      </div>

      {needsEmployee && (
        <div className="mb-6 rounded-2xl border border-gray-300 bg-white p-6">
          <Select
            label="Empleado"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            options={employeeOptions}
            placeholder="Selecciona un empleado"
          />
          <p className="mt-2 text-sm text-gray-500">
            El empleado elegido se mantiene al cambiar de pestana.
          </p>
        </div>
      )}

      {needsEmployee && !employeeId ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          Selecciona un empleado para ver esta seccion.
        </div>
      ) : (
        activeTab?.render()
      )}
    </div>
  );
}

/**
 * Cascaron comun de los modulos de HR: titulo, pestanas y — cuando
 * la pestana activa lo necesita — un unico selector de empleado
 * compartido entre todas.
 */
export function HrTabbedPage(props: HrTabbedPageProps) {
  return (
    <HrEmployeeProvider>
      <HrTabbedPageContent {...props} />
    </HrEmployeeProvider>
  );
}
