export interface Department {
  id: string;
  name: string;
  institute_type_id: string;
  short_form?: string;
}

export interface Designation {
  id: string;
  name: string;
  rank?: number;
}

export interface Institute {
  id: string;
  name: string;
}

export interface InstituteType {
  id: string;
  name: string;
  institute_id: string;
  letterhead_url?: string;
  short_form?: string;
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
  person_type_id?: string;
  signature?: string;
  is_locked?: boolean;
  is_admin?: boolean;
  designations?: Designation;
  departments?: Department;
  institutes?: Institute;
  institute_types?: InstituteType;
  person_types?: PersonType;
  number?: string;
}

export interface PersonType {
  id: string;
  name: string;
}

export interface TemplateStep {
  id: string;
  template_id: string;
  step_order: number;
  approver_id?: string;
  designation_id?: string;
  role_label?: string;
  min_amount?: number;
  profiles?: UserProfile;
  designations?: Designation;
}

export interface ApprovalTemplate {
  id: string;
  name: string;
  description?: string;
  status: string;
  is_active: boolean;
  allows_amount: boolean;
  max_amount?: number;
  visible_to_person_types?: string[];
  template_steps?: TemplateStep[];
  requester_role_label?: string;
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

export interface Revision {
  id: string;
  timestamp: string;
  changes: {
    content?: { from: any; to: any };
    amount?: { from: any; to: any };
    bifurcation?: { from: any; to: any };
  };
}

export interface ApprovalRequest {
  id: string;
  template_id: string;
  requester_id: string;
  cell_id?: string;
  title: string;
  content: Record<string, string>;
  current_step_id: string;
  status: string;
  created_at: string;
  approval_templates?: ApprovalTemplate;
  profiles?: UserProfile;
  request_approvals?: RequestApproval[];
  cells?: Cell;
  last_reverted_step_id?: string;
  has_amount?: boolean;
  amount?: number;
  bifurcation?: any;
  budget_provisions?: boolean;
  reference_id?: string;
  request_sequence_id?: number;
  // UI Helper fields mapped in API
  requester_name?: string;
  template_name?: string;
  template_description?: string;
  current_step_role?: string;
  revisions?: Revision[];
  settlement_requests?: SettlementRequest[];
  attachments?: string[];
}

export interface AcademicYear {
  id: string;
  name: string;
}

export interface StudyYear {
  id: string;
  name: string;
  rank: number;
}

export interface FeeCollection {
  id: string;
  institute_id: string;
  institute_type_id: string;
  department_id: string;
  academic_year_id: string;
  study_year_id: string;
  total_students: number;
  amount_per_student: number;
  created_at: string;
  institutes?: Institute;
  institute_types?: InstituteType;
  departments?: Department;
  academic_years?: AcademicYear;
  study_years?: StudyYear;
}

export interface SettlementRequest {
  id: string;
  original_request_id: string;
  requester_id: string;
  status: string;
  current_step: 'store' | 'accountant' | 'director' | 'accountant_final' | 'deputy_chief_accountant' | 'completed';
  original_amount: number;
  actual_amount: number;
  savings_amount: number;
  extra_amount: number;
  advance_amount: number;
  advance_logs?: { date: string, amount: number, description: string }[];
  actual_bifurcation?: any;
  store_remarks?: string;
  accountant_remarks?: string;
  director_remarks?: string;
  created_at: string;
  updated_at: string;
  approval_requests?: ApprovalRequest;
  profiles?: UserProfile;
  settlement_approvals?: SettlementApproval[];
}

export interface SettlementApproval {
  id: string;
  settlement_id: string;
  approver_id: string;
  status: string;
  comments?: string;
  acted_at: string;
  step_key: string;
  profiles?: UserProfile;
}
