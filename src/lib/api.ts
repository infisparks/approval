import { supabase } from './supabase';
import { Department, Designation, UserProfile, ApprovalTemplate, ApprovalRequest, Institute, InstituteType, Cell } from './types';

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*, designations(*), departments(*), institutes(*), institute_types(*)')
    .eq('id', user.id)
    .single();
  if (error) throw error;
  return data;
}

export async function getInstitutes(): Promise<Institute[]> {
  const { data, error } = await supabase.from('institutes').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function getInstituteTypes(): Promise<InstituteType[]> {
  const { data, error } = await supabase.from('institute_types').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function getCells(instituteId?: string): Promise<Cell[]> {
  let query = supabase.from('cells').select('*').order('name');
  if (instituteId) query = query.eq('institute_id', instituteId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getDepartments(): Promise<Department[]> {
  const { data, error } = await supabase.from('departments').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function getDesignations(): Promise<Designation[]> {
  const { data, error } = await supabase.from('designations').select('*').order('rank');
  if (error) throw error;
  return data || [];
}

export async function getTemplates(): Promise<ApprovalTemplate[]> {
  const { data, error } = await supabase
    .from('approval_templates')
    .select('*, template_steps(*, designations(*))')
    .eq('status', 'approved')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return (data || []).map(t => ({ ...t, template_steps: t.template_steps?.sort((a: { step_order: number }, b: { step_order: number }) => a.step_order - b.step_order) }));
}

export async function getPendingTemplateProposals(): Promise<ApprovalTemplate[]> {
  const { data, error } = await supabase
    .from('approval_templates')
    .select('*, template_steps(*, designations(*))')
    .eq('status', 'pending');
  if (error) throw error;
  return (data || []).map(t => ({ ...t, template_steps: t.template_steps?.sort((a: { step_order: number }, b: { step_order: number }) => a.step_order - b.step_order) }));
}

export async function approveTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('approval_templates')
    .update({ status: 'approved', is_active: true })
    .eq('id', templateId);
  if (error) throw error;
}

export async function rejectTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('approval_templates')
    .update({ status: 'rejected', is_active: false })
    .eq('id', templateId);
  if (error) throw error;
}

export async function proposeTemplate(name: string, description: string, steps: Array<{designation_id: string; context: string}>): Promise<void> {
  const { data: template, error } = await supabase
    .from('approval_templates')
    .insert({ name, description, status: 'pending', is_active: false })
    .select()
    .single();
  if (error) throw error;

  const stepRows = steps.map((s, i) => ({
    template_id: template.id,
    step_order: i + 1,
    designation_id: s.designation_id,
    context: s.context,
  }));
  const { error: stepsError } = await supabase.from('template_steps').insert(stepRows);
  if (stepsError) throw stepsError;
}

export async function getPendingApprovals(): Promise<ApprovalRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, designations(*), departments(*), institutes(*), institute_types(*)')
    .eq('id', user.id)
    .single();
  if (!profile) return [];

  const { data, error } = await supabase
    .from('approval_requests')
    .select(`
      *,
      approval_templates!inner(*, template_steps(*, designations(*))),
      profiles(*,designations(*),departments(*), institutes(*), institute_types(*)),
      request_approvals(*, profiles(*,designations(*),departments(*), institutes(*), institute_types(*))),
      cells(*)
    `)
    .eq('status', 'pending');
  if (error) throw error;

  const designation = profile.designations;
  const department = profile.departments;
  return (data || []).filter(req => {
    const steps = req.approval_templates?.template_steps?.sort((a: { step_order: number }, b: { step_order: number }) => a.step_order - b.step_order) || [];
    const currentStep = steps.find((s: { step_order: number }) => s.step_order === req.current_step_order);
    if (!currentStep) return false;
    if (currentStep.designation_id !== designation?.id) return false;
    if (currentStep.context === 'departmental' && req.profiles?.department_id !== department?.id) return false;
    if (currentStep.context === 'institute' && req.profiles?.institute_type_id !== profile.institute_type_id) return false;
    
    const alreadyActed = req.request_approvals?.some((a: { approver_id: string; step_order: number; status: string }) =>
      a.approver_id === user.id && a.step_order === req.current_step_order && a.status !== 'reverted'
    );
    return !alreadyActed;
  }).map(r => ({
    ...r,
    requester_name: r.profiles?.full_name,
    requester_email: r.profiles?.email,
    template_name: r.approval_templates?.name,
    template_description: r.approval_templates?.description,
  }));
}

export async function getApprovalHistory(): Promise<ApprovalRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('request_approvals')
    .select(`
      *,
      approval_requests!inner(
        *,
        approval_templates(*, template_steps(*, designations(*))),
        profiles(*,designations(*),departments(*), institutes(*), institute_types(*)),
        request_approvals(*, profiles(*,designations(*),departments(*), institutes(*), institute_types(*))),
        cells(*)
      )
    `)
    .eq('approver_id', user.id)
    .in('status', ['approved', 'rejected', 'reverted'])
    .order('acted_at', { ascending: false });
    
  if (error) throw error;

  // De-duplicate requests by ID to avoid multiple entries if acted on multiple times
  const uniqueRequests = new Map<string, ApprovalRequest>();
  
  (data || []).forEach((a) => {
    const reqId = a.approval_requests.id;
    if (!uniqueRequests.has(reqId)) {
      uniqueRequests.set(reqId, {
        ...a.approval_requests,
        requester_name: a.approval_requests.profiles?.full_name,
        requester_email: a.approval_requests.profiles?.email,
        template_name: a.approval_requests.approval_templates?.name,
        template_description: a.approval_requests.approval_templates?.description,
      });
    }
  });

  return Array.from(uniqueRequests.values());
}

export async function getRequestsByRequester(): Promise<ApprovalRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('approval_requests')
    .select(`
      *,
      approval_templates(*, template_steps(*, designations(*))),
      profiles(*,designations(*),departments(*), institutes(*), institute_types(*)),
      request_approvals(*, profiles(*,designations(*),departments(*), institutes(*), institute_types(*))),
      cells(*)
    `)
    .eq('requester_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(r => ({
    ...r,
    requester_name: r.profiles?.full_name,
    template_name: r.approval_templates?.name,
    template_description: r.approval_templates?.description,
  }));
}

