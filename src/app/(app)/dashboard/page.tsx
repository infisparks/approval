'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle, CheckSquare, FileText, FileCog, CheckCircle2,
  FileSignature, FileQuestion, Inbox, Clock, RotateCcw,
  XCircle, Banknote, Plus, ArrowRight, Check, Circle,
  Download, RefreshCw, Info, User as UserIcon
} from 'lucide-react';
import DownloadPDFButton from '@/components/DownloadPDFButton';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import BifurcationTable, { BifurcationItem } from '@/components/BifurcationTable';
import {
  getPendingApprovals, getApprovalHistory, getRequestsByRequester,
  approveRequest, rejectRequest, revertRequest, resubmitRequest,
  getApproversByDesignation
} from '@/lib/api';
import { ApprovalRequest, ApprovalTemplate, RequestApproval, TemplateStep } from '@/lib/types';

// ─── Status helpers ──────────────────────────────────────────────────────────

function statusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'approved': return 'var(--emerald)';
    case 'rejected': return 'var(--rose)';
    case 'reverted': return 'var(--rose)';
    case 'pending': return 'var(--gold)';
    default: return 'var(--slate)';
  }
}
function statusBgClass(status: string) {
  switch (status.toLowerCase()) {
    case 'approved': return 'badge-emerald';
    case 'rejected': return 'badge-rose';
    case 'reverted': return 'badge-rose';
    case 'pending': return 'badge-gold';
    default: return 'badge-slate';
  }
}
function StatusBadge({ status }: { status: string }) {
  const label = status.toUpperCase();
  return <span className={`badge ${statusBgClass(status)}`}>{label}</span>;
}


// ─── Approval Modal ───────────────────────────────────────────────────────────

