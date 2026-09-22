import { HrTabbedPage } from "./HrTabbedPage";
import { DeductionsSection } from "./sections/DeductionsSection";
import { OvertimeSection } from "./sections/OvertimeSection";

/**
 * Novedades que suben o bajan el pago del periodo: recargos (Arts. 117,
 * 118, 120, 178, 182) y deducciones (Arts. 152, 154, 412, 413).
 */
export function HRCompensationPage() {
  return (
    <HrTabbedPage
      title="Novedades de nómina"
      description="Horas con recargo y deducciones del periodo — alimentan directamente la corrida de nómina."
      tabs={[
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
