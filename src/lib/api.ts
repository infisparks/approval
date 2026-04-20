import { supabase } from './supabase';
import { Department, Designation, UserProfile, ApprovalTemplate, ApprovalRequest, Institute, InstituteType, Cell, PersonType, AcademicYear, StudyYear, FeeCollection, SettlementRequest, SettlementApproval } from './types';

// ─── Utility & Notification Functions ────────────────────────────────────────

export async function getProfileById(id: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, designations(*), departments(*), institutes(*), institute_types(*)')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

export async function getProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, number, designation_id, designations(name)')
    .order('full_name');
  if (error) throw error;
  return (data || []).map((p: any) => ({
    ...p,
    designations: Array.isArray(p.designations) ? p.designations[0] : p.designations
  }));
}

export async function sendWhatsAppNotification(
  contactNumber: string,
  facultyName: string,
  heading: string,
  date: string,
  link: string,
  isUrgent: boolean = false
): Promise<void> {
  if (!contactNumber) {
    console.warn("⚠️ WhatsApp ignored: Missing contact number");
    return;
  }
  const apiKey = process.env.NEXT_PUBLIC_WHATSAPP_API_KEY;
  if (!apiKey) {
    console.error("❌ WhatsApp API Key missing");
    return;
  }

  const messageText = `*${isUrgent ? '🚨 URGENT ' : ''}Approval Request Pending* 📝\n\nHello,\nAn approval request is waiting for your review.${isUrgent ? '\n\n*STATUS:* 🚨 URGENT' : ''}\n\n*Subject:* ${heading}\n*Faculty:* ${facultyName}\n*Date:* ${date}\n\n*Review Link:* ${link}\n\n_Sent via Institutional Approval System_`;

  try {
    const payload = {
      number: `91${String(contactNumber).replace(/\D/g, '').slice(-10)}`,
      text: messageText
    };
    
    const response = await fetch("https://evo.infispark.in/message/sendText/mudassir", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      console.error("❌ WhatsApp Response Error:", await response.text());
    }
  } catch (error) {
    console.error("❌ WhatsApp Error:", error);
  }
}

// ─── Authentication ───────────────────────────────────────────────────────────

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

