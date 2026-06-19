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
