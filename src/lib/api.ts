import { supabase } from './supabase';
import { Department, Designation, UserProfile, ApprovalTemplate, ApprovalRequest, Institute, InstituteType, Cell, PersonType } from './types';

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*, designations(*), departments(*), institutes(*), institute_types(*), person_types(*), is_locked')
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

export async function getAllDepartmentsAdmin(): Promise<any[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('*, institute_types(*)')
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function getDesignations(): Promise<Designation[]> {
  const { data, error } = await supabase.from('designations').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function getPersonTypes(): Promise<PersonType[]> {
  const { data, error } = await supabase.from('person_types').select('*').order('name');
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

export async function proposeTemplate(
  name: string, 
  description: string, 
  steps: Array<{designation_id: string; context: string; role_label?: string}>, 
  allowsAmount = false, 
  visible_to_person_types: string[] = [], 
  maxAmount?: number,
  requesterRoleLabel?: string
): Promise<void> {
  const { data: template, error } = await supabase
    .from('approval_templates')
    .insert({ 
      name, 
      description, 
      status: 'pending', 
      is_active: false, 
      allows_amount: allowsAmount, 
      max_amount: maxAmount, 
      visible_to_person_types,
      requester_role_label: requesterRoleLabel || 'Prepared by'
    })
    .select()
    .single();
  if (error) throw error;

  const stepRows = steps.map((s, i) => ({
    template_id: template.id,
    step_order: i + 1,
    designation_id: s.designation_id,
    context: s.context,
    role_label: s.role_label,
  }));
  const { error: stepsError } = await supabase.from('template_steps').insert(stepRows);
  if (stepsError) throw stepsError;
}

export async function getAllTemplatesAdmin(): Promise<ApprovalTemplate[]> {
  const { data, error } = await supabase
    .from('approval_templates')
    .select('*, template_steps(*, designations(*))')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(t => ({ ...t, template_steps: t.template_steps?.sort((a: { step_order: number }, b: { step_order: number }) => a.step_order - b.step_order) }));
}

export async function updateTemplateActiveStatus(templateId: string, is_active: boolean): Promise<void> {
  const { error } = await supabase
    .from('approval_templates')
    .update({ is_active })
    .eq('id', templateId);
  if (error) throw error;
}

export async function updateTemplate(
  templateId: string, 
  name: string, 
  description: string, 
  steps: Array<{designation_id: string; context: string; role_label?: string}>, 
  allowsAmount: boolean, 
  visible_to_person_types: string[], 
  maxAmount?: number,
  requesterRoleLabel?: string
): Promise<void> {
  const { error } = await supabase
    .from('approval_templates')
    .update({ 
      name, 
      description, 
      allows_amount: allowsAmount, 
      max_amount: maxAmount, 
      visible_to_person_types,
      requester_role_label: requesterRoleLabel
    })
    .eq('id', templateId);
  if (error) throw error;

  // Re-create steps
  const { error: deleteError } = await supabase.from('template_steps').delete().eq('template_id', templateId);
  if (deleteError) throw deleteError;

  const stepRows = steps.map((s, i) => ({
    template_id: templateId,
    step_order: i + 1,
    designation_id: s.designation_id,
    context: s.context,
    role_label: s.role_label,
  }));
  const { error: stepsError } = await supabase.from('template_steps').insert(stepRows);
  if (stepsError) throw stepsError;
}

export async function getPendingApprovals(): Promise<ApprovalRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, designations(*), departments(*), institutes(*), institute_types(*), person_types(*), is_locked')
    .eq('id', user.id)
    .single();
  if (!profile) return [];

  const { data, error } = await supabase
    .from('approval_requests')
    .select(`
      *,
      approval_templates!inner(*, template_steps(*, designations(*))),
      profiles(*,designations(*),departments(*), institutes(*), institute_types(*), person_types(*), is_locked),
      request_approvals(*, profiles(*,designations(*),departments(*), institutes(*), institute_types(*), person_types(*), is_locked)),
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
        profiles(*,designations(*),departments(*), institutes(*), institute_types(*), person_types(*), is_locked),
        request_approvals(*, profiles(*,designations(*),departments(*), institutes(*), institute_types(*), person_types(*), is_locked)),
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
      profiles(*,designations(*),departments(*), institutes(*), institute_types(*), person_types(*), is_locked),
      request_approvals(*, profiles(*,designations(*),departments(*), institutes(*), institute_types(*), person_types(*), is_locked)),
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
  amount = 0.0,
  bifurcation: any = null,
  budgetProvisions = true
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // 1. Get requester profile with rank
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, designations(rank)')
    .eq('id', user.id)
    .single();
  
  if (!profile) throw new Error('Profile not found');
  const myRank = (profile.designations as any)?.rank || 0;

  // 2. Get template steps
  const { data: template } = await supabase
    .from('approval_templates')
    .select('*, template_steps(*, designations(*))')
    .eq('id', templateId)
    .single();

  if (!template) throw new Error('Template not found');
  const steps = (template.template_steps || []).sort((a: any, b: any) => a.step_order - b.step_order);

  // 3. Determine skip logic: find steps with rank <= my rank
  const skippedSteps = steps.filter((s: any) => (s.designations?.rank || 0) <= myRank);
  const firstActionableStep = steps.find((s: any) => (s.designations?.rank || 0) > myRank);
  
  const isFullyApproved = steps.length > 0 && !firstActionableStep;
  const currentStep = isFullyApproved ? steps.length : (firstActionableStep?.step_order || 1);

  // 4. Create the request
  const { data: newRequest, error } = await supabase.from('approval_requests').insert({
    template_id: templateId,
    requester_id: user.id,
    cell_id: cellId,
    requester_name: profile.full_name,
    requester_email: profile.email,
    title,
    content,
    current_step_order: currentStep,
    status: isFullyApproved ? 'approved' : 'pending',
    has_amount: hasAmount,
    amount,
    bifurcation,
    budget_provisions: budgetProvisions,
  }).select().single();

  if (error) throw error;

  // 5. Insert auto-approval logs for skipped steps
  if (skippedSteps.length > 0 && newRequest) {
    const autoApprovals = skippedSteps.map((s: any) => ({
      request_id: newRequest.id,
      approver_id: user.id,
      step_order: s.step_order,
      status: 'approved',
      comments: 'Hierarchical auto-approval: Requester rank is higher than or equal to this step.',
      acted_at: new Date().toISOString()
    }));
    await supabase.from('request_approvals').insert(autoApprovals);
  }
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
  instituteTypeIds?: string[];
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
  if (filters.instituteTypeIds && filters.instituteTypeIds.length > 0) {
    query = query.in('profiles.institute_type_id', filters.instituteTypeIds);
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

export async function resubmitRequest(requestId: string, content: Record<string, string>, updatedAmount?: number, updatedBifurcation?: any): Promise<void> {
  // 1. Fetch current request state to archive for diffing
  const { data: req } = await supabase.from('approval_requests')
    .select('last_reverted_step_order, content, amount, bifurcation')
    .eq('id', requestId)
    .single();

  const targetStepOrder = req?.last_reverted_step_order || 1;

  const updateData: Record<string, unknown> = { 
    content, 
    status: 'pending', 
    current_step_order: targetStepOrder, 
    last_reverted_step_order: null 
  };
  
  if (updatedAmount !== undefined) {
    updateData.amount = updatedAmount;
  }
  
  if (updatedBifurcation !== undefined) {
    updateData.bifurcation = updatedBifurcation;
  }
  
  const { error } = await supabase.from('approval_requests').update(updateData).eq('id', requestId);
  if (error) throw error;
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(
  email: string, password: string, fullName: string, designationId?: string | null,
  departmentId?: string | null, instituteId?: string | null, instituteTypeId?: string | null,
  personTypeId?: string | null
): Promise<void> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.user.id, email, full_name: fullName,
      designation_id: designationId, department_id: departmentId,
      institute_id: instituteId, institute_type_id: instituteTypeId,
      person_type_id: personTypeId,
    });
    if (profileError) throw profileError;
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function createDesignation(name: string, rank: number): Promise<void> {
  const { error } = await supabase.from('designations').insert({ name, rank });
  if (error) throw error;
}

export async function createPersonType(name: string): Promise<void> {
  const { error } = await supabase.from('person_types').insert({ name });
  if (error) throw error;
}

export async function getAllProfilesAdmin(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, designations(*), departments(*), institutes(*), institute_types(*), person_types(*), is_locked')
    .order('full_name');
  if (error) throw error;
  return data || [];
}

export async function updateProfilePersonType(profileId: string, personTypeId: string | null): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ person_type_id: personTypeId })
    .eq('id', profileId);
  if (error) throw error;
}

export async function updateProfileLockStatus(profileId: string, isLocked: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_locked: isLocked })
    .eq('id', profileId);
  if (error) throw error;
}

export async function updateProfileName(profileId: string, fullName: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', profileId);
  if (error) throw error;
}

export async function getApproversByDesignation(designationId: string, context: string, contextId?: string): Promise<UserProfile[]> {
  let query = supabase.from('profiles').select('*, designations(*)').eq('designation_id', designationId);
  
  if (context === 'departmental' && contextId) {
    query = query.eq('department_id', contextId);
  } else if (context === 'institute' && contextId) {
    query = query.eq('institute_type_id', contextId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createDepartment(name: string, instituteTypeId: string): Promise<void> {
  const { error } = await supabase.from('departments').insert({ name, institute_type_id: instituteTypeId });
  if (error) throw error;
}

export async function updateDepartment(id: string, name: string, instituteTypeId: string): Promise<void> {
  const { error } = await supabase
    .from('departments')
    .update({ name, institute_type_id: instituteTypeId })
    .eq('id', id);
  if (error) throw error;
}