export async function uploadAttachment(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
  const filePath = `requests/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('attachments')
    .getPublicUrl(filePath);

  return publicUrl;
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

// ─── Masters ───────────────────────────────────────────────────────────────

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
  const { data, error } = await supabase.from('designations').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function getPersonTypes(): Promise<PersonType[]> {
  const { data, error } = await supabase.from('person_types').select('*').order('name');
  if (error) throw error;
  return data || [];
}

// ─── Templates ─────────────────────────────────────────────────────────────

export async function getTemplates(): Promise<ApprovalTemplate[]> {
  const { data, error } = await supabase
    .from('approval_templates')
    .select('*, template_steps(*, profiles(*, designations(*)), designations(*))')
    .eq('status', 'approved')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return (data || []).map(t => ({ ...t, template_steps: t.template_steps?.sort((a: any, b: any) => a.step_order - b.step_order) }));
}

export async function getPendingTemplateProposals(): Promise<ApprovalTemplate[]> {
  const { data, error } = await supabase
    .from('approval_templates')
    .select('*, template_steps(*, profiles(*, designations(*)), designations(*))')
    .eq('status', 'pending');
  if (error) throw error;
  return (data || []).map(t => ({ ...t, template_steps: t.template_steps?.sort((a: any, b: any) => a.step_order - b.step_order) }));
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
  steps: Array<{approver_id?: string; designation_id?: string; role_label?: string; min_amount?: number}>, 
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
    approver_id: s.approver_id || null,
    designation_id: s.designation_id || null,
    role_label: s.role_label,
    min_amount: s.min_amount || 0,
  }));
  const { error: stepsError } = await supabase.from('template_steps').insert(stepRows);
  if (stepsError) throw stepsError;
}

export async function getAllTemplatesAdmin(): Promise<ApprovalTemplate[]> {
  const { data, error } = await supabase
    .from('approval_templates')
    .select('*, template_steps(*, profiles(*, designations(*)), designations(*))')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(t => ({ ...t, template_steps: (t.template_steps || []).sort((a: any, b: any) => a.step_order - b.step_order) }));
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
  steps: Array<{approver_id?: string; designation_id?: string; role_label?: string; min_amount?: number}>, 
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
    approver_id: s.approver_id || null,
    designation_id: s.designation_id || null,
    role_label: s.role_label,
    min_amount: s.min_amount || 0,
  }));
  const { error: stepsError } = await supabase.from('template_steps').insert(stepRows);
  if (stepsError) throw stepsError;
}

export async function duplicateTemplate(template: ApprovalTemplate): Promise<void> {
  const { data: newTemp, error } = await supabase
    .from('approval_templates')
    .insert({
      name: `${template.name} (Copy)`,
      description: template.description,
      status: 'approved',
      is_active: true,
      allows_amount: template.allows_amount,
      max_amount: template.max_amount,
      visible_to_person_types: template.visible_to_person_types,
      requester_role_label: template.requester_role_label
    })
    .select()
    .single();

  if (error) throw error;

  if (template.template_steps && template.template_steps.length > 0) {
    const newSteps = template.template_steps.map(s => ({
      template_id: newTemp.id,
      step_order: s.step_order,
      approver_id: s.approver_id,
      designation_id: s.designation_id,
      role_label: s.role_label,
      min_amount: s.min_amount
    }));
    const { error: stepsError } = await supabase.from('template_steps').insert(newSteps);
    if (stepsError) throw stepsError;
  }
}

// ─── Approvals & Requests ────────────────────────────────────────────────────

export async function getPendingApprovals(): Promise<ApprovalRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: pendingIds, error: rpcError } = await supabase.rpc('get_my_pending_actions');
  if (rpcError) throw rpcError;
  
  if (!pendingIds || pendingIds.length === 0) return [];

  const { data, error } = await supabase
    .from('approval_requests')
    .select(`
      *,
      approval_templates!inner(*, template_steps(*, profiles(*, designations(*)), designations(*))),
      profiles(*,designations(*),departments(*), institutes(*), institute_types(*), person_types(*), is_locked),
      request_approvals(*, profiles(*,designations(*),departments(*), institutes(*), institute_types(*), person_types(*), is_locked)),
      cells(*)
    `)
    .in('id', pendingIds.map((p: any) => p.id));

  if (error) throw error;
  return (data || []).map(r => {
    const currentStep = r.approval_templates?.template_steps?.find((s: any) => s.id === r.current_step_id);
    return {
      ...r,
      requester_name: r.profiles?.full_name,
      template_name: r.approval_templates?.name,
      template_description: r.approval_templates?.description,
      current_step_role: currentStep?.role_label || (currentStep?.designations?.name ?? 'Approver')
    };
  });
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
        approval_templates(*, template_steps(*, profiles(*, designations(*)), designations(*))),
        profiles(*,designations(*),departments(*), institutes(*), institute_types(*), person_types(*), is_locked),
        request_approvals(*, profiles(*,designations(*),departments(*), institutes(*), institute_types(*), person_types(*), is_locked)),
        cells(*)
      )
    `)
    .eq('approver_id', user.id)
    .in('status', ['approved', 'rejected', 'reverted'])
    .order('acted_at', { ascending: false });
    
  if (error) throw error;

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
      approval_templates(*, template_steps(*, profiles(*, designations(*)), designations(*))),
      profiles(*,designations(*),departments(*), institutes(*), institute_types(*), person_types(*), is_locked),
      request_approvals(*, profiles(*,designations(*),departments(*), institutes(*), institute_types(*), person_types(*), is_locked)),
      cells(*),
      settlement_requests(*)
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
  templateId: string, title: string, content: Record<string, string>,
  cellId: string, hasAmount = false, amount = 0.0,
  bifurcation: any = null, budgetProvisions = true, attachments: string[] = [],
  isUrgent = false
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: profile } = await supabase.from('profiles').select('full_name, designation_id, designations(rank)').eq('id', user.id).single();
  if (!profile) throw new Error('Profile not found');
  const myRank = (profile.designations as any)?.rank || 0;

  const { data: template } = await supabase.from('approval_templates')
    .select('*, template_steps(*, profiles(*, designations(*)), designations(*))')
    .eq('id', templateId).single();
  if (!template) throw new Error('Template not found');
  const allSteps = (template.template_steps || []).sort((a: any, b: any) => a.step_order - b.step_order);
  const myDesignationId = (profile as any)?.designation_id;

  const skipUntilOrder = allSteps.reduce((max: number, s: any) => {
    const stepRank = (s.designations as any)?.rank ?? (s.profiles?.designations as any)?.rank ?? 0;
    const isUnderOrSame = (stepRank > 0 && stepRank <= myRank) || (s.designation_id === myDesignationId);
    return isUnderOrSame ? Math.max(max, s.step_order) : max;
  }, -1);

  const firstActionableStep = allSteps.find((s: any) => {
    const isAfterSkipped = s.step_order > skipUntilOrder;
    const amountOk = !s.min_amount || amount >= s.min_amount;
    return isAfterSkipped && amountOk;
  });

  const isFullyApproved = allSteps.length > 0 && !firstActionableStep;
  const currentStepId = isFullyApproved ? undefined : firstActionableStep?.id;

  const { error } = await supabase.from('approval_requests').insert({
    template_id: templateId, requester_id: user.id, cell_id: cellId, title, content,
    current_step_id: currentStepId || null, status: isFullyApproved ? 'approved' : 'pending',
    has_amount: hasAmount, amount, bifurcation, budget_provisions: budgetProvisions, attachments,
    is_urgent: isUrgent
  });
  if (error) throw error;
}

