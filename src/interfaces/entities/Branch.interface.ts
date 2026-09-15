export interface Branch {
  branch_id: string;
  branch_name: string;
  branch_number: string;
  branch_address: string;
  is_main_branch: boolean;
  tenant_id: string;
  created_at?: string;
  updated_at?: string;
}
