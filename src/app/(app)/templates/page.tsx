'use client';
import { useState, useEffect, useRef } from 'react';
import { Files, Search, Plus, FileText, ArrowRight, Trash2, PlusCircle, X, CheckCircle2 } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { getTemplates, getDesignations, proposeTemplate, createRequest, getCells } from '@/lib/api';
import { ApprovalTemplate, Designation, Cell } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

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

  const steps = template.template_steps?.sort((a, b) => a.step_order - b.step_order) || [];

  const filteredCells = cells.filter(c => 
    c.name.toLowerCase().includes(cellSearch.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!subject.trim() || !body.trim() || !cellId) { 
      setError('Please fill in all fields, including the receiving Cell.'); 
      return; 
    }
    setError(''); setLoading(true);
    try {
      await createRequest(
        template.id, subject,
        { subject, body, type: template.name },
        cellId,
        hasAmount, hasAmount ? parseFloat(amount) || 0 : 0,
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
                  <span style={{ padding: '4px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', fontSize: 12, fontWeight: 600, color: '#fff' }}>
                    {s.designations?.name ?? 'Approver'}
                  </span>
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

          {/* Amount toggle */}
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

          {hasAmount && (
            <div className="field-group" style={{ marginTop: 12 }}>
              <label className="field-label">Requested Amount (₹)</label>
              <input className="field-input" type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
                style={{ fontSize: 20, fontWeight: 700 }} />
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
    </div>
  );
}

// ─── Propose Template Modal ────────────────────────────────────────────────────

function ProposeModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [steps, setSteps] = useState<{ designation_id: string; context: string }[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { getDesignations().then(setDesignations); }, []);

  const addStep = () => setSteps(s => [...s, { designation_id: '', context: 'departmental' }]);
  const removeStep = (i: number) => setSteps(s => s.filter((_, idx) => idx !== i));
  const updateStep = (i: number, field: string, value: string) =>
    setSteps(s => s.map((st, idx) => idx === i ? { ...st, [field]: value } : st));

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Template name is required.'); return; }
    if (steps.length === 0 || steps.some(s => !s.designation_id)) { setError('All steps must have a designation.'); return; }
    setError(''); setLoading(true);
    try {
      await proposeTemplate(name, desc, steps);
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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--midnight)' }}>Approval Steps</span>
            <button className="btn btn-outline btn-sm" onClick={addStep} style={{ gap: 6 }}>
              <PlusCircle size={14} /> Add Step
            </button>
          </div>

          {steps.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--slate)', fontSize: 13, background: 'var(--surface)', borderRadius: 12, border: '1px dashed var(--border)' }}>
              No steps yet. Add at least one step.
            </div>
          )}

          {steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 14px' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--midnight)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
              <select className="field-input" style={{ marginBottom: 0, flex: 2 }} value={step.designation_id} onChange={e => updateStep(i, 'designation_id', e.target.value)}>
                <option value="">Select Designation</option>
                {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select className="field-input" style={{ marginBottom: 0, flex: 1 }} value={step.context} onChange={e => updateStep(i, 'context', e.target.value)}>
                <option value="departmental">Departmental</option>
                <option value="institute">Institute-level</option>
                <option value="global">Global</option>
              </select>
              <button onClick={() => removeStep(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rose)', padding: 4 }}>
                <Trash2 size={16} />
              </button>
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
              <span style={{ padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: 'var(--midnight)', background: 'rgba(10,15,30,0.05)', border: '1px solid rgba(10,15,30,0.08)' }}>
                {s.designations?.name ?? 'Approver'}
              </span>
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

  const filtered = search
    ? templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || (t.description?.toLowerCase().includes(search.toLowerCase()) ?? false))
    : templates;

  return (
    <AppShell
      title="Letter Templates"
      actions={
        <button id="propose-template-btn" className="topbar-btn topbar-btn-primary" onClick={() => setShowPropose(true)}>
          <Plus size={16} /> Propose Template
        </button>
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
          <p className="empty-state-text">{search ? 'Try a different search term.' : 'Propose a new workflow template to get started.'}</p>
          {!search && (
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
