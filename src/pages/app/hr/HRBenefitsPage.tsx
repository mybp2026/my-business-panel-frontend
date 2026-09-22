import { HrTabbedPage } from "./HrTabbedPage";
import { ProfitSharingSection } from "./sections/ProfitSharingSection";
import { SeveranceSection } from "./sections/SeveranceSection";
import { VacationsSection } from "./sections/VacationsSection";

/**
 * Beneficios acumulables del trabajador: lo que se le va causando
 * mientras la relacion esta viva (Arts. 131, 142, 190, 192).
 */
export function HRBenefitsPage() {
  return (
    <HrTabbedPage
      title="Beneficios y prestaciones"
      description="Vacaciones, bono vacacional, garantia de prestaciones y utilidades (Arts. 131, 142, 143, 190, 192)."
      tabs={[
        {
          id: "vacations",
          label: "Vacaciones",
          scope: "employee",
          render: () => <VacationsSection />,
        },
        {
          id: "severance",
          label: "Prestaciones sociales",
          scope: "employee",
          render: () => <SeveranceSection />,
        },
        {
          id: "profit-sharing",
          label: "Utilidades",
          scope: "tenant",
          render: () => <ProfitSharingSection />,
        },
      ]}
    />
  );
}
