import { HrTabbedPage } from "./HrTabbedPage";
import { BeneficiariesSection } from "./sections/BeneficiariesSection";
import { SettlementSection } from "./sections/SettlementSection";

/**
 * Cierre de la relacion laboral: causal de egreso, liquidacion
 * completa (Arts. 92, 106, 142, 195, 196) y, si hubo fallecimiento,
 * reparto entre herederos (Art. 145).
 */
export function HROffboardingPage() {
  return (
    <HrTabbedPage
      title="Egreso y liquidación"
      description="Registro del egreso, desglose auditable de la liquidación final y reparto entre beneficiarios."
      tabs={[
        {
          id: "settlement",
          label: "Liquidación final",
          scope: "employee",
          render: () => <SettlementSection />,
        },
        {
          id: "beneficiaries",
          label: "Beneficiarios",
          scope: "employee",
          render: () => <BeneficiariesSection />,
        },
      ]}
    />
  );
}
