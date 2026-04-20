'use client';
import { useState, useEffect, useRef } from 'react';
import { Files, Search, Plus, FileText, ArrowRight, Trash2, PlusCircle, X, CheckCircle2, Paperclip, Image as ImageIcon, File as FileIcon, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import AppShell from '@/components/AppShell';
import { getTemplates, getDesignations, proposeTemplate, createRequest, getCells, getPersonTypes, getProfiles, uploadAttachment } from '@/lib/api';
import { ApprovalTemplate, Designation, Cell, PersonType, UserProfile } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import BifurcationTable, { BifurcationItem } from '@/components/BifurcationTable';
import Select from 'react-select';
import makeAnimated from 'react-select/animated';

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


// ─── Media Viewer ─────────────────────────────────────────────────────────────

function MediaViewer({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="overlay" style={{ zIndex: 3000, background: 'rgba(0,0,0,0.95)', cursor: 'zoom-out' }} onClick={onClose}>
      <button 
        onClick={onClose}
        style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 40, height: 40, color: '#fff', cursor: 'pointer', zIndex: 3001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <X size={24} />
      </button>
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <img 
          src={url} 
          alt="Original" 
          style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain', borderRadius: 8, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} 
          onClick={e => e.stopPropagation()}
        />
      </div>
      <div style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.5)', padding: '8px 20px', borderRadius: 30, color: '#fff', fontSize: 13, fontWeight: 700, backdropFilter: 'blur(10px)' }}>
        Viewing Attachment
      </div>
    </div>
  );
}

// ─── Compose Letter Modal ──────────────────────────────────────────────────────

