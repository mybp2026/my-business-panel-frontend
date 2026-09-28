import { HrTabbedPage } from "./HrTabbedPage";
import { DeductionsSection } from "./sections/DeductionsSection";
import { OvertimeSection } from "./sections/OvertimeSection";
import { ProfitSharingSection } from "./sections/ProfitSharingSection";
import { SeveranceSection } from "./sections/SeveranceSection";
import { VacationsSection } from "./sections/VacationsSection";

/**
 * Beneficios acumulables (Arts. 131, 142, 190, 192) y novedades que
 * suben o bajan el pago del periodo (Arts. 117, 118, 120, 152, 154,
 * 178, 182, 412, 413) — unificados en una sola ruta con pestanas.
 */
export function HRBenefitsPage() {
  return (
    <HrTabbedPage
      title="Beneficios y deducciones"
      description="Vacaciones, prestaciones sociales, utilidades, horas con recargo y deducciones del periodo."
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
        {
          id: "overtime",
          label: "Horas con recargo",
          scope: "employee",
          render: () => <OvertimeSection />,
        },
        {
          id: "deductions",
          label: "Deducciones",
          scope: "employee",
          render: () => <DeductionsSection />,
        },
      ]}
    />
  );
}