function ApprovalModal({
  req, onClose, onDone,
}: { req: ApprovalRequest; onClose: () => void; onDone: () => void }) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const act = async (action: 'approve' | 'reject' | 'revert') => {
    if (action === 'revert' && !comment.trim()) {
      setError('Please add a comment when reverting.'); return;
    }
    setError('');
    setLoading(action);
    try {
      if (action === 'approve') await approveRequest(req.id, req.current_step_order, comment);
      else if (action === 'reject') await rejectRequest(req.id, req.current_step_order, comment);
      else await revertRequest(req.id, req.current_step_order, comment);
      onDone();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setLoading(null);
    }
  };

  const steps = req.approval_templates?.template_steps?.sort((a, b) => a.step_order - b.step_order) || [];
  const hasChanges = req.last_reverted_step_order !== undefined;

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className={`badge ${statusBgClass('pending')}`}>PENDING REVIEW</span>
            <span className="badge badge-accent" style={{ fontSize: 10 }}>{req.template_name ?? req.approval_templates?.name}</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: -0.5, marginBottom: 4 }}>{req.title}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>From {req.requester_name ?? req.profiles?.full_name}</div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
            {req.has_amount && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '6px 14px' }}>
                <Banknote size={14} color="#fff" />
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>₹ {(req.amount ?? 0).toFixed(2)}</span>
              </div>
            )}
            
            {req.has_amount && (
              <div style={{ 
                padding: '6px 12px', background: req.budget_provisions ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)', 
                borderRadius: 10, border: `1px solid ${req.budget_provisions ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`,
                display: 'flex', alignItems: 'center', gap: 6
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: req.budget_provisions ? 'var(--emerald)' : 'var(--rose)' }} />
                <span style={{ fontSize: 10, fontWeight: 900, color: req.budget_provisions ? 'var(--emerald)' : 'var(--rose)', letterSpacing: 0.5 }}>
                  BUDGET {req.budget_provisions ? 'PROVISIONED' : 'NOT PROVISIONED'}
                </span>
              </div>
            )}

            {hasChanges && (
              <div style={{ padding: '6px 12px', background: 'rgba(16,185,129,0.15)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={12} color="var(--emerald)" />
                <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--emerald)', letterSpacing: 0.5 }}>REVISED & UPDATED</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="modal-body">
          {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

          {/* Letter content with Diff Viewer */}
          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--slate)', letterSpacing: 1, marginBottom: 6 }}>SUBJECT</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--midnight)', marginBottom: 14 }}>{req.content?.subject ?? req.title}</div>
            
            <div style={{ height: 1, background: 'var(--border)', marginBottom: 14 }} />
            
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--slate)', letterSpacing: 1, marginBottom: 8 }}>LETTER BODY</div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--slate)', whiteSpace: 'pre-wrap' }}>
              {req.content?.body ?? 'No body provided.'}
            </div>
            
            {req.has_amount && req.bifurcation && Array.isArray(req.bifurcation) && req.bifurcation.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--slate)', letterSpacing: 1, marginBottom: 8 }}>
                  BIFURCATION
                </div>
                <BifurcationTable data={req.bifurcation} onChange={() => {}} readOnly />
              </div>
            )}
          </div>

          {/* Approval Chain history */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--slate)', letterSpacing: 1.5, marginBottom: 12 }}>APPROVAL HISTORY & FEEDBACK</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {steps.filter(s => s.step_order <= req.current_step_order).map((step) => {
                const hist = (req.request_approvals || [])
                  .filter(a => a.step_order === step.step_order)
                  .sort((a, b) => new Date(b.acted_at ?? 0).getTime() - new Date(a.acted_at ?? 0).getTime());
                
                const isCurrent = step.step_order === req.current_step_order;
                if (hist.length === 0 && !isCurrent) return null;

                return (
                  <div key={step.id} style={{ 
                    padding: '12px 16px', 
                    borderRadius: 12, 
                    background: isCurrent ? 'rgba(245,158,11,0.05)' : 'rgba(16,185,129,0.05)',
                    border: `1px solid ${isCurrent ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hist[0]?.comments ? 8 : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ 
                          width: 24, height: 24, borderRadius: '50%', 
                          background: isCurrent ? 'var(--gold)' : 'var(--emerald)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {isCurrent ? <Clock size={12} color="#fff" /> : <Check size={12} color="#fff" />}
                        </div>
                        <div>
                          <div style={{ fontSize: 9, color: 'var(--slate)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 1 }}>{step.role_label || 'Approver'}</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--midnight)' }}>{step.designations?.name ?? 'Approver'}</div>
                          <div style={{ fontSize: 9, color: isCurrent ? 'var(--gold)' : 'var(--emerald)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {isCurrent ? 'YOUR CURRENT STEP' : 'OFFICIALLY SIGNED'}
                          </div>
                        </div>
                      </div>
                      {!isCurrent && hist[0]?.acted_at && (
                        <span style={{ fontSize: 10, color: 'var(--slate-light)', fontWeight: 600 }}>
                          {new Date(hist[0].acted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    {hist.map(h => (
                      h.comments && (
                        <div key={h.id} style={{ 
                          marginTop: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.4)', borderLeft: `3px solid ${h.status === 'reverted' ? 'var(--rose)' : 'var(--emerald)'}44` 
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: h.status === 'reverted' ? 'var(--rose)' : 'var(--emerald)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {h.status === 'reverted' ? <RotateCcw size={10} /> : <CheckCircle2 size={10} />}
                            {h.status.toUpperCase()} BY {h.approver_name ?? h.profiles?.full_name}
                          </div>
                          <p style={{ fontSize: 12, color: 'var(--slate)', margin: 0, fontStyle: 'italic', lineHeight: 1.4 }}>
                            &ldquo;{h.comments}&rdquo;
                          </p>
                        </div>
                      )
                    ))}
                    {hist.length === 0 && isCurrent && (
                      <p style={{ fontSize: 12, color: 'var(--gold)', margin: 0, fontStyle: 'italic', opacity: 0.7 }}>Awaiting your final review...</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Comment */}
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label">Remarks / Feedback</label>
            <textarea className="field-input" rows={3} placeholder="Add a note explaining your decision..." value={comment} onChange={e => setComment(e.target.value)} />
          </div>
        </div>

        <div className="modal-footer">
          <button id="reject-btn" className="btn btn-outline-rose btn-sm" style={{ flex: 1 }} onClick={() => act('reject')} disabled={!!loading}>
            {loading === 'reject' ? '...' : 'Reject'}
          </button>
          <button id="revert-btn" className="btn btn-revert btn-sm" style={{ flex: 1 }} onClick={() => act('revert')} disabled={!!loading}>
            {loading === 'revert' ? '...' : 'Revert'}
          </button>
          <button id="approve-btn" className="btn btn-emerald btn-sm" style={{ flex: 1 }} onClick={() => act('approve')} disabled={!!loading}>
            {loading === 'approve' ? '...' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Request Detail Modal ─────────────────────────────────────────────────────

function RequestDetailModal({
  req, onClose, onDone,
}: { req: ApprovalRequest; onClose: () => void; onDone: () => void }) {
  const [resubmitting, setResubmitting] = useState(false);
  const [subject, setSubject] = useState(req.content?.subject ?? '');
  const [body, setBody] = useState(req.content?.body ?? '');
  const [amount, setAmount] = useState(String(req.amount ?? 0));
  const [bifurcation, setBifurcation] = useState<BifurcationItem[]>(req.bifurcation || []);
  const [loading, setLoading] = useState(false);

  const steps = req.approval_templates?.template_steps?.sort((a, b) => a.step_order - b.step_order) || [];

  const doResubmit = async () => {
    setLoading(true);
    try {
      await resubmitRequest(req.id, { subject, body }, req.has_amount ? parseFloat(amount) : undefined, req.has_amount ? bifurcation : undefined);
      onDone(); onClose();
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const stepHistory = (stepOrder: number) =>
    (req.request_approvals || []).filter(a => a.step_order === stepOrder).sort((a, b) =>
      new Date(b.acted_at ?? 0).getTime() - new Date(a.acted_at ?? 0).getTime()
    );

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StatusBadge status={req.status} />
              {req.status === 'approved' && <DownloadPDFButton request={req} />}
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>✕ Close</button>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: -0.5, marginBottom: 4 }}>{req.title}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{req.template_name ?? req.approval_templates?.name}</div>
          {req.has_amount && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '6px 14px' }}>
                <Banknote size={14} color="#fff" />
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>₹ {(req.amount ?? 0).toFixed(2)}</span>
              </div>
              <div style={{ 
                padding: '6px 12px', background: req.budget_provisions ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)', 
                borderRadius: 10, border: `1px solid ${req.budget_provisions ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`,
                display: 'flex', alignItems: 'center', gap: 6
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: req.budget_provisions ? 'var(--emerald)' : 'var(--rose)' }} />
                <span style={{ fontSize: 10, fontWeight: 900, color: req.budget_provisions ? 'var(--emerald)' : 'var(--rose)', letterSpacing: 0.5 }}>
                  BUDGET {req.budget_provisions ? 'PROVISIONED' : 'NOT PROVISIONED'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="modal-body" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
          {/* Letter content */}
          {!resubmitting && (
            <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 18, marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--slate)', letterSpacing: 1, marginBottom: 6 }}>SUBJECT</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--midnight)', marginBottom: 14 }}>{req.content?.subject ?? req.title}</div>
              <div style={{ height: 1, background: 'var(--border)', marginBottom: 14 }} />
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--slate)', letterSpacing: 1, marginBottom: 8 }}>BODY</div>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--slate)', whiteSpace: 'pre-wrap' }}>{req.content?.body ?? ''}</div>
              
              {req.has_amount && req.bifurcation && Array.isArray(req.bifurcation) && req.bifurcation.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--slate)', letterSpacing: 1, marginBottom: 8 }}>BIFURCATION</div>
                  <BifurcationTable data={req.bifurcation} onChange={() => {}} readOnly />
                </div>
              )}
            </div>
          )}

          {/* Resubmit form */}
          {resubmitting && (
            <div style={{ marginBottom: 20 }}>
              <div className="field-group">
                <label className="field-label">Subject</label>
                <input className="field-input" value={subject} onChange={e => setSubject(e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">Body</label>
                <textarea className="field-input" rows={6} value={body} onChange={e => setBody(e.target.value)} />
              </div>
              {req.has_amount && (
                <div className="field-group">
                  <label className="field-label">Amount (₹)</label>
                  <input className="field-input" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
                  
                  <div style={{ marginTop: 16 }}>
                    <label className="field-label">Bifurcation / Itemized Breakdown</label>
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
          )}

          {/* Timeline */}
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--slate)', letterSpacing: 1.5, marginBottom: 14 }}>APPROVAL TIMELINE</div>
          <div className="timeline">
            {steps.map((step, idx) => {
              const hist = stepHistory(step.step_order);
              const latest = hist[0];
              const isApproved = latest?.status === 'approved';
              const isReverted = latest?.status === 'reverted';
              const isRejected = latest?.status === 'rejected';
              const isCurrent = req.status === 'pending' && req.current_step_order === step.step_order;
              const isLast = idx === steps.length - 1;

              const dotColor = isApproved ? 'var(--emerald)' : (isReverted || isRejected) ? 'var(--rose)' : isCurrent ? 'var(--gold)' : 'rgba(100,116,139,0.2)';
              const lineColor = isApproved ? 'var(--emerald)' : 'rgba(100,116,139,0.15)';

              return (
                <div key={step.id} className="timeline-item">
                  <div className="timeline-track">
                    <div className="timeline-dot" style={{ background: dotColor }}>
                      {isApproved ? <Check size={12} color="#fff" /> : isCurrent ? <Clock size={12} color="#fff" /> : (isReverted || isRejected) ? <XCircle size={12} color="#fff" /> : <Circle size={10} color="rgba(100,116,139,0.5)" />}
                    </div>
                    {!isLast && <div className="timeline-line" style={{ background: lineColor }} />}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-card">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hist.length ? 12 : 0 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{step.role_label || 'Approver'}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--midnight)' }}>{step.designations?.name ?? 'Approver'}</span>
                        </div>
                        {isApproved && <span className="badge badge-emerald">APPROVED</span>}
                        {isReverted && <span className="badge badge-rose">REVERTED</span>}
                        {isRejected && <span className="badge badge-rose">REJECTED</span>}
                        {isCurrent && !latest && <span className="badge badge-gold">PENDING</span>}
                      </div>
                      {hist.map(h => (
                        <div key={h.id} style={{ 
                          marginTop: 10, 
                          padding: '12px 16px', 
                          borderRadius: 12, 
                          background: h.status === 'approved' ? 'rgba(16,185,129,0.06)' : h.status === 'reverted' ? 'rgba(245,158,11,0.06)' : 'rgba(244,63,94,0.06)',
                          border: `1px solid ${h.status === 'approved' ? 'rgba(16,185,129,0.15)' : h.status === 'reverted' ? 'rgba(245,158,11,0.15)' : 'rgba(244,63,94,0.15)'}`,
                          position: 'relative'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: h.comments ? 10 : 0 }}>
                            <div style={{ 
                              width: 28, height: 28, borderRadius: '50%', 
                              background: statusColor(h.status), 
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: `0 0 10px ${statusColor(h.status)}44`
                            }}>
                              {h.status === 'approved' ? <Check size={14} color="#fff" /> : <RotateCcw size={14} color="#fff" />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--midnight)', letterSpacing: -0.2 }}>
                                  {h.approver_name ?? h.profiles?.full_name ?? 'Authorized Signatory'}
                                </span>
                                <span style={{ fontSize: 10, color: 'var(--slate-light)', fontWeight: 600 }}>
                                  {h.acted_at && new Date(h.acted_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div style={{ fontSize: 10, color: statusColor(h.status), fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginTop: 1 }}>
                                {h.status === 'approved' ? 'Verified Approval' : 'Form Reverted'}
                              </div>
                            </div>
                          </div>
                          {h.comments && (
                            <div style={{ 
                              background: 'rgba(255,255,255,0.4)', 
                              padding: '10px 12px', 
                              borderRadius: 8, 
                              fontSize: 13, 
                              color: 'var(--slate)', 
                              lineHeight: 1.5,
                              borderLeft: `3px solid ${statusColor(h.status)}44`
                            }}>
                              &ldquo;{h.comments}&rdquo;
                            </div>
                          )}
                        </div>
                      ))}
                      {hist.length === 0 && isCurrent && <p style={{ fontSize: 12, color: 'var(--gold)', margin: 0, fontWeight: 600 }}>Awaiting decision…</p>}
                      {hist.length === 0 && !isCurrent && <p style={{ fontSize: 12, color: 'var(--slate-light)', margin: 0, fontStyle: 'italic' }}>Queued — waiting for previous approval</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {req.status === 'reverted' && (
          <div className="modal-footer">
            {!resubmitting ? (
              <button className="btn btn-accent btn-full" onClick={() => setResubmitting(true)}>
                ✏️ Edit &amp; Resubmit
              </button>
            ) : (
              <>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setResubmitting(false)}>Cancel</button>
                <button className="btn btn-emerald" style={{ flex: 2 }} onClick={doResubmit} disabled={loading}>{loading ? 'Submitting…' : 'Resubmit Request'}</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}



function Section({ title, icon, color, children }: { title: string; icon: React.ReactNode; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div className="section-header">
        <div className="section-title">
          <div className="section-icon" style={{ background: `${color}18` }}>
            <span style={{ color }}>{icon}</span>
          </div>
          {title}
        </div>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ message, icon }: { message: string; icon: React.ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <p className="empty-state-text">{message}</p>
    </div>
  );
}

// ─── Request Card components ──────────────────────────────────────────────────

function ActionCard({ req, onClick }: { req: ApprovalRequest; onClick: () => void }) {
  return (
    <div className="request-card" onClick={onClick} style={{ borderLeft: '3px solid var(--gold)' }}>
      <div className="request-card-row">
        <div className="request-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>
          <FileSignature size={18} color="var(--gold)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div className="request-title" style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.title}</div>
            {req.cells?.name && <span className="badge badge-slate" style={{ fontSize: 9 }}>{req.cells.name}</span>}
          </div>
          <div className="request-meta">From {req.requester_name ?? req.profiles?.full_name ?? 'Unknown'} · {req.template_name}</div>
          {req.has_amount && (
            <div style={{ fontSize: 13, fontWeight: 800, color: '#15803d', marginTop: 4 }}>₹ {req.amount?.toLocaleString('en-IN')}</div>
          )}
        </div>
        <ArrowRight size={16} color="var(--slate-light)" />
      </div>
    </div>
  );
}

function SignedCard({ req, onClick }: { req: ApprovalRequest; onClick: () => void }) {
  return (
    <div className="request-card" onClick={onClick} style={{ borderLeft: '3px solid var(--accent)' }}>
      <div className="request-card-row">
        <div className="request-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>
          <CheckSquare size={18} color="var(--accent)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div className="request-title" style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.title}</div>
            {req.cells?.name && <span className="badge badge-slate" style={{ fontSize: 9 }}>{req.cells.name}</span>}
          </div>
          <div className="request-meta">From {req.requester_name ?? req.profiles?.full_name ?? 'Unknown'} · <StatusBadge status={req.status} /></div>
          {req.has_amount && (
            <div style={{ fontSize: 13, fontWeight: 800, color: '#15803d', marginTop: 4 }}>₹ {req.amount?.toLocaleString('en-IN')}</div>
          )}
        </div>
        <ArrowRight size={16} color="var(--slate-light)" />
      </div>
    </div>
  );
}

function MyRequestCard({ req, onClick }: { req: ApprovalRequest; onClick: () => void }) {
  const steps = req.approval_templates?.template_steps?.sort((a, b) => a.step_order - b.step_order) || [];
  const latestAction = (req.request_approvals || [])
    .sort((a, b) => new Date(b.acted_at || 0).getTime() - new Date(a.acted_at || 0).getTime())[0];

  const [hoverStep, setHoverStep] = useState<string | null>(null);
  const [approverNames, setApproverNames] = useState<Record<string, string[]>>({});
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (hoverStep && popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setHoverStep(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [hoverStep]);

  const showApprovers = async (e: React.MouseEvent, step: TemplateStep) => {
    e.stopPropagation();
    if (approverNames[step.id]) {
      setHoverStep(hoverStep === step.id ? null : step.id);
      return;
    }
    setLoadingStep(step.id);
    setHoverStep(step.id);
    try {
      const users = await getApproversByDesignation(step.designation_id, step.context, {
        departmentId: req.profiles?.department_id,
        instituteTypeId: req.profiles?.institute_type_id,
        instituteId: req.profiles?.institute_id
      });
      setApproverNames(prev => ({ ...prev, [step.id]: users.map(u => u.full_name) }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStep(null);
    }
  };

  return (
    <div className="request-card" onClick={onClick} style={{ borderLeft: `3px solid ${statusColor(req.status)}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="request-title" style={{ marginBottom: 4 }}>{req.title}</div>
          {req.cells?.name && <span className="badge badge-slate" style={{ fontSize: 9 }}>{req.cells.name}</span>}
        </div>
        {req.status === 'reverted'
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6, background: 'linear-gradient(135deg, var(--rose), var(--gold))', color: '#fff', fontSize: 10, fontWeight: 800 }}><RotateCcw size={10} /> REVERTED</span>
          : <StatusBadge status={req.status} />
        }
      </div>
      
      {req.has_amount && (
        <div style={{ marginBottom: 12, padding: '6px 12px', background: 'rgba(22,163,74,0.05)', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(22,163,74,0.1)' }}>
          <Banknote size={14} color="#16a34a" />
          <span style={{ fontSize: 14, fontWeight: 900, color: '#15803d' }}>₹ {req.amount?.toLocaleString('en-IN')}</span>
        </div>
      )}

      {req.status === 'reverted' && latestAction && (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.1)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--rose)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <RotateCcw size={10} /> REVERTED BY {latestAction.approver_name ?? latestAction.profiles?.full_name}
          </div>
          <p style={{ fontSize: 12, color: 'var(--slate)', margin: 0, fontStyle: 'italic', lineHeight: 1.4 }}>
            &quot;{latestAction.comments || 'Please check the details and resubmit.'}&quot;
          </p>
        </div>
      )}

      {req.status === 'approved' && (
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.1)', color: 'var(--emerald)', fontSize: 10, fontWeight: 800 }}>✓ FULLY SIGNED</div>
        </div>
      )}

      {steps.length > 0 && (
        <div className="chain-row" style={{ flexWrap: 'wrap', rowGap: 8 }}>
          {steps.map((s, i) => {
            const done = (req.request_approvals || []).some(a => a.step_order === s.step_order && a.status === 'approved');
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflow: 'hidden', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                   <span className="chain-step" style={{
                    background: done ? 'linear-gradient(135deg, var(--emerald), var(--emerald2))' : 'rgba(245,158,11,0.08)',
                    color: done ? '#fff' : 'var(--gold)',
                    border: `1px solid ${done ? 'transparent' : 'rgba(245,158,11,0.25)'}`,
                    borderRadius: 0,
                    marginRight: 0,
                    paddingRight: 8
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 7, fontWeight: 900, color: done ? 'rgba(255,255,255,0.7)' : 'var(--slate)', textTransform: 'uppercase', letterSpacing: 0.3, lineHeight: 1 }}>{s.role_label || 'Approve'}</span>
                      <span style={{ lineHeight: 1.2 }}>{s.designations?.name ?? 'Approver'}</span>
                    </div>
                  </span>
                  <button 
                    onClick={(e) => showApprovers(e, s)}
                    style={{
                      height: 22,
                      padding: '0 6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: done ? 'var(--emerald2)' : 'rgba(245,158,11,0.12)',
                      color: '#fff',
                      border: 'none',
                      borderLeft: `1px solid ${done ? 'rgba(255,255,255,0.2)' : 'rgba(245,158,11,0.2)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = done ? 'var(--emerald)' : 'rgba(245,158,11,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = done ? 'var(--emerald2)' : 'rgba(245,158,11,0.12)';
                    }}
                  >
                    <Info size={11} strokeWidth={3} color={done ? '#fff' : 'var(--gold)'} />
                  </button>
                </div>
                
                {hoverStep === s.id && (
                  <div 
                    ref={popupRef}
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 10px)',
                      left: 0,
                      marginBottom: 0,
                      background: 'var(--midnight)',
                      color: '#fff',
                      padding: '12px 16px',
                      borderRadius: 14,
                      fontSize: 12,
                      zIndex: 200,
                      minWidth: 160,
                      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.5)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}>
                    <div style={{ fontWeight: 900, marginBottom: 8, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontSize: 9, letterSpacing: 1.5 }}>Step Authorized Persons</div>
                    {loadingStep === s.id ? (
                      <div className="animate-spin" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
                    ) : approverNames[s.id]?.length ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {approverNames[s.id].map(name => (
                          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                            <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <UserIcon size={12} color="var(--accent)" />
                            </div>
                            <span style={{ fontWeight: 700 }}>{name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ opacity: 0.5, fontSize: 11 }}>System route — automatic detection</div>
                    )}
                    <div style={{ position: 'absolute', top: '100%', left: 14, width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '7px solid var(--midnight)' }} />
                  </div>
                )}

                {i < steps.length - 1 && <ArrowRight size={9} color="var(--slate-light)" style={{ margin: '0 2px' }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { profile } = useAuth();
  const router = useRouter();

  const [pending, setPending] = useState<ApprovalRequest[]>([]);
  const [signed, setSigned] = useState<ApprovalRequest[]>([]);
  const [myReqs, setMyReqs] = useState<ApprovalRequest[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedAction, setSelectedAction] = useState<ApprovalRequest | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ApprovalRequest | null>(null);

  const isAdmin = profile?.is_admin;
  const designationName = profile?.designations?.name?.toLowerCase() || '';
  const nonApproverRoles = ['faculty', 'clerk', ''];
  const isApprover = !nonApproverRoles.includes(designationName);

  const loadAll = useCallback(async () => {
    setLoadingData(true);
    try {
      const fetchers: Promise<any>[] = [getRequestsByRequester()];
      if (isApprover) {
        fetchers.push(getPendingApprovals());
        fetchers.push(getApprovalHistory());
      }
      
      const results = await Promise.all(fetchers);
      setMyReqs(results[0]);
      
      if (isApprover) {
        setPending(results[1]);
        setSigned(results[2]);
      }
    } finally { setLoadingData(false); }
  }, [isApprover]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const stats = [
    { label: 'My Requests', value: myReqs.length, color: 'var(--emerald)', icon: <FileText size={18} /> },
    { label: 'Approved', value: myReqs.filter(r => r.status === 'approved').length, color: 'var(--gold)', icon: <CheckCircle2 size={18} /> },
  ];

  if (isApprover) {
    stats.unshift(
      { label: 'Action Required', value: pending.length, color: 'var(--rose)', icon: <AlertCircle size={18} /> },
      { label: 'Signed by Me', value: signed.length, color: 'var(--accent)', icon: <CheckSquare size={18} /> }
    );
  }

  return (
    <AppShell
      title="Dashboard"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            className="topbar-btn topbar-btn-outline" 
            onClick={loadAll} 
            disabled={loadingData}
            title="Refresh dashboard"
          >
            <RefreshCw size={16} className={loadingData ? 'animate-spin' : ''} />
          </button>
          <button className="topbar-btn topbar-btn-primary" onClick={() => router.push('/templates')}>
            <Plus size={16} /> New Letter
          </button>
        </div>
      }
    >
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-[20px] p-6 sm:p-8 mb-7 bg-gradient-to-br from-[#0f172a] to-[#1e293b]">
        {/* Decorative elements */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-emerald-500/5 blur-2xl" />
        
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xl font-black text-white shadow-lg shadow-blue-500/20 flex-shrink-0">
            {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-width-0">
            <div className="text-sm text-slate-400 font-medium mb-1">Good day,</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2 leading-tight">
              {profile?.full_name ?? 'User'}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                  {profile?.designations?.name}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-semibold">
                {profile?.departments?.name} · {profile?.institutes?.name}
              </span>
            </div>
          </div>
          {isAdmin && (
            <div className="mt-4 sm:mt-0 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold flex items-center gap-2">
              <span className="text-sm">👑</span>
              ADMIN OVERSIGHT
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {stats.map(s => (
          <div className="stat-card" key={s.label}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--slate)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${s.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
            </div>
            <div className="stat-num" style={{ color: s.color }}>{loadingData ? '—' : s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-7">
        {isApprover && (
          <div className="content-col">
            {/* Action Required */}
            <Section title="Action Required" icon={<AlertCircle size={16} />} color="var(--rose)">
              {loadingData ? <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="loading-spinner" /></div>
                : pending.length === 0 ? <EmptyState message="No pending approvals — you're all caught up!" icon={<CheckCircle2 size={28} color="var(--slate-light)" />} />
                : <div className="request-list">{pending.map(r => <ActionCard key={r.id} req={r} onClick={() => setSelectedAction(r)} />)}</div>}
            </Section>



            {/* Signed by Me */}
            <Section title="Signed by Me" icon={<CheckSquare size={16} />} color="var(--accent)">
              {loadingData ? <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="loading-spinner" /></div>
                : signed.length === 0 ? <EmptyState message="You haven't signed any letters yet." icon={<FileSignature size={28} color="var(--slate-light)" />} />
                : <div className="request-list">{signed.map(r => <SignedCard key={r.id} req={r} onClick={() => setSelectedDetail(r)} />)}</div>}
            </Section>
          </div>
        )}

        {/* Right column: My Requests */}
        <div>
          <Section title="My Requests" icon={<FileText size={16} />} color="var(--emerald)">
            {loadingData ? <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="loading-spinner" /></div>
              : myReqs.length === 0 ? <EmptyState message="You haven't submitted any requests yet." icon={<FileQuestion size={28} color="var(--slate-light)" />} />
              : <div className="request-list">
                  {myReqs.map(r => <MyRequestCard key={r.id} req={r} onClick={() => setSelectedDetail(r)} />)}
                </div>}
          </Section>
        </div>
      </div>

      {/* Modals */}
      {selectedAction && (
        <ApprovalModal req={selectedAction} onClose={() => setSelectedAction(null)} onDone={loadAll} />
      )}
      {selectedDetail && (
        <RequestDetailModal req={selectedDetail} onClose={() => setSelectedDetail(null)} onDone={loadAll} />
      )}
    </AppShell>
  );
}
