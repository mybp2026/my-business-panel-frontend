export interface OnboardingData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  docNumber: string;
  tenantName: string;
  contactPhone: string;
  identificationType: number;
  identification: string;
  economicActivity: string;
  sign: string;
  regionId: number | null;
  branchName: string;
  branchNumber: string;
  branchAddress: string;
  tenantId?: string | null;
  branchId?: string | null;
  userId: string | null;
}