export async function createRequest(
  templateId: string,
  title: string,
  content: Record<string, string>,
  cellId: string,
  hasAmount = false,
  amount = 0.0
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).single();

  const { error } = await supabase.from('approval_requests').insert({
    template_id: templateId,
    requester_id: user.id,
    cell_id: cellId,
    requester_name: profile?.full_name,
    requester_email: profile?.email,
    title,
    content,
    current_step_order: 1,
    status: 'pending',
    has_amount: hasAmount,
    amount,
  });
  if (error) throw error;
}

export async function approveRequest(requestId: string, stepOrder: number, comments: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: req } = await supabase.from('approval_requests').select('*, approval_templates(template_steps(*))').eq('id', requestId).single();
  if (!req) throw new Error('Request not found');
  const steps = req.approval_templates?.template_steps?.sort((a: { step_order: number }, b: { step_order: number }) => a.step_order - b.step_order) || [];
  const nextStep = steps.find((s: { step_order: number }) => s.step_order === stepOrder + 1);

  await supabase.from('request_approvals').insert({
    request_id: requestId, approver_id: user.id, step_order: stepOrder, status: 'approved', comments, acted_at: new Date().toISOString(),
  });
  await supabase.from('approval_requests').update({
    current_step_order: nextStep ? stepOrder + 1 : stepOrder,
    status: nextStep ? 'pending' : 'approved',
  }).eq('id', requestId);
}

export async function getAdminStats(filters: {
  startDate?: string;
  endDate?: string;
  instituteIds?: string[];
  departmentIds?: string[];
  cellIds?: string[];
}): Promise<ApprovalRequest[]> {
  let query = supabase.from('approval_requests')
    .select(`
      *,
      profiles!inner(*, institutes(*), departments(*)),
      cells(*),
      approval_templates(*)
    `);

  if (filters.startDate) query = query.gte('created_at', filters.startDate);
  if (filters.endDate) query = query.lte('created_at', filters.endDate);

  if (filters.instituteIds && filters.instituteIds.length > 0) {
    query = query.in('profiles.institute_id', filters.instituteIds);
  }
  if (filters.departmentIds && filters.departmentIds.length > 0) {
    query = query.in('profiles.department_id', filters.departmentIds);
  }
  if (filters.cellIds && filters.cellIds.length > 0) {
    query = query.in('cell_id', filters.cellIds);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function rejectRequest(requestId: string, stepOrder: number, comments: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  await supabase.from('request_approvals').insert({
    request_id: requestId, approver_id: user.id, step_order: stepOrder, status: 'rejected', comments, acted_at: new Date().toISOString(),
  });
  await supabase.from('approval_requests').update({ status: 'rejected' }).eq('id', requestId);
}

export async function revertRequest(requestId: string, stepOrder: number, comments: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  await supabase.from('request_approvals').insert({
    request_id: requestId, approver_id: user.id, step_order: stepOrder, status: 'reverted', comments, acted_at: new Date().toISOString(),
  });
  await supabase.from('approval_requests').update({ status: 'reverted', last_reverted_step_order: stepOrder }).eq('id', requestId);
}

export async function resubmitRequest(requestId: string, content: Record<string, string>, updatedAmount?: number): Promise<void> {
  // Fetch the request to find out who reverted it
  const { data: req } = await supabase.from('approval_requests')
    .select('last_reverted_step_order')
    .eq('id', requestId)
    .single();

  const targetStepOrder = req?.last_reverted_step_order || 1;

  const updateData: Record<string, unknown> = { 
    content, 
    status: 'pending', 
    current_step_order: targetStepOrder, 
    last_reverted_step_order: null 
  };
  if (updatedAmount !== undefined) updateData.amount = updatedAmount;
  
  const { error } = await supabase.from('approval_requests').update(updateData).eq('id', requestId);
  if (error) throw error;
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(
  email: string, password: string, fullName: string, designationId?: string | null,
  departmentId?: string | null, instituteId?: string | null, instituteTypeId?: string | null
): Promise<void> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.user.id, email, full_name: fullName,
      designation_id: designationId, department_id: departmentId,
      institute_id: instituteId, institute_type_id: instituteTypeId,
    });
    if (profileError) throw profileError;
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