export async function approveRequest(
  requestId: string,
  stepOrder: number,
  comments: string,
  isUrgent?: boolean
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: approverProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!approverProfile) throw new Error('Approver profile not found');

  const { data: req } = await supabase.from('approval_requests')
    .select('*, profiles!requester_id(*, designations(*)), approval_templates(*, template_steps(*, profiles(*, designations(*)), designations(*)))')
    .eq('id', requestId).single();
  if (!req) throw new Error('Request not found');

  const requesterRank = (req.profiles?.designations as any)?.rank || 0;
  const requesterDesignationId = (req.profiles as any)?.designation_id;
  const allSteps = (req.approval_templates?.template_steps || []).sort((a: any, b: any) => a.step_order - b.step_order);
  
  // Skip logic: everything up to the requester's own level in the chain is bypassed
  const skipUntilOrder = allSteps.reduce((max: number, s: any) => {
    const stepRank = (s.designations as any)?.rank ?? (s.profiles?.designations as any)?.rank ?? 0;
    const isUnderOrSame = (stepRank > 0 && stepRank <= requesterRank) || (s.designation_id === requesterDesignationId);
    return isUnderOrSame ? Math.max(max, s.step_order) : max;
  }, -1);

  const nextStep = allSteps.find((s: any) => {
    const isAfterCurrent = s.step_order > stepOrder;
    const isAfterSkipped = s.step_order > skipUntilOrder;
    const amountOk = Number(req.amount || 0) >= Number(s.min_amount || 0);
    return isAfterCurrent && isAfterSkipped && amountOk;
  });

  const { error: approvalError } = await supabase.from('request_approvals').insert({
    request_id: requestId, approver_id: user.id, step_order: stepOrder, status: 'approved',
    comments, acted_at: new Date().toISOString(),
    approver_name: approverProfile?.full_name, approver_email: approverProfile?.email
  });
  if (approvalError) throw approvalError;

  const { error: updateError } = await supabase.from('approval_requests').update({
    current_step_id: nextStep ? nextStep.id : req.current_step_id,
    status: nextStep ? 'pending' : 'approved',
    is_urgent: isUrgent !== undefined ? isUrgent : req.is_urgent
  }).eq('id', requestId);
  if (updateError) throw updateError;

  if (nextStep) {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://approval-three.vercel.app/';
    const link = `${baseUrl}/admin/requests`;
    if (nextStep.approver_id) {
       const p = await getProfileById(nextStep.approver_id);
       if (p?.number) await sendWhatsAppNotification(p.number, req.profiles?.full_name || 'Faculty', req.title, new Date().toLocaleDateString('en-IN'), link, req.is_urgent);
    }
  }
}

