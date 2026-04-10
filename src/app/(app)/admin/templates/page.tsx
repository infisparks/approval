'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import AppShell from '@/components/AppShell';
import { 
  getAllTemplatesAdmin, updateTemplateActiveStatus, updateTemplate, 
  approveTemplate, rejectTemplate, getDesignations, getPersonTypes
} from '@/lib/api';
import { ApprovalTemplate, Designation, PersonType } from '@/lib/types';
import Select from 'react-select';
import makeAnimated from 'react-select/animated';
import { FileCog, ArrowRight, Trash2, PlusCircle, CheckCircle2, Edit2, ShieldAlert, Search, X, Filter } from 'lucide-react';

const animatedComponents = makeAnimated();

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: '42px',
    borderRadius: '10px',
    border: state.isFocused ? '2px solid var(--accent)' : '1px solid var(--border)',
    boxShadow: 'none',
    '&:hover': {
      borderColor: state.isFocused ? 'var(--accent)' : '#cbd5e1',
    },
    background: '#fff',
    fontSize: '14px',
    fontWeight: '500'
  }),
  multiValue: (base: any) => ({
    ...base,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: '6px',
    padding: '2px 4px',
  }),
  multiValueLabel: (base: any) => ({
    ...base,
    color: 'var(--accent)',
    fontWeight: '700',
    fontSize: '11px',
    textTransform: 'uppercase'
  }),
  multiValueRemove: (base: any) => ({
    ...base,
    color: 'var(--accent)',
    ':hover': {
      backgroundColor: 'var(--accent)',
      color: '#fff',
      borderRadius: '4px'
    },
  }),
  placeholder: (base: any) => ({
    ...base,
    color: 'var(--slate-light)',
  })
};

