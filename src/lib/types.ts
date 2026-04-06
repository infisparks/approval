export interface Department {
  id: string;
  name: string;
}

export interface Designation {
  id: string;
  name: string;
  rank: number;
}

export interface Institute {
  id: string;
  name: string;
}

export interface InstituteType {
  id: string;
  name: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  designation_id?: string;
  department_id?: string;
  avatar_url?: string;
  institute_id?: string;
  institute_type_id?: string;
  designations?: Designation;
  departments?: Department;
  institutes?: Institute;
  institute_types?: InstituteType;
}

export interface TemplateStep {
  id: string;
  template_id: string;
  step_order: number;
  designation_id: string;
  context: string;
  designations?: Designation;
}

export interface ApprovalTemplate {
  id: string;
  name: string;
  description?: string;
  status: string;
  is_active: boolean;
  template_steps?: TemplateStep[];
}

export interface RequestApproval {
  id: string;
  request_id: string;
  approver_id: string;
  step_order: number;
  status: string;
  comments?: string;
  acted_at?: string;
  profiles?: UserProfile;
  approver_name?: string;
  approver_email?: string;
}

export interface Cell {
  id: string;
  name: string;
  institute_id: string;
}

export interface ApprovalRequest {
  id: string;
  template_id: string;
  requester_id: string;
  cell_id?: string;
  title: string;
  content: Record<string, string>;
  current_step_order: number;
  status: string;
  created_at: string;
  approval_templates?: ApprovalTemplate;
  profiles?: UserProfile;
  request_approvals?: RequestApproval[];
  cells?: Cell;
  requester_name?: string;
  requester_email?: string;
  template_name?: string;
  template_description?: string;
  last_reverted_step_order?: number;
  has_amount?: boolean;
  amount?: number;
}