function ComposeModal({ template, onClose, onDone }: { template: ApprovalTemplate; onClose: () => void; onDone: () => void }) {
  const { profile } = useAuth();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [cellId, setCellId] = useState('');
  const [cells, setCells] = useState<Cell[]>([]);
  const [cellSearch, setCellSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [hasAmount, setHasAmount] = useState(false);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bifurcation, setBifurcation] = useState<BifurcationItem[]>([]);
  const [budgetProvisions, setBudgetProvisions] = useState<boolean | null>(null);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<string | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (profile?.institute_id) {
      getCells(profile.institute_id).then(setCells);
    }
  }, [profile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const myRank = (profile?.designations as any)?.rank || 0;
  const currentAmount = hasAmount ? parseFloat(amount) || 0 : 0;
  const allSteps = (template.template_steps || []).sort((a: any, b: any) => a.step_order - b.step_order);
  const myDesignationId = (profile as any)?.designation_id;

  const skipUntilOrder = allSteps.reduce((max: number, s: any) => {
    const stepRank = (s.designations as any)?.rank ?? (s.profiles?.designations as any)?.rank ?? 0;
    const isUnderOrSame = (stepRank > 0 && stepRank <= myRank) || (s.designation_id === myDesignationId);
    return isUnderOrSame ? Math.max(max, s.step_order) : max;
  }, -1);

  const firstActionableStep = allSteps.find((s: any) => {
    const isAfterSkipped = s.step_order > skipUntilOrder;
    const amountOk = !s.min_amount || currentAmount >= s.min_amount;
    return isAfterSkipped && amountOk;
  });

  const steps = allSteps.filter(s => {
    const isAfterSkipped = s.step_order > skipUntilOrder;
    const amountOk = !s.min_amount || currentAmount >= s.min_amount;
    return isAfterSkipped && amountOk;
  });

  const filteredCells = cells.filter(c => 
    c.name.toLowerCase().includes(cellSearch.toLowerCase())
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true); setError('');
    try {
      const newUrls = await Promise.all(Array.from(files).map(f => uploadAttachment(f)));
      setAttachments(prev => [...prev, ...newUrls]);
    } catch (err) {
      setError('File upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (url: string) => {
    setAttachments(prev => prev.filter(u => u !== url));
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !body.trim() || !cellId || budgetProvisions === null) { 
      setError('Please fill in all fields and confirm Budget Provisions status.'); 
      return; 
    }
    const val = parseFloat(amount) || 0;
    if (hasAmount && template.max_amount && val > template.max_amount) {
      setError(`Requested amount (₹${val}) cannot exceed the maximum allowed for this template (₹${template.max_amount.toLocaleString('en-IN')}).`);
      return;
    }
    setError(''); setLoading(true);
    try {
      await createRequest(
        template.id, subject,
        { subject, body, type: template.name },
        cellId,
        hasAmount, 
        hasAmount ? parseFloat(amount) || 0 : 0,
        hasAmount ? bifurcation : null,
        budgetProvisions ?? true,
        attachments,
        isUrgent
      );
      onDone(); onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="badge badge-accent">COMPOSE LETTER</span>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: '#fff', fontSize: 13 }}>✕</button>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{template.name}</div>
          {template.description && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{template.description}</div>}

          {/* Approval chain preview */}
          {steps.length > 0 && (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {steps.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                    <span style={{ fontSize: 8, fontWeight: 900, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.role_label || 'Approver'}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
                      {s.approver_id && s.profiles ? (Array.isArray(s.profiles.designations) ? s.profiles.designations[0]?.name : s.profiles.designations?.name) ?? s.profiles.full_name : 'Approver'}
                    </span>
                  </div>
                  {i < steps.length - 1 && <ArrowRight size={10} color="rgba(255,255,255,0.4)" />}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-body">
          {error && <div className="auth-error">{error}</div>}

          <div className="field-group">
            <label className="field-label">Select Receiving Cell / Category *</label>
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-light)' }} />
                <input 
                  className="field-input" 
                  placeholder="Type to search and select cell..." 
                  style={{ 
                    paddingLeft: 36, 
                    marginBottom: 0, 
                    fontSize: 14, 
                    border: '1.5px solid var(--border)',
                    background: 'rgba(255,255,255,0.05)',
                  }}
                  value={cellSearch}
                  onFocus={() => setShowDropdown(true)}
                  onChange={e => {
                    setCellSearch(e.target.value);
                    setShowDropdown(true);
                    if (!e.target.value) setCellId(''); 
                  }}
                />
              </div>
              
              {/* Custom Searchable Dropdown */}
              <div style={{
                position: 'absolute',
                top: '100%', left: 0, right: 0,
                maxHeight: 220, overflowY: 'auto',
                background: '#fff', 
                borderRadius: 12,
                boxShadow: '0 10px 25px rgba(0,0,0,0.1), 0 5px 10px rgba(0,0,0,0.05)',
                zIndex: 100,
                marginTop: 6,
                border: '1px solid #e2e8f0',
                display: (showDropdown && !cellId) ? 'block' : 'none'
              }}>
                {filteredCells.length === 0 ? (
                  <div style={{ padding: '16px 20px', textAlign: 'center', color: 'var(--slate)', fontSize: 13, fontWeight: 500 }}>
                    {cellSearch ? 'No matching cells found...' : 'Start typing to see more...'}
                  </div>
                ) : (
                  filteredCells.map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => {
                        setCellId(c.id);
                        setCellSearch(c.name);
                        setShowDropdown(false);
                      }}
                      style={{ 
                        padding: '12px 20px', 
                        cursor: 'pointer', 
                        fontSize: 14, 
                        fontWeight: 600, 
                        color: 'var(--midnight)',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex', alignItems: 'center', gap: 10,
                        transition: 'background 0.2s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                      {c.name}
                    </div>
                  ))
                )}
              </div>
              
              {/* Selected State Badge */}
              {cellId && (
                <div style={{ 
                  marginTop: 8, padding: '6px 12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8,
                  display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--emerald)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, background: 'var(--emerald)', borderRadius: '50%' }}>
                    <CheckCircle2 size={8} color="#fff" />
                  </div>
                  Target: {cells.find(c => c.id === cellId)?.name}
                  <button 
                    onClick={() => { setCellId(''); setCellSearch(''); setShowDropdown(true); }}
                    style={{ background: 'none', border: 'none', marginLeft: 4, cursor: 'pointer', color: 'var(--slate)', fontSize: 16, padding: 0 }}
                  >×</button>
                </div>
              )}
            </div>
            {cells.length === 0 && (
              <p style={{ fontSize: 11, color: 'var(--rose)', marginTop: 4 }}>No cells found for your institute.</p>
            )}
          </div>

          <div className="field-group">
            <label className="field-label">Subject</label>
            <input className="field-input" placeholder="e.g., Request for Lab Equipment Purchase" value={subject} onChange={e => setSubject(e.target.value)} />
          </div>

          <div className="field-group">
            <label className="field-label">Letter Body / Explanation</label>
            <textarea className="field-input" rows={7} placeholder="Enter your detailed request or reason..." value={body} onChange={e => setBody(e.target.value)} />
          </div>

          <div className="field-group" style={{ marginBottom: 20 }}>
            <label className="field-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <span>Supporting Documents (PDF / Images)</span>
               {uploading && <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>Uploading...</span>}
            </label>
            
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
               {attachments.map((url, i) => {
                  const isImg = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url);
                  const isPdf = /\.pdf$/i.test(url);
                  return (
                    <div key={i} style={{ position: 'relative', width: 80, height: 80, borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', background: '#f8fafc', cursor: 'pointer' }}>
                       {isImg ? (
                          <img 
                            src={url} 
                            alt="attachment" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            onClick={() => setViewingMedia(url)}
                          />
                       ) : (
                          <div 
                            style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}
                            onClick={() => isPdf ? window.open(url, '_blank') : window.open(url, '_blank')}
                          >
                             <FileText size={24} color="var(--slate-light)" />
                             <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--slate)', textAlign: 'center', padding: '0 4px', textTransform: 'uppercase' }}>
                               {isPdf ? 'VIEW PDF' : 'VIEW ' + (url.split('.').pop()?.toUpperCase() || 'FILE')}
                             </span>
                          </div>
                       )}
                       <button 
                         onClick={() => removeAttachment(url)}
                         style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.9)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
                       >
                         <X size={12} />
                       </button>
                    </div>
                  )
               })}
               
               <label style={{ 
                 width: 80, height: 80, borderRadius: 12, border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', transition: 'all 0.2s',
                 background: '#fff'
               }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <Paperclip size={20} color="var(--slate-light)" />
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--slate-light)' }}>ATTACH</span>
                  <input type="file" multiple hidden onChange={handleFileUpload} />
               </label>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: '16px 18px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
               <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--midnight)' }}>Budget Provisions *</div>
                  <div style={{ fontSize: 12, color: 'var(--slate)' }}>Is there an existing budget provision for this request?</div>
               </div>
               <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', padding: 4, borderRadius: 10, gap: 4 }}>
                  <button 
                    onClick={() => setBudgetProvisions(true)}
                    style={{ 
                      padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer', border: 'none',
                      background: budgetProvisions === true ? 'var(--emerald)' : 'transparent',
                      color: budgetProvisions === true ? '#fff' : 'var(--slate)',
                      transition: 'all 0.2s'
                    }}
                  >YES</button>
                  <button 
                    onClick={() => setBudgetProvisions(false)}
                    style={{ 
                      padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer', border: 'none',
                      background: budgetProvisions === false ? 'var(--rose)' : 'transparent',
                      color: budgetProvisions === false ? '#fff' : 'var(--slate)',
                      transition: 'all 0.2s'
                    }}
                  >NO</button>
               </div>
            </div>
          </div>
          
          {/* Urgent Request Toggle */}
          <div style={{ background: isUrgent ? 'rgba(239, 68, 68, 0.05)' : 'var(--surface)', borderRadius: 12, border: `1px solid ${isUrgent ? 'rgba(239, 68, 68, 0.2)' : 'var(--border)'}`, padding: '16px 18px', marginBottom: 16, transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: isUrgent ? 'var(--rose)' : 'var(--midnight)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isUrgent && <AlertCircle size={14} />} Urgent Request?
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--slate)' }}>Mark this request as high priority for immediate attention.</div>
               </div>
               <label className="switch">
                <input type="checkbox" checked={isUrgent} onChange={e => setIsUrgent(e.target.checked)} />
                <span className="switch-slider" style={{ backgroundColor: isUrgent ? 'var(--rose)' : '' }} />
              </label>
            </div>
          </div>

          {/* Amount toggle — only shown if template permits it */}
          {template.allows_amount && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: hasAmount ? 12 : 0 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--midnight)' }}>Include Budget / Amount?</div>
                <div style={{ fontSize: 12, color: 'var(--slate)' }}>For budget requests or reimbursements</div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={hasAmount} onChange={e => setHasAmount(e.target.checked)} />
                <span className="switch-slider" />
              </label>
            </div>
          )}

          {template.allows_amount && hasAmount && (
            <div className="field-group" style={{ marginTop: 12 }}>
              <label className="field-label">
                Requested Amount (₹) 
                {template.max_amount && <span style={{ color: 'var(--rose)', marginLeft: 8 }}>(Max: ₹{template.max_amount.toLocaleString('en-IN')})</span>}
              </label>
              <input className="field-input" type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
                style={{ fontSize: 20, fontWeight: 700 }} />
              
              <div style={{ marginTop: 16 }}>
                <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  Bifurcation / Itemized Breakdown
                </label>
                <BifurcationTable 
                  data={bifurcation} 
                  onChange={(newData) => {
                    setBifurcation(newData);
                    const total = newData.reduce((sum, item) => sum + (item.total || 0), 0);
                    if (total > 0) setAmount(total.toString());
                  }} 
                />
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button id="compose-submit" className="btn btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Submitting…' : '📨 Send for Approval'}
          </button>
        </div>
      </div>
      {viewingMedia && <MediaViewer url={viewingMedia} onClose={() => setViewingMedia(null)} />}
    </div>
  );
}