function EditTemplateModal({ temp, onClose, onDone }: { temp: ApprovalTemplate; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(temp.name);
  const [desc, setDesc] = useState(temp.description || '');
  const [steps, setSteps] = useState<{ designation_id: string; context: string; role_label: string }[]>(
    (temp.template_steps || []).map(s => ({ designation_id: s.designation_id, context: s.context, role_label: s.role_label || '' }))
  );
  const [requesterRoleLabel, setRequesterRoleLabel] = useState(temp.requester_role_label || 'Prepared by');
  const [allowsAmount, setAllowsAmount] = useState(temp.allows_amount);
  const [maxAmount, setMaxAmount] = useState(temp.max_amount || '');
  
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [personTypes, setPersonTypes] = useState<PersonType[]>([]);
  
  const [selectedPersonTypes, setSelectedPersonTypes] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getDesignations().then(setDesignations);
    getPersonTypes().then(pts => {
      setPersonTypes(pts);
      // Preselect
      if (temp.visible_to_person_types) {
        const selected = pts.filter(p => temp.visible_to_person_types!.includes(p.id))
                         .map(p => ({ value: p.id, label: p.name }));
        setSelectedPersonTypes(selected);
      }
    });
  }, [temp]);

  const addStep = () => setSteps(s => [...s, { designation_id: '', context: 'departmental', role_label: '' }]);
  const removeStep = (i: number) => setSteps(s => s.filter((_, idx) => idx !== i));
  const updateStep = (i: number, field: string, value: string) =>
    setSteps(s => s.map((st, idx) => idx === i ? { ...st, [field]: value } : st));

  const handleSave = async () => {
    if (!name.trim()) { setError('Template name is required.'); return; }
    if (steps.length === 0 || steps.some(s => !s.designation_id)) { setError('All steps must have a designation.'); return; }
    setError(''); setLoading(true);
    try {
      const parsedMax = parseFloat(maxAmount.toString());
      await updateTemplate(
        temp.id, 
        name, 
        desc, 
        steps, 
        allowsAmount, 
        selectedPersonTypes.map(p => p.value),
        allowsAmount && !isNaN(parsedMax) ? parsedMax : undefined,
        requesterRoleLabel
      );
      onDone(); onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to update template');
    } finally { setLoading(false); }
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Edit Template</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Update metadata and approval chain</div>
        </div>
        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {error && <div className="auth-error">{error}</div>}
          
          <div className="field-group">
            <label className="field-label">Template Name</label>
            <input className="field-input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Description</label>
            <textarea className="field-input" rows={2} value={desc} onChange={e => setDesc(e.target.value)} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--midnight)' }}>Amount/Budget Enabled</div>
              <div style={{ fontSize: 12, color: 'var(--slate)' }}>Enable if requests require financial tracking</div>
            </div>
            <label className="switch">
              <input type="checkbox" checked={allowsAmount} onChange={e => setAllowsAmount(e.target.checked)} />
              <span className="switch-slider" />
            </label>
          </div>

          {allowsAmount && (
            <div className="field-group" style={{ marginBottom: 16 }}>
              <label className="field-label">Maximum Allowed Amount (₹) (Optional)</label>
              <input 
                className="field-input" 
                type="number" 
                placeholder="e.g., 50000" 
                value={maxAmount} 
                onChange={e => setMaxAmount(e.target.value)} 
              />
              <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 4 }}>Leave blank for no upper limit</div>
            </div>
          )}

          <div className="field-group" style={{ marginBottom: 16 }}>
            <label className="field-label">Visible To (Staff Categories)</label>
            <Select 
              isMulti 
              options={personTypes.map(p => ({ value: p.id, label: p.name }))} 
              value={selectedPersonTypes} 
              onChange={val => setSelectedPersonTypes(val as any[])}
              styles={selectStyles}
              components={animatedComponents}
              placeholder="Leave empty for all staff categories..."
              closeMenuOnSelect={false}
            />
          </div>

          <div className="field-group" style={{ marginBottom: 20 }}>
            <label className="field-label">Requester Role Label</label>
            <select 
              className="field-input" 
              value={requesterRoleLabel} 
              onChange={e => setRequesterRoleLabel(e.target.value)}
            >
              <option value="Prepared by">Prepared by</option>
              <option value="Drafted by">Drafted by</option>
              <option value="Proposed by">Proposed by</option>
              <option value="Initiated by">Initiated by</option>
            </select>
            <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 4 }}>This label will appear under the requester's name in the PDF.</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 20 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--midnight)' }}>Approval Steps</span>
            <button className="btn btn-outline btn-sm" onClick={addStep} style={{ gap: 6 }}>
              <PlusCircle size={14} /> Add Step
            </button>
          </div>

          {steps.map((step, i) => (
            <div key={i} style={{ marginBottom: 14, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--midnight)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--midnight)' }}>Approval Step ${i + 1}</div>
                <button onClick={() => removeStep(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rose)', padding: 4 }}>
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Designation</label>
                  <select className="field-input" style={{ marginBottom: 0 }} value={step.designation_id} onChange={e => updateStep(i, 'designation_id', e.target.value)}>
                    <option value="">Select Designation</option>
                    {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Scope</label>
                  <select className="field-input" style={{ marginBottom: 0 }} value={step.context} onChange={e => updateStep(i, 'context', e.target.value)}>
                    <option value="departmental">Departmental</option>
                    <option value="institute">Institute-level</option>
                    <option value="global">Global</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Role Label</label>
                <select 
                  className="field-input" 
                  value={step.role_label} 
                  onChange={e => updateStep(i, 'role_label', e.target.value)} 
                  style={{ marginBottom: 0 }}
                >
                  <option value="">Default (Designation Name)</option>
                  <option value="Prepared by">Prepared by</option>
                  <option value="Verified by">Verified by</option>
                  <option value="Forwarded by">Forwarded by</option>
                  <option value="Recommended by">Recommended by</option>
                  <option value="Approved by">Approved by</option>
                </select>
              </div>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={loading}>
            {loading ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminTemplatesPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<ApprovalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisibility, setFilterVisibility] = useState<'all' | 'public' | 'restricted'>('all');
  const [filterAmount, setFilterAmount] = useState<'all' | 'with_amount' | 'without_amount'>('all');
  
  const [editing, setEditing] = useState<ApprovalTemplate | null>(null);

  useEffect(() => {
    if (profile && !profile.is_admin) {
      router.replace('/dashboard');
    }
  }, [profile, router]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAllTemplatesAdmin();
      setTemplates(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile && profile.is_admin) {
      load();
    }
  }, [profile]);

  const toggleToggle = async (t: ApprovalTemplate) => {
    try {
      await updateTemplateActiveStatus(t.id, !t.is_active);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const doApprove = async (t: ApprovalTemplate) => {
    if (confirm('Approve this template proposal?')) {
      try {
        await approveTemplate(t.id);
        load();
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const doReject = async (t: ApprovalTemplate) => {
    if (confirm('Reject this template proposal?')) {
      try {
        await rejectTemplate(t.id);
        load();
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  if (!profile || !profile.is_admin) return null;

  const filteredTemplates = templates.filter(t => {
    // 1. Search filter
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // 2. Visibility filter
    if (filterVisibility === 'public' && t.visible_to_person_types && t.visible_to_person_types.length > 0) return false;
    if (filterVisibility === 'restricted' && (!t.visible_to_person_types || t.visible_to_person_types.length === 0)) return false;

    // 3. Amount filter
    if (filterAmount === 'with_amount' && !t.allows_amount) return false;
    if (filterAmount === 'without_amount' && t.allows_amount) return false;

    return true;
  });

  return (
    <AppShell title="Template Management">
      
      {/* Filters and Search */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 20, alignItems: 'center' }}>
        {/* Search Bar */}
        <div style={{ position: 'relative', flex: 1, minWidth: 280, maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-light)' }} />
          <input
            className="field-input"
            style={{ paddingLeft: 42, paddingRight: searchQuery ? 42 : 16, marginBottom: 0 }}
            placeholder="Search templates by name or description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')} 
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-light)', padding: 4 }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {/* Visibility Filter */}
          <div style={{ display: 'flex', background: 'var(--surface)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
            <button 
              onClick={() => setFilterVisibility('all')}
              style={{ padding: '6px 12px', fontSize: 13, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', background: filterVisibility === 'all' ? 'var(--input-bg)' : 'transparent', color: filterVisibility === 'all' ? 'var(--midnight)' : 'var(--slate)' }}
            >All</button>
            <button 
              onClick={() => setFilterVisibility('public')}
              style={{ padding: '6px 12px', fontSize: 13, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', background: filterVisibility === 'public' ? 'rgba(16, 185, 129, 0.1)' : 'transparent', color: filterVisibility === 'public' ? 'var(--emerald)' : 'var(--slate)' }}
            >Public Only</button>
            <button 
              onClick={() => setFilterVisibility('restricted')}
              style={{ padding: '6px 12px', fontSize: 13, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', background: filterVisibility === 'restricted' ? 'rgba(244, 63, 94, 0.1)' : 'transparent', color: filterVisibility === 'restricted' ? 'var(--rose)' : 'var(--slate)' }}
            >Restricted Only</button>
          </div>

          {/* Amount Filter */}
          <div style={{ display: 'flex', background: 'var(--surface)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
            <button 
              onClick={() => setFilterAmount('all')}
              style={{ padding: '6px 12px', fontSize: 13, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', background: filterAmount === 'all' ? 'var(--input-bg)' : 'transparent', color: filterAmount === 'all' ? 'var(--midnight)' : 'var(--slate)' }}
            >All</button>
            <button 
              onClick={() => setFilterAmount('with_amount')}
              style={{ padding: '6px 12px', fontSize: 13, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', background: filterAmount === 'with_amount' ? 'rgba(59, 130, 246, 0.1)' : 'transparent', color: filterAmount === 'with_amount' ? 'var(--accent)' : 'var(--slate)' }}
            >With Budget</button>
            <button 
              onClick={() => setFilterAmount('without_amount')}
              style={{ padding: '6px 12px', fontSize: 13, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', background: filterAmount === 'without_amount' ? 'rgba(245, 158, 11, 0.1)' : 'transparent', color: filterAmount === 'without_amount' ? 'var(--gold)' : 'var(--slate)' }}
            >Without Budget</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="loading-spinner" /></div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Template Info</th>
                <th>Status</th>
                <th>Active</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTemplates.map(t => (
                <tr key={t.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileCog size={20} color="var(--accent)" />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--midnight)', marginBottom: 2 }}>{t.name}</div>
                        
                        {/* Inline step chain */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 4, marginTop: 4 }}>
                          {(t.template_steps?.sort((a,b) => a.step_order - b.step_order) || []).map((s, i, arr) => (
                            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(10,15,30,0.06)', padding: '2px 8px', borderRadius: 6 }}>
                                <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.role_label || 'Approver'}</span>
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--midnight)' }}>
                                  {s.designations?.name ?? 'Approver'}
                                </span>
                              </div>
                              {i < arr.length - 1 && <ArrowRight size={10} color="var(--slate-light)" />}
                            </div>
                          ))}
                        </div>

                        <div style={{ fontSize: 12, color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {t.visible_to_person_types?.length ? <span style={{ color: 'var(--rose)', fontWeight: 600 }}>Restricted</span> : 'Public'}
                          {t.allows_amount && (
                            <>
                              <span style={{ color: 'var(--slate-light)' }}>•</span>
                              <span style={{ color: 'var(--emerald)', fontWeight: 600 }}>Budget Enabled {t.max_amount ? `(Max ₹${t.max_amount.toLocaleString('en-IN')})` : '(No Limit)'}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {t.status === 'pending' ? (
                      <span className="badge badge-gold">PENDING</span>
                    ) : t.status === 'approved' ? (
                      <span className="badge badge-emerald">APPROVED</span>
                    ) : (
                      <span className="badge badge-rose">REJECTED</span>
                    )}
                  </td>
                  <td>
                    {t.status === 'approved' ? (
                      <label className="switch">
                        <input type="checkbox" checked={t.is_active} onChange={() => toggleToggle(t)} />
                        <span className="switch-slider" />
                      </label>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--slate-light)', fontStyle: 'italic' }}>Requires Approval</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {t.status === 'pending' && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 12 }}>
                        <button className="btn btn-outline-rose btn-sm" onClick={() => doReject(t)}>Reject</button>
                        <button className="btn btn-emerald btn-sm" onClick={() => doApprove(t)}>Approve</button>
                      </div>
                    )}
                    <button className="btn btn-outline btn-sm" onClick={() => setEditing(t)}>
                      <Edit2 size={14} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTemplates.length === 0 && templates.length > 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--slate)' }}>
                    <div style={{ width: 64, height: 64, background: 'var(--surface)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <Filter size={24} style={{ opacity: 0.6, color: 'var(--slate)' }} />
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--midnight)', marginBottom: 4 }}>No templates match your filters</div>
                    <div style={{ fontSize: 13, color: 'var(--slate-light)' }}>Try adjusting your search query or changing the filter tabs above.</div>
                  </td>
                </tr>
              )}
              {templates.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--slate)' }}>
                    <ShieldAlert size={32} style={{ opacity: 0.5, marginBottom: 12 }} />
                    <br />
                    No templates found in the system.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EditTemplateModal 
          temp={editing} 
          onClose={() => setEditing(null)} 
          onDone={load} 
        />
      )}
    </AppShell>
  );
}
