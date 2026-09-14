export interface HrPaymentSchedule {
  payment_schedule_id: number;
  description: string;
  daycount: number;
}

export interface HrDutiesType {
  duties_type_id: number;
  tenant_id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface HrEmployeeRecord {
  employee_id: string;
  user_id: string | null;
  tenant_id: string;
  branch_id: string;
  branch_name: string;
  contract_id: string;
  first_name: string;
  last_name: string;
  doc_number: string;
  phone: string;
  email: string;
  payment_schedule_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  start_date: string;
  end_date: string;
  hours: number;
  base_salary: number;
  duties: string | null;
  duties_type_id: number | null;
  duties_type_name: string | null;
  duties_type_description?: string | null;
  turn_type: number;
  turn_id: number;
}

export interface HrTurn {
  turn_id: number;
  branch_id: string;
  entry: string;
  out: string;
}

export interface HrClockingRecord {
  clocking_id: number;
  employee_id: string;
  branch_id: string;
  branch_name: string;
  first_name: string;
  last_name: string;
  clock_in: string;
  clock_out: string | null;
  turn_hours: number;
}

export interface HrTardinessRecord {
  type: string;
  log: string;
  registered_at: string;
}

export interface HrTardinessSummary {
  tardiness: HrTardinessRecord[];
  totalCount: number;
}

export interface HrFoulRecord {
  foul_id?: number;
  employee_id?: string;
  branch_id?: string;
  identificator: string;
  foul_date: string;
  foul_hour: string;
  description: string;
}

export interface HrFoulSummary {
  totalFouls: number;
  fouls: HrFoulRecord[];
}

export interface HrSuspention {
  suspention_id: number;
  employee_id: string;
  branch_id: string;
  suspention_start: string;
  suspention_end: string;
  reason: string;
  is_active: boolean;
  created_at: string;
}

export interface HrIncapacity {
  incapacity_id: number;
  employee_id: string;
  branch_id: string;
  type: string;
  period_start: string;
  period_end: string;
  percentage_to_pay: number;
  days_paying: number;
  is_active: boolean;
}

export interface HrPayrollConcept {
  concept_id: number;
  name: string;
  type: "earning" | "deduction";
  calculation_method: "fixed" | "percentage" | "formula" | "manual";
  is_taxable: boolean;
  is_active?: boolean;
  base_value: number | string;
  code?: string;
}

export interface HrPaysheet {
  paysheet_id: string;
  tenant_id: string;
  branch_id: string;
  period_start: string;
  period_end: string;
  payment_date?: string | null;
  total_earnings: number;
  total_deductions: number;
  net_total: number;
  status_id: number;
  created_at: string;
  paysheet_status?: string;
}

export interface HrPaysheetDetail {
  detail_id: string;
  paysheet_id: string;
  employee_id: string;
  contract_id: string;
  payment_method_id: number;
  gross_salary: number;
  total_earnings: number;
  total_deduction: number;
  net_salary: number;
  status: string;
  pay_date: string;
  recalc_needed: boolean;
}

export interface HrPayrollMovement {
  movement_id: string;
  detail_id: string;
  concept_id: number;
  base_amount: number;
  calculated_amount: number;
  description?: string;
  employee_id: string;
  concept_name: string;
  concept_type: "earning" | "deduction";
}

export interface CreateHrConceptPayload {
  tenantId: string;
  name: string;
  type: "earning" | "deduction";
  calcMethod: "fixed" | "percentage" | "formula" | "manual";
  isTaxable: boolean;
  baseValue: number;
  code?: string;
}

export interface UpdateHrConceptPayload
  extends Partial<CreateHrConceptPayload> {}

export interface CreateHrPaysheetPayload {
  tenantId: string;
  branchId: string;
  periodStart: string;
  periodEnd: string;
}

export interface ProcessHrPayrollPayload {
  branch_id: string;
  tenant_id: string;
  period_start: string;
  period_end: string;
}

export interface CreateHrTurnPayload {
  branchId: string;
  entry: string;
  out: string;
}

export interface UpdateHrTurnPayload extends Partial<CreateHrTurnPayload> {}

export interface CreateHrClockInPayload {
  employeeId: string;
  branchId: string;
}

export interface ManualClockInPayload {
  employeeId: string;
  branchId: string;
  clockIn: string;
}

export interface HrPayrollParameter {
  parameter_id: string;
  tenant_id: string;
  param_key: string;
  param_value: number | string;
  valid_from: string;
  valid_to: string | null;
  source?: string | null;
  created_at: string;
}

export interface CreateHrPayrollParameterPayload {
  param_key: string;
  param_value: number;
  valid_from: string;
  source?: string;
}

export interface HrPayrollParametersMissing {
  date: string;
  missing: string[];
}

// ---------------------------------------------------------------
// Vacaciones (Arts. 190, 192, 195, 196)
// ---------------------------------------------------------------

export interface HrVacationPeriod {
  vacation_period_id: string;
  employee_id: string;
  tenant_id: string;
  service_year: number;
  period_start: string;
  period_end: string;
  days_earned: number | string;
  bonus_days_earned: number | string;
  days_taken: number | string;
  enjoyed_from: string | null;
  enjoyed_to: string | null;
  normal_daily_salary: number | string | null;
  paid_amount: number | string | null;
  bonus_paid_amount: number | string | null;
  is_fractional: boolean;
  status: "causado" | "disfrutando" | "disfrutado" | "pagado";
  created_at: string;
}

export interface HrVacationEntitlement {
  completeYears: number;
  vacationDays: number;
  bonusVacationDays?: number;
  article: string;
  [key: string]: unknown;
}

export interface EnjoyVacationPayload {
  enjoyed_from: string;
  enjoyed_to: string;
}

export interface PayVacationBonusPayload {
  paid_at?: string;
}

// ---------------------------------------------------------------
// Prestaciones sociales (Art. 142, 143, 144)
// ---------------------------------------------------------------

export interface HrSeveranceDeposit {
  deposit_id: string;
  employee_id: string;
  tenant_id: string;
  quarter_start: string;
  quarter_end: string;
  days: number | string;
  integral_daily_salary: number | string;
  amount: number | string;
  deposit_made: boolean;
  deposit_date: string | null;
  location: "fideicomiso" | "fondo_nacional" | "contabilidad";
  created_at: string;
}

export interface HrSeveranceInterest {
  interest_id: string;
  deposit_id: string | null;
  employee_id: string;
  tenant_id: string;
  period_month: string;
  balance_base: number | string;
  applied_rate: number | string;
  rate_kind: "fideicomiso" | "promedio_activa_pasiva" | "activa_bcv";
  amount: number | string;
  capitalized: boolean;
  paid_at: string | null;
  created_at: string;
}

export interface HrSeveranceAdvance {
  advance_id: string;
  employee_id: string;
  tenant_id: string;
  requested_amount: number | string;
  approved_amount: number | string | null;
  reason: "vivienda" | "hipoteca" | "educacion" | "salud";
  reason_detail?: string | null;
  request_date: string;
  resolution_date: string | null;
  status: "pendiente" | "aprobado" | "rechazado";
  guarantee_balance_at_request: number | string | null;
  created_at: string;
}

export interface HrSeveranceBalance {
  depositedAmount: string;
  capitalizedInterest: string;
  advancesApproved: string;
  balance: string;
}

export interface GenerateSeveranceDepositsPayload {
  employee_id: string;
  until: string;
  location: "fideicomiso" | "fondo_nacional" | "contabilidad";
}

export interface UpdateSeveranceDepositPayload {
  deposit_made: boolean;
  deposit_date?: string;
}

export interface GenerateSeveranceInterestPayload {
  employee_id: string;
  from: string;
  to: string;
}

export interface SettleSeveranceInterestPayload {
  employee_id: string;
  year: number;
  capitalize: boolean;
  authorization_ref?: string;
}

export interface CreateSeveranceAdvancePayload {
  employee_id: string;
  requested_amount: number;
  reason: "vivienda" | "hipoteca" | "educacion" | "salud";
  reason_detail?: string;
}

export interface ApproveSeveranceAdvancePayload {
  approved_amount: number;
  resolution_date: string;
}

export interface RejectSeveranceAdvancePayload {
  resolution_date: string;
  reason_detail?: string;
}

// ---------------------------------------------------------------
// Utilidades / bonificacion fin de anio (Arts. 131, 132, 136)
// ---------------------------------------------------------------

export interface HrProfitSharingPeriod {
  profit_period_id: string;
  tenant_id: string;
  fiscal_year: number;
  fiscal_year_start: string;
  fiscal_year_end: string;
  liquid_benefits: number | string | null;
  distribution_percentage: number | string;
  distributable_amount: number | string | null;
  total_earned_salaries: number | string | null;
  is_non_profit: boolean;
  status: "abierto" | "calculado" | "cerrado";
  closed_at: string | null;
  payment_deadline: string | null;
  created_at: string;
}

export interface HrProfitSharingDetail {
  profit_detail_id: string;
  profit_period_id: string;
  employee_id: string;
  earned_salary: number | string;
  complete_months: number;
  daily_salary: number | string;
  raw_quota: number | string | null;
  min_cap: number | string;
  max_cap: number | string;
  final_amount: number | string | null;
  advance_paid: number | string;
  advance_paid_at: string | null;
  created_at: string;
}

export interface CreateProfitPeriodPayload {
  fiscal_year: number;
  fiscal_year_start: string;
  fiscal_year_end: string;
  is_non_profit?: boolean;
}

export interface SetLiquidBenefitsPayload {
  liquid_benefits: number;
  source?: string;
}

export interface YearEndBonusPayload {
  employee_id: string;
  fiscal_year: number;
  amount: number;
  paid_at: string;
}

// ---------------------------------------------------------------
// Liquidacion final (Arts. 92, 106, 142, 144, 154, 195)
// ---------------------------------------------------------------

export interface HrSettlementItem {
  settlement_item_id: string;
  settlement_id: string;
  code: string;
  concept_name: string;
  article: string;
  salary_basis: "normal" | "integral";
  base_amount: number | string;
  days: number | string | null;
  amount: number | string;
  formula_text: string | null;
  sort_order: number;
}

export interface HrSettlement {
  settlement_id: string;
  employee_id: string;
  tenant_id: string;
  branch_id: string | null;
  termination_date: string;
  payment_due_date: string;
  payment_date: string | null;
  hire_date: string;
  complete_years: number;
  remainder_months: number;
  last_integral_daily_salary: number | string;
  last_normal_daily_salary: number | string;
  via1_amount: number | string | null;
  via2_amount: number | string | null;
  selected_via: string | null;
  severance_amount: number | string | null;
  advances_deducted: number | string;
  deductions_amount: number | string;
  subtotal: number | string | null;
  mora_days: number;
  mora_rate: number | string | null;
  mora_amount: number | string;
  total: number | string | null;
  status: "borrador" | "calculada" | "pagada" | "anulada";
  created_at: string;
  items?: HrSettlementItem[];
}

export interface HrSettlementPreview {
  employeeId: string;
  endDate: string;
  hireDate: string;
  completeYears: number;
  remainderMonths: number;
  lastIntegralDailySalary: string;
  via1Amount: string;
  via2Amount: string;
  selectedVia: string;
  severanceAmount: string;
  indemnityAmount: string;
  subtotal: string;
  moraDays: number;
  moraAmount: string;
  total: string;
  paymentDueDate: string;
  items?: HrSettlementItem[];
}

export interface CreateSettlementPayload {
  employee_id: string;
  termination_date: string;
}

export interface PaySettlementPayload {
  payment_date: string;
}

// ---------------------------------------------------------------
// Deducciones (Arts. 152, 154, 412, 413)
// ---------------------------------------------------------------

export interface HrEmployeeDeduction {
  deduction_id: string;
  employee_id: string;
  tenant_id: string;
  kind: "deuda_patrono" | "sindical" | "alimentaria" | "otra";
  description: string;
  total_amount: number | string;
  installment_amount: number | string | null;
  outstanding_balance: number | string;
  authorized: boolean;
  authorization_date: string | null;
  authorization_ref: string | null;
  union_organization: string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CreateDeductionPayload {
  employee_id: string;
  kind: "deuda_patrono" | "sindical" | "alimentaria" | "otra";
  description: string;
  total_amount: number;
  installment_amount?: number;
  union_organization?: string;
  authorized?: boolean;
  authorization_date?: string;
  authorization_ref?: string;
  start_date: string;
}

export interface UpdateDeductionPayload {
  authorized?: boolean;
  is_active?: boolean;
  end_date?: string;
  outstanding_balance?: number;
}

export interface ApplyDeductionPaymentPayload {
  amount: number;
  applied_at: string;
}

// ---------------------------------------------------------------
// Beneficiarios por fallecimiento (Art. 145)
// ---------------------------------------------------------------

export type HrBeneficiaryRelationship =
  | "hijo"
  | "conyuge"
  | "pareja_estable"
  | "padre"
  | "madre"
  | "nieto_huerfano";

export interface HrEmployeeBeneficiary {
  beneficiary_id: string;
  employee_id: string;
  tenant_id: string;
  settlement_id: string | null;
  full_name: string;
  doc_number: string;
  identification_type_id: number | null;
  relationship: HrBeneficiaryRelationship;
  birth_date: string | null;
  claim_date: string | null;
  validated: boolean;
  validated_at: string | null;
  share_percentage: number | string | null;
  share_amount: number | string | null;
  created_at: string;
}

export interface CreateBeneficiaryPayload {
  employee_id: string;
  full_name: string;
  doc_number: string;
  relationship: HrBeneficiaryRelationship;
  claim_date: string;
}

export interface DistributeSettlementPayload {
  settlement_id: string;
  recalculate?: boolean;
}

// ---------------------------------------------------------------
// Horas con recargo (Arts. 117, 118, 120, 178, 182)
// ---------------------------------------------------------------

export type HrOvertimeKind = "nocturna" | "extra" | "feriado" | "descanso";

export interface HrOvertimeRecord {
  overtime_id: string;
  employee_id: string;
  branch_id: string;
  tenant_id: string;
  work_date: string;
  kind: HrOvertimeKind;
  hours: number | string;
  rate_factor: number | string;
  inspectoria_authorized: boolean;
  authorization_ref: string | null;
  created_at: string;
}

export interface CreateOvertimePayload {
  employee_id: string;
  branch_id: string;
  work_date: string;
  kind: HrOvertimeKind;
  hours: number;
  inspectoria_authorized?: boolean;
  authorization_ref?: string;
}

export interface ManualClockOutPayload {
  clockingId: number;
  clockOut: string;
}

export interface CreateHrFoulPayload {
  employee_id: string;
  branch_id: string;
  identificator: string;
  foul_date: string;
  foul_hour: string;
  description: string;
}

export interface CreateHrSuspentionPayload {
  employee_id: string;
  suspentionStart: string;
  suspentionEnd: string;
  reason: string;
  branchId: string;
}

export interface UpdateHrSuspentionPayload {
  suspentionStart?: string;
  suspentionEnd?: string;
  reason?: string;
}

export interface CreateHrIncapacityPayload {
  employee_id: string;
  branch_id: string;
  type: string;
  period_start: string;
  period_end: string;
  days_paying: number;
  percentage_to_pay: number;
}