// ─── Propose Template Modal ────────────────────────────────────────────────────

function ProposeModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [steps, setSteps] = useState<{ approver_id: string; role_label: string }[]>([]);
  const [requesterRoleLabel, setRequesterRoleLabel] = useState('Prepared by');
  const [allowsAmount, setAllowsAmount] = useState(false);
  const [maxAmount, setMaxAmount] = useState('');
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [personTypes, setPersonTypes] = useState<PersonType[]>([]);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [selectedPersonTypes, setSelectedPersonTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { 
    getDesignations().then(setDesignations); 
    getPersonTypes().then(setPersonTypes);
    getProfiles().then(setAllProfiles);
  }, []);

  const addStep = (index?: number) => {
    const newStep = { approver_id: '', role_label: '' };
    if (index !== undefined) {
      const newSteps = [...steps];
      newSteps.splice(index, 0, newStep);
      setSteps(newSteps);
    } else {
      setSteps(s => [...s, newStep]);
    }
  };
  const removeStep = (i: number) => setSteps(s => s.filter((_, idx) => idx !== i));
  const updateStep = (i: number, field: string, value: string) =>
    setSteps(s => s.map((st, idx) => idx === i ? { ...st, [field]: value } : st));

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Template name is required.'); return; }
    if (steps.length === 0 || steps.some(s => !s.approver_id)) { setError('All steps must have a specific approver assigned.'); return; }
    setError(''); setLoading(true);
    try {
      const parsedMax = parseFloat(maxAmount);
      await proposeTemplate(
        name, 
        desc, 
        steps.map(s => ({ approver_id: s.approver_id, role_label: s.role_label })), 
        allowsAmount, 
        selectedPersonTypes.map(p => p.value),
        allowsAmount && !isNaN(parsedMax) ? parsedMax : undefined,
        requesterRoleLabel
      );
      onDone(); onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to propose template');
    } finally { setLoading(false); }
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Propose New Template</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Define a new approval workflow chain</div>
        </div>
        <div className="modal-body">
          {error && <div className="auth-error">{error}</div>}
          <div className="field-group">
            <label className="field-label">Template Name *</label>
            <input className="field-input" placeholder="e.g., Leave Application, Budget Request" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Description</label>
            <textarea className="field-input" rows={2} placeholder="Brief description of when to use this template" value={desc} onChange={e => setDesc(e.target.value)} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--midnight)' }}>Permission to Add Budget/Amount</div>
              <div style={{ fontSize: 12, color: 'var(--slate)' }}>Enable if requests using this template require financial tracking</div>
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
              placeholder="Leave empty for all staff categories, or select specific ones..."
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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--midnight)' }}>Approval Steps</span>
            <button className="btn btn-outline btn-sm" onClick={() => addStep()} style={{ gap: 6 }}>
              <PlusCircle size={14} /> Add Step
            </button>
          </div>

          {steps.map((step, i) => (
            <div key={i}>
              {/* Insert Before Button */}
              {i > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '-8px 0 12px' }}>
                  <button 
                    onClick={() => addStep(i)}
                    style={{ 
                      padding: '4px 12px', background: '#fff', border: '1px dashed var(--border)', borderRadius: 20, 
                      fontSize: 10, fontWeight: 800, color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                  >
                    <Plus size={10} /> Insert Step Here
                  </button>
                </div>
              )}

              <div style={{ marginBottom: 14, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: '16px', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--midnight)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--midnight)' }}>Approval Step {i + 1}</div>
                  <button onClick={() => removeStep(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rose)', padding: 4 }}>
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Select Signatory *</label>
                    <Select
                      options={allProfiles.map(p => ({ 
                        value: p.id, 
                        label: `${p.full_name} (${p.designations?.name ?? 'No Designation'})`,
                        email: p.email 
                      }))}
                      value={allProfiles.find(p => p.id === step.approver_id) ? { 
                        value: step.approver_id, 
                        label: allProfiles.find(p => p.id === step.approver_id)?.full_name + ' (' + (allProfiles.find(p => p.id === step.approver_id)?.designations?.name ?? 'No Designation') + ')',
                        email: allProfiles.find(p => p.id === step.approver_id)?.email
                      } : null}
                      onChange={(val: any) => updateStep(i, 'approver_id', val?.value || '')}
                      styles={selectStyles}
                      placeholder="Search name or email..."
                      isClearable
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Role Label</label>
                    <select 
                      className="field-input" 
                      value={step.role_label} 
                      onChange={e => updateStep(i, 'role_label', e.target.value)} 
                      style={{ marginBottom: 0 }}
                    >
                      <option value="">Default (Auto-select)</option>
                      <option value="Prepared by">Prepared by</option>
                      <option value="Verified by">Verified by</option>
                      <option value="Forwarded by">Forwarded by</option>
                      <option value="Recommended by">Recommended by</option>
                      <option value="Approved by">Approved by</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Insert After Button (only for last step) */}
              {i === steps.length - 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: -8, marginBottom: 20 }}>
                  <button 
                    onClick={() => addStep()}
                    style={{ 
                      padding: '4px 12px', background: '#fff', border: '1px dashed var(--border)', borderRadius: 20, 
                      fontSize: 10, fontWeight: 800, color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                  >
                    <Plus size={10} /> Add Next Step
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button id="propose-submit" className="btn btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Submitting…' : '📋 Submit for Approval'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Template Card ─────────────────────────────────────────────────────────────

function TemplateCard({ template, onClick }: { template: ApprovalTemplate; onClick: () => void }) {
  const steps = template.template_steps?.sort((a, b) => a.step_order - b.step_order) || [];
  return (
    <div className="template-card" onClick={onClick}>
      <div className="template-card-header">
        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileText size={20} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: -0.3, marginBottom: 2 }}>{template.name}</div>
          {template.description && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{template.description}</div>}
        </div>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ArrowRight size={16} color="rgba(255,255,255,0.7)" />
        </div>
      </div>
      <div className="template-card-body">
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--slate)', letterSpacing: 1.2, marginBottom: 10 }}>APPROVAL CHAIN</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {steps.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(10,15,30,0.05)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(10,15,30,0.08)' }}>
                 <span style={{ fontSize: 8, fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.role_label || 'Approver'}</span>
                 <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--midnight)' }}>
                    {s.profiles ? (Array.isArray(s.profiles.designations) ? s.profiles.designations[0]?.name : (s.profiles.designations as any)?.name) ?? s.profiles.full_name : 'Approver'}
                 </span>
              </div>
              {i < steps.length - 1 && <ArrowRight size={10} color="var(--slate-light)" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const { profile } = useAuth();
  const [templates, setTemplates] = useState<ApprovalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [composeFor, setComposeFor] = useState<ApprovalTemplate | null>(null);
  const [showPropose, setShowPropose] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setTemplates(await getTemplates()); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = templates.filter(t => {
    // Filter by person type visibility
    if (t.visible_to_person_types && t.visible_to_person_types.length > 0) {
      if (!profile?.person_type_id || !t.visible_to_person_types.includes(profile.person_type_id)) {
        return false;
      }
    }
    // Filter by search string
    if (search) {
      return t.name.toLowerCase().includes(search.toLowerCase()) || (t.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
    }
    return true;
  });

  return (
    <AppShell
      title="Letter Templates"
      center={
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Image 
            src="/aiktc-bannerlogo.avif" 
            alt="AIKTC Banner Logo" 
            width={400} 
            height={60} 
            className="h-9 w-auto object-contain sm:h-11"
            priority
          />
        </div>
      }
      actions={
        profile?.is_admin && (
          <button id="propose-template-btn" className="topbar-btn topbar-btn-primary" onClick={() => setShowPropose(true)}>
            <Plus size={16} /> Propose Template
          </button>
        )
      }
    >
      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 28, maxWidth: 480 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-light)' }} />
        <input
          id="template-search"
          className="field-input"
          style={{ paddingLeft: 42, paddingRight: search ? 42 : 16 }}
          placeholder="Search templates…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-light)', padding: 4 }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="loading-spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Files size={32} color="var(--slate-light)" /></div>
          <div className="empty-state-title">{search ? 'No templates match your search' : 'No active templates'}</div>
          <p className="empty-state-text">{search ? 'Try a different search term.' : 'Contact an administrator to create a new template.'}</p>
          {!search && profile?.is_admin && (
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setShowPropose(true)}>
              <Plus size={16} /> Propose New Template
            </button>
          )}
        </div>
      ) : (
        <div className="template-grid">
          {filtered.map(t => <TemplateCard key={t.id} template={t} onClick={() => setComposeFor(t)} />)}
        </div>
      )}

      {/* Modals */}
      {composeFor && (
        <ComposeModal template={composeFor} onClose={() => setComposeFor(null)} onDone={load} />
      )}
      {showPropose && (
        <ProposeModal onClose={() => setShowPropose(false)} onDone={load} />
      )}
    </AppShell>
  );
}