export async function rejectRequest(requestId: string, stepOrder: number, comments: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: approverProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  const { error: approvalError } = await supabase.from('request_approvals').insert({
    request_id: requestId, approver_id: user.id, step_order: stepOrder, status: 'rejected',
    comments, acted_at: new Date().toISOString(),
    approver_name: approverProfile?.full_name, approver_email: approverProfile?.email
  });
  if (approvalError) throw approvalError;

  const { error: updateError } = await supabase.from('approval_requests').update({ status: 'rejected' }).eq('id', requestId);
  if (updateError) throw updateError;
}

export async function revertRequest(requestId: string, stepOrder: number, comments: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data: req } = await supabase.from('approval_requests').select('*, approval_templates(template_steps(*))').eq('id', requestId).single();
  if (!req) throw new Error('Request not found');

  const { data: approverProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const steps = req.approval_templates?.template_steps?.sort((a: any, b: any) => a.step_order - b.step_order) || [];
  const prevStep = steps.find((s: any) => s.step_order === stepOrder - 1);

  const { error: approvalError } = await supabase.from('request_approvals').insert({
    request_id: requestId, approver_id: user.id, step_order: stepOrder, status: 'reverted',
    comments, acted_at: new Date().toISOString(),
    approver_name: approverProfile?.full_name, approver_email: approverProfile?.email
  });
  if (approvalError) throw approvalError;

  const { error: updateError } = await supabase.from('approval_requests').update({
    current_step_id: prevStep ? prevStep.id : req.current_step_id,
    last_reverted_step_id: req.current_step_id, status: 'reverted',
  }).eq('id', requestId);
  if (updateError) throw updateError;
}

export async function resubmitRequest(requestId: string, content: Record<string, any>, updatedAmount?: number, updatedBifurcation?: any): Promise<void> {
  // 1. Fetch current data to detect changes
  const { data: req, error: fetchError } = await supabase.from('approval_requests')
    .select('last_reverted_step_id, content, amount, bifurcation, revisions')
    .eq('id', requestId)
    .single();

  if (fetchError || !req) throw new Error('Request not found');

  // 2. Detect changes
  const changes: Record<string, any> = {};
  
  if (JSON.stringify(req.content) !== JSON.stringify(content)) {
    changes.content = { from: req.content, to: content };
  }
  
  if (updatedAmount !== undefined && Number(req.amount) !== Number(updatedAmount)) {
    changes.amount = { from: req.amount, to: updatedAmount };
  }

  if (updatedBifurcation !== undefined && JSON.stringify(req.bifurcation) !== JSON.stringify(updatedBifurcation)) {
    changes.bifurcation = { from: req.bifurcation, to: updatedBifurcation };
  }

  // 3. Prepare revision history
  const revisionEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    changes
  };

  const newRevisions = Object.keys(changes).length > 0 
    ? [...(req.revisions || []), revisionEntry] 
    : (req.revisions || []);

  // 4. Update the request
  const updateData: any = { 
    content, 
    status: 'pending', 
    current_step_id: req.last_reverted_step_id, 
    last_reverted_step_id: null,
    revisions: newRevisions
  };
  
  if (updatedAmount !== undefined) updateData.amount = updatedAmount;
  if (updatedBifurcation !== undefined) updateData.bifurcation = updatedBifurcation;

  const { error } = await supabase.from('approval_requests').update(updateData).eq('id', requestId);
  if (error) throw error;
}

// ─── Stats & Admin ─────────────────────────────────────────────────────────

export async function getAdminStats(filters: any): Promise<ApprovalRequest[]> {
  let query = supabase.from('approval_requests').select(`*, profiles!inner(*, institutes(*), departments(*)), cells(*), approval_templates(*)`);
  if (filters.startDate) query = query.gte('created_at', filters.startDate);
  if (filters.endDate) query = query.lte('created_at', filters.endDate);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getAllProfilesAdmin(): Promise<UserProfile[]> {
  const { data, error } = await supabase.from('profiles').select('*, designations(*), departments(*), institutes(*), institute_types(*), person_types(*), is_locked').order('full_name');
  if (error) throw error;
  return data || [];
}

export async function updateProfileAdmin(profileId: string, updates: any): Promise<void> {
  if (updates.number !== undefined) updates.number = updates.number ? String(updates.number).replace(/\D/g, '') : null;
  const { error } = await supabase.from('profiles').update(updates).eq('id', profileId);
  if (error) throw error;
}

export async function createDepartment(name: string, instituteTypeId: string): Promise<void> {
  const { error } = await supabase.from('departments').insert({ name, institute_type_id: instituteTypeId });
  if (error) throw error;
}

export async function updateDepartment(id: string, name: string, instituteTypeId: string): Promise<void> {
  const { error } = await supabase.from('departments').update({ name, institute_type_id: instituteTypeId }).eq('id', id);
  if (error) throw error;
}

export async function getAllDepartmentsAdmin(): Promise<any[]> {
  const { data, error } = await supabase.from('departments').select('*, institute_types(*)').order('name');
  if (error) throw error;
  return data || [];
}

export async function getAcademicYears(): Promise<AcademicYear[]> {
  const { data, error } = await supabase.from('academic_years').select('*').order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getStudyYears(): Promise<StudyYear[]> {
  const { data, error } = await supabase.from('study_years').select('*').order('rank', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getFeeCollections(filters?: any): Promise<FeeCollection[]> {
  let query = supabase.from('fee_collections').select('*, institutes(*), institute_types(*), departments(*), academic_years(*), study_years(*)');
  if (filters?.institute_id) query = query.eq('institute_id', filters.institute_id);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addFeeCollection(collection: any): Promise<void> {
  const { error } = await supabase.from('fee_collections').insert(collection);
  if (error) throw error;
}

export async function updateFeeCollection(id: string, collection: any): Promise<void> {
  const { error } = await supabase.from('fee_collections').update(collection).eq('id', id);
  if (error) throw error;
}

export async function checkFeeCollectionExists(filters: any): Promise<string | null> {
  const { data, error } = await supabase.from('fee_collections').select('id').match(filters).maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

export async function createDesignation(name: string, rank: number = 100): Promise<void> {
  const { error } = await supabase
    .from('designations')
    .insert([{ name, rank }]);
  if (error) throw error;
}

export async function createPersonType(name: string): Promise<void> {
  const { error } = await supabase
    .from('person_types')
    .insert([{ name }]);
  if (error) throw error;
}

// Add this to the ─── Stats & Admin ─── section

export async function updateProfileLockStatus(profileId: string, isLocked: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_locked: isLocked })
    .eq('id', profileId);
  if (error) throw error;
}

// ─── Settlements ───

export async function createSettlement(requestId: string, bifurcation: any, amount?: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: req } = await supabase.from('approval_requests')
    .select('*')
    .eq('id', requestId)
    .single();
  
  if (!req) throw new Error('Request not found');

  const { error } = await supabase.from('settlement_requests').insert({
    original_request_id: requestId,
    requester_id: user.id,
    original_amount: req.amount,
    actual_amount: amount ?? req.amount, // Initially same or partial, Store will change it
    actual_bifurcation: bifurcation || req.bifurcation,
    status: 'pending',
    current_step: 'store'
  });

  if (error) throw error;
}

export async function getSettlements(): Promise<SettlementRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase.from('profiles').select('*, designations(*)').eq('id', user.id).single();
  const isStore = profile?.designations?.name?.toLowerCase().includes('store');
  const isAccountant = profile?.designations?.name?.toLowerCase() === 'accountant';
  const isDirector = profile?.designations?.name?.toLowerCase() === 'director';
  const isDeputyChiefAccountant = profile?.designations?.name?.toLowerCase().includes('deputy chief accountant');

  let query = supabase.from('settlement_requests').select(`
    *,
    profiles(*, institute_types(*)),
    approval_requests(*, profiles!requester_id(*, designations(*)), approval_templates(*)),
    settlement_approvals(*, profiles(*, designations(*)))
  `);

  // Staff roles can see all settlements for oversight and processing
  // Non-staff (requesters) only see their own
  const isStaff = isStore || isAccountant || isDirector || isDeputyChiefAccountant;
  
  if (!isStaff) {
    query = query.eq('requester_id', user.id);
  }

  const { data, error } = await query.order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getMySettlements(): Promise<SettlementRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from('settlement_requests')
    .select(`
      *,
      approval_requests(*, profiles!requester_id(*), approval_templates(*)),
      settlement_approvals(*, profiles(*, designations(*)))
    `)
    .eq('requester_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function approveSettlement(settlementId: string, payload: { actual_amount: number, actual_bifurcation: any, remarks: string }): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: settlement } = await supabase.from('settlement_requests').select('*').eq('id', settlementId).single();
  if (!settlement) throw new Error('Settlement not found');

  let nextStep = settlement.current_step;
  let finalStatus = 'pending';

  const savings = Math.max(0, settlement.actual_amount - payload.actual_amount);
  const extra = Math.max(0, payload.actual_amount - settlement.actual_amount);

  const updates: any = {
    actual_amount: payload.actual_amount,
    actual_bifurcation: payload.actual_bifurcation,
    savings_amount: savings,
    extra_amount: extra,
    updated_at: new Date().toISOString()
  };

  if (settlement.current_step === 'store') {
    nextStep = 'accountant';
    updates.store_remarks = payload.remarks;
  } else if (settlement.current_step === 'accountant') {
    nextStep = 'director';
    updates.accountant_remarks = payload.remarks;
  } else if (settlement.current_step === 'director') {
    nextStep = 'accountant_final';
    updates.director_remarks = payload.remarks;
  } else if (settlement.current_step === 'accountant_final') {
    nextStep = 'deputy_chief_accountant';
    finalStatus = 'approved';
  } else if (settlement.current_step === 'deputy_chief_accountant') {
    nextStep = 'completed';
    finalStatus = 'approved';
  }

  const { error: logError } = await supabase.from('settlement_approvals').insert({
    settlement_id: settlementId,
    approver_id: user.id,
    status: 'approved',
    comments: payload.remarks,
    step_key: settlement.current_step
  });
  if (logError) throw logError;

  const { error: updateError } = await supabase.from('settlement_requests').update({
    ...updates,
    current_step: nextStep,
    status: finalStatus
  }).eq('id', settlementId);
  if (updateError) throw updateError;
}

export async function addSettlementAdvance(settlementId: string, amount: number, description: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: settlement } = await supabase.from('settlement_requests').select('advance_amount, advance_logs').eq('id', settlementId).single();
  if (!settlement) throw new Error('Settlement not found');

  const logs = settlement.advance_logs || [];
  const newEntry = {
    date: new Date().toISOString(),
    amount: amount,
    description: description
  };
  
  const updatedLogs = [...logs, newEntry];
  const newTotal = updatedLogs.reduce((acc: number, entry: any) => acc + (Number(entry.amount) || 0), 0);

  const { error: updateError } = await supabase.from('settlement_requests').update({
    advance_amount: newTotal,
    advance_logs: updatedLogs,
    updated_at: new Date().toISOString()
  }).eq('id', settlementId);
  if (updateError) throw updateError;

  const { error: logError } = await supabase.from('settlement_approvals').insert({
    settlement_id: settlementId,
    approver_id: user.id,
    status: 'advance_added',
    comments: `Added advance of ₹${amount.toLocaleString('en-IN')}: ${description}`,
    step_key: 'accountant'
  });
  if (logError) throw logError;
}

export async function revertSettlement(settlementId: string, remarks: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: settlement } = await supabase.from('settlement_requests').select('*').eq('id', settlementId).single();
  if (!settlement) throw new Error('Settlement not found');

  // Reverts from Accountant (either stage) go back to Store.
  const isAccountantStep = settlement.current_step === 'accountant' || settlement.current_step === 'accountant_final';
  const nextStep = isAccountantStep ? 'store' : settlement.current_step;

  const { error: logError } = await supabase.from('settlement_approvals').insert({
    settlement_id: settlementId,
    approver_id: user.id,
    status: 'reverted',
    comments: remarks,
    step_key: settlement.current_step
  });
  if (logError) throw logError;

  const { error: updateError } = await supabase.from('settlement_requests').update({
    current_step: nextStep,
    status: 'reverted',
    updated_at: new Date().toISOString()
  }).eq('id', settlementId);
  if (updateError) throw updateError;
}