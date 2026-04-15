'use client';

import React, { useState, useEffect, Fragment } from 'react';
import { 
  Receipt, Plus, Search, CheckCircle2, 
  Clock, XCircle, ChevronRight, AlertCircle, TrendingDown, TrendingUp, X, MapPin, ExternalLink, Eye,
  Package, Calculator, Landmark, ShieldCheck, History as HistoryIcon, ArrowBigLeft, ArrowRight, FileText, Wallet, Save, File, Download
} from 'lucide-react';
import { 
  getSettlements, createSettlement, 
  approveSettlement, revertSettlement, getRequestsByRequester,
  addSettlementAdvance 
} from '@/lib/api';
import { SettlementRequest, ApprovalRequest } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import AppShell from '@/components/AppShell';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<SettlementRequest[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'my' | 'approved_by_me' | 'all'>('pending');
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile) {
      const isS = profile?.designations?.name?.toLowerCase().includes('store') || 
                 profile?.designations?.name?.toLowerCase() === 'accountant' ||
                 profile?.designations?.name?.toLowerCase() === 'director' ||
                 profile?.designations?.name?.toLowerCase().includes('deputy chief accountant');
      setActiveTab(isS ? 'pending' : 'my');
    }
  }, [profile]);

  useEffect(() => {
    fetchData();
  }, []);

  const generatePDF = async (s: SettlementRequest) => {
    try {
      // Helper to load image as DataURL
      const loadImageAsDataURL = async (url: string): Promise<string | null> => {
        try {
          return await new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(null);
            img.src = url;
          });
        } catch (e) {
          return null;
        }
      };

      const letterheadUrl = s.profiles?.institute_types?.letterhead_url;
      const letterheadDataUrl = letterheadUrl ? await loadImageAsDataURL(letterheadUrl) : null;

      // Create a temporary container for PDF generation
      const container = document.createElement('div');
      container.style.width = '800px';
      container.style.padding = '0'; // Padding handled by safe areas
      container.style.background = 'transparent';
      container.style.position = 'fixed';
      container.style.top = '-10000px';
      container.style.fontFamily = 'Inter, sans-serif';
      
      container.innerHTML = `
        <div style="padding: 40px; background: transparent;">
          <div class="pdf-item" style="display: flex; justify-content: space-between; margin-bottom: 40px; padding-top: 140px;">
            <div>
              <h3 style="margin: 0 0 10px; font-weight: 800; color: #000; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; opacity: 0.5;">SETTLEMENT FOR:</h3>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <p style="margin: 0; font-size: 20px; font-weight: 900; color: #0f172a; line-height: 1.2;">${s.approval_requests?.title}</p>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <p style="margin: 0; font-size: 13px; font-weight: 700; color: #3b82f6;">${s.approval_requests?.approval_templates?.name}</p>
                  <div style="font-size: 10px; font-weight: 950; color: #0f172a; background: #f8fafc; border: 1px solid #e2e8f0; padding: 2px 8px; border-radius: 5px; letter-spacing: 0.5px;">REF: #${s.approval_requests?.ref_no || 'N/A'}</div>
                </div>
              </div>
            </div>
            <div style="text-align: right;">
              <h3 style="margin: 0 0 10px; font-weight: 800; color: #000; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; opacity: 0.5;">REQUESTER:</h3>
              <p style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">${s.profiles?.full_name}</p>
              <p style="margin: 4px 0; font-size: 12px; font-weight: 600; color: #64748b;">Date: ${new Date(s.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          <div class="pdf-item" style="margin-bottom: 40px; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background: #f8fafc; padding: 12px 20px; border-bottom: 1.5px solid #e2e8f0; font-size: 10px; font-weight: 900; letter-spacing: 1px; color: #475569;">COST RECONCILIATION SUMMARY</div>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: rgba(15,23,42,0.02); border-bottom: 1px solid #e2e8f0;">
                  <th style="padding: 12px 20px; text-align: left; font-size: 10px; font-weight: 800; color: #64748b;">DESCRIPTION</th>
                  <th style="padding: 12px 20px; text-align: right; font-size: 10px; font-weight: 800; color: #64748b;">BUDGETED (₹)</th>
                  <th style="padding: 12px 20px; text-align: right; font-size: 10px; font-weight: 800; color: #64748b;">ACTUAL SPENT (₹)</th>
                  <th style="padding: 12px 20px; text-align: right; font-size: 10px; font-weight: 800; color: #64748b;">VARIANCE</th>
                </tr>
              </thead>
              <tbody>
                ${(s.actual_bifurcation || []).map((item: any, i: number) => {
                  const original = s.approval_requests?.bifurcation?.[i]?.total || 0;
                  const variance = Number(item.total) - original;
                  return `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 12px 20px; font-size: 12px; font-weight: 600; color: #1e293b;">${item.description}</td>
                      <td style="padding: 12px 20px; text-align: right; font-size: 12px; color: #64748b;">${original.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style="padding: 12px 20px; text-align: right; font-size: 12px; font-weight: 700; color: #0f172a;">${Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style="padding: 12px 20px; text-align: right; font-size: 12px; font-weight: 700; color: ${variance > 0 ? '#ef4444' : variance < 0 ? '#10b981' : '#64748b'};">
                        ${variance > 0 ? '+' : ''}${variance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr style="background: #f8fafc; border-top: 2px solid #e2e8f0;">
                  <td style="padding: 15px 20px; font-size: 11px; font-weight: 900; color: #475569;">TOTAL DISBURSEMENT</td>
                  <td style="padding: 15px 20px; text-align: right; font-size: 12px; font-weight: 800; color: #64748b;">${s.original_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td style="padding: 15px 20px; text-align: right; font-size: 14px; font-weight: 900; color: #3b82f6;">₹${s.actual_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td style="padding: 15px 20px; text-align: right; font-size: 12px; font-weight: 900; color: #0f172a;">${(s.actual_amount - s.original_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- ORIGINAL APPROVAL STATEMENT -->
          <div style="margin-bottom: 40px;">
            <div class="pdf-item" style="background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 25px; position: relative;">
                <div style="position: absolute; top: -10px; left: 20px; background: #0f172a; color: #fff; padding: 4px 12px; border-radius: 6px; font-size: 9px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">Approval Statement Basis</div>
                <h3 style="margin: 0 0 15px; font-size: 16px; font-weight: 850; color: #0f172a; line-height: 1.3;">${s.approval_requests?.content?.subject || 'Re: Application for Approval'}</h3>
                <div style="color: #334155; font-size: 12px; line-height: 1.6; white-space: pre-wrap; font-weight: 450;">
                  ${(s.approval_requests?.content?.body || 'No detailed content provided.').split('\n').map((p: string) => p.trim() ? `<div class="pdf-item" style="margin-bottom: 12px;">${p}</div>` : '<div style="height: 10px;"></div>').join('')}
                </div>
            </div>
          </div>

          <div style="margin-top: 40px; display: flex; flex-wrap: wrap; justify-content: center; gap: 30px; padding: 0 10px; width: 100%;">
            ${(() => {
              // Map steps to an ordered array to ensure consistent layout
              const stepOrder = ['store', 'accountant', 'director', 'accountant_final', 'deputy_chief_accountant'];
              
              // Get the latest approval for each step (preventing duplicates)
              const uniqueApprovals = stepOrder.map(key => {
                const logs = (s.settlement_approvals || [])
                  .filter(a => a.step_key === key)
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                return logs[0];
              }).filter(Boolean);

              return uniqueApprovals.map((a: any) => `
                <div class="pdf-item" style="text-align: center; display: flex; flex-direction: column; align-items: center; width: 160px; padding: 10px; position: relative;">
                  ${a.step_key === 'deputy_chief_accountant' ? `
                    <div style="position: absolute; top: -15px; right: 10px; color: #10b981;">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                  ` : ''}
                  <div style="height: 60px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; width: 100%;">
                    ${a.profiles?.signature ? `<img src="${a.profiles.signature}" style="max-height: 55px; max-width: 120px; object-fit: contain; filter: grayscale(1) contrast(1.2);" />` : '<div style="border-bottom: 1.5px dashed #cbd5e1; width: 80%; margin-top: 30px;"></div>'}
                  </div>
                  <div style="width: 100%; height: 1.5px; background: rgba(15,23,42,0.1); margin-bottom: 8px;"></div>
                  <p style="margin: 0; font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">${a.profiles?.full_name}</p>
                  <p style="margin: 2px 0; font-size: 10px; font-weight: 700; color: #64748b;">${a.profiles?.designations?.name}</p>
                  <p style="margin: 4px 0; font-size: 9px; font-weight: 950; color: #3b82f6; text-transform: uppercase; letter-spacing: 1px;">${a.step_key.replace(/_/g, ' ')}</p>
                </div>
              `).join('');
            })()}
          </div>
          
          <div class="pdf-item" style="margin-top: 80px; padding-top: 20px; border-top: 1.5px solid #f1f5f9; text-align: center;">
            <p style="margin: 0; font-size: 9px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">This is a system generated settlement voucher</p>
            <p style="margin: 4px 0; font-size: 8px; color: #cbd5e1; font-weight: 500;">Authentication Hash: ${s.id.slice(0, 8).toUpperCase()}-${new Date().getTime().toString().slice(-4)}</p>
          </div>
        </div>
      `;

      document.body.appendChild(container);
      
      const canvas = await html2canvas(container, { 
        scale: 2, 
        useCORS: true,
        backgroundColor: null
      });
      
      const doc = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = doc.internal.pageSize.getHeight();
      
      const pxPerPt = canvas.width / pdfWidth;
      const elements = container.querySelectorAll('.pdf-item');
      const containerTop = container.getBoundingClientRect().top;
      
      const elementRects = Array.from(elements)
        .map(el => {
          const rect = el.getBoundingClientRect();
          return {
            top: (rect.top - containerTop) * 2, // scale 2
            bottom: (rect.bottom - containerTop) * 2
          };
        })
        .sort((a, b) => a.top - b.top);

      const headerSpace = 130;
      const footerSpace = 40;
      const safeArea = pdfHeight - headerSpace - footerSpace;
      
      const safeAreaPx = safeArea * pxPerPt;
      const pdfHeightPx = pdfHeight * pxPerPt;
      const headerSpacePx = headerSpace * pxPerPt;

      let currentYPx = 0;
      let pageNum = 0;

      while (currentYPx < canvas.height - 10) {
        if (pageNum > 0) doc.addPage();

        // Draw Letterhead
        if (letterheadDataUrl) {
          doc.addImage(letterheadDataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        }

        const availableHeightPx = (pageNum === 0) ? (pdfHeightPx - footerSpace * pxPerPt) : safeAreaPx;
        let sliceHeightPx = Math.min(canvas.height - currentYPx, availableHeightPx);

        // Avoid cutting elements
        if (currentYPx + sliceHeightPx < canvas.height) {
          const idealBottom = currentYPx + sliceHeightPx;
          const intersectedElement = elementRects.find(rect => rect.top < idealBottom && rect.bottom > idealBottom);
          
          if (intersectedElement) {
            const newSliceHeightPx = intersectedElement.top - currentYPx - 15;
            if (newSliceHeightPx > 0) sliceHeightPx = newSliceHeightPx;
          }
        }

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;
        const sCtx = sliceCanvas.getContext('2d');
        if (sCtx) {
          sCtx.drawImage(canvas, 0, currentYPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
          const sliceData = sliceCanvas.toDataURL('image/png');
          const targetYPt = (pageNum === 0) ? 0 : headerSpace;
          doc.addImage(sliceData, 'PNG', 0, targetYPt, pdfWidth, sliceHeightPx / pxPerPt, undefined, 'FAST');
        }

        currentYPx += (sliceHeightPx + 1);
        pageNum++;
        if (pageNum > 20) break;
      }

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert('Failed to generate PDF. Please ensure all signatures and letterhead are valid.');
    } finally {
      const container = document.querySelector('div[style*="top: -10000px"]');
      if (container) document.body.removeChild(container);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [received, approveds] = await Promise.all([
        getSettlements(),
        getRequestsByRequester()
      ]);
      setSettlements(received);
      setApprovedRequests(approveds.filter(r => {
        // SECURITY: Ensure we only show requests where the current user is the requester
        if (r.requester_id !== profile?.id) return false;
        
        if (r.status !== 'approved') return false;
        if (!r.has_amount) return false;
        
        // PostgREST might return an array or a single object for 1-to-1 relations
        const settlements = Array.isArray(r.settlement_requests) 
          ? r.settlement_requests 
          : (r.settlement_requests ? [r.settlement_requests] : []);
          
        const hasActiveSettlement = settlements.some((s: any) => s.status !== 'rejected');
        return !hasActiveSettlement;
      }));
    } catch (error) {
      console.error('Failed to fetch settlements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (requestId: string) => {
    if (submitting) return;
    const req = approvedRequests.find(r => r.id === requestId);
    if (!req) return;
    setSubmitting(true);
    try {
      const remainingAmount = req.amount || 0;
      await createSettlement(requestId, req.bifurcation, remainingAmount);
      setIsApplyModalOpen(false);
      await fetchData();
    } catch (error) {
      alert('This request is already being processed or a settlement already exists.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleListAdvanceUpdate = async (id: string, amount: string) => {
    // List update no longer supports direct amount entry for multi-log system
    return;
  };

  const isStore = profile?.designations?.name?.toLowerCase().includes('store');
  const isAccountant = profile?.designations?.name?.toLowerCase() === 'accountant';
  const isDirector = profile?.designations?.name?.toLowerCase() === 'director';
  const isDeputyChiefAccountant = profile?.designations?.name?.toLowerCase().includes('deputy chief accountant');

  const filteredSettlements = settlements.filter(s => {
    if (activeTab === 'all') return true;
    if (activeTab === 'my') return s.requester_id === profile?.id;
    if (activeTab === 'approved_by_me') {
       return (s.settlement_approvals || []).some(a => a.approver_id === profile?.id);
    }
    if (activeTab === 'pending') {
       return (isStore && s.current_step === 'store') || 
              (isAccountant && (s.current_step === 'accountant' || s.current_step === 'accountant_final')) || 
              (isDirector && s.current_step === 'director') || 
              (isDeputyChiefAccountant && s.current_step === 'deputy_chief_accountant');
    }
    return true;
  });

  const actions = (
    <button className="btn btn-primary" onClick={() => setIsApplyModalOpen(true)}>
      <Plus size={18} />
      <span>Apply Settlement</span>
    </button>
  );

  return (
    <AppShell title="Expense Settlements" actions={actions}>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 30 }}>
        <div className="stat-card" style={{ background: '#fff' }}>
          <div className="stat-icon" style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}>
            <Clock size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{settlements.filter(s => s.status === 'pending').length}</div>
            <div className="stat-label">Pending Reviews</div>
          </div>
        </div>
        <div className="stat-card" style={{ background: '#fff' }}>
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{settlements.filter(s => s.status === 'approved').length}</div>
            <div className="stat-label">Settled Total</div>
          </div>
        </div>
        <div className="stat-card" style={{ background: '#fff' }}>
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
            <TrendingDown size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">₹{settlements.reduce((acc, s) => acc + (s.savings_amount || 0), 0).toLocaleString('en-IN')}</div>
            <div className="stat-label">Total Savings</div>
          </div>
        </div>
        <div className="stat-card" style={{ background: '#fff' }}>
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
            <TrendingUp size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">₹{settlements.reduce((acc, s) => acc + (s.extra_amount || 0), 0).toLocaleString('en-IN')}</div>
            <div className="stat-label">Total Extra</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '0 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
           <div style={{ display: 'flex', gap: 30 }}>
              <button 
                onClick={() => setActiveTab('pending')}
                style={{ 
                  padding: '20px 0', 
                  fontSize: '13px', 
                  fontWeight: 800, 
                  color: activeTab === 'pending' ? 'var(--accent)' : 'var(--slate)',
                  borderBottom: `2px solid ${activeTab === 'pending' ? 'var(--accent)' : 'transparent'}`,
                  background: 'none', borderLeft: 'none', borderRight: 'none', borderTop: 'none',
                  cursor: 'pointer'
                }}
              >
                Pending Review ({settlements.filter(s => (isStore && s.current_step === 'store') || (isAccountant && (s.current_step === 'accountant' || s.current_step === 'accountant_final')) || (isDirector && s.current_step === 'director') || (isDeputyChiefAccountant && s.current_step === 'deputy_chief_accountant')).length})
              </button>
              <button 
                onClick={() => setActiveTab('my')}
                style={{ 
                  padding: '20px 0', 
                  fontSize: '13px', 
                  fontWeight: 800, 
                  color: activeTab === 'my' ? 'var(--accent)' : 'var(--slate)',
                  borderBottom: `2px solid ${activeTab === 'my' ? 'var(--accent)' : 'transparent'}`,
                  background: 'none', borderLeft: 'none', borderRight: 'none', borderTop: 'none',
                  cursor: 'pointer'
                }}
              >
                My Settlements
              </button>
              <button 
                onClick={() => setActiveTab('approved_by_me')}
                style={{ 
                  padding: '20px 0', 
                  fontSize: '13px', 
                  fontWeight: 800, 
                  color: activeTab === 'approved_by_me' ? 'var(--accent)' : 'var(--slate)',
                  borderBottom: `2px solid ${activeTab === 'approved_by_me' ? 'var(--accent)' : 'transparent'}`,
                  background: 'none', borderLeft: 'none', borderRight: 'none', borderTop: 'none',
                  cursor: 'pointer'
                }}
              >
                Approved By Me
              </button>
              <button 
                onClick={() => setActiveTab('all')}
                style={{ 
                  padding: '20px 0', 
                  fontSize: '13px', 
                  fontWeight: 800, 
                  color: activeTab === 'all' ? 'var(--accent)' : 'var(--slate)',
                  borderBottom: `2px solid ${activeTab === 'all' ? 'var(--accent)' : 'transparent'}`,
                  background: 'none', borderLeft: 'none', borderRight: 'none', borderTop: 'none',
                  cursor: 'pointer'
                }}
              >
                All Records
              </button>
           </div>
          <div className="search-box" style={{ width: 240 }}>
            <Search size={16} />
            <input type="text" placeholder="Search..." />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {loading ? (
             <div style={{ padding: 80, textAlign: 'center' }}>
                <div className="loading-spinner" style={{ margin: '0 auto' }} />
                <p style={{ marginTop: 15, fontSize: 13, color: 'var(--slate)' }}>Loading records...</p>
             </div>
          ) : settlements.length === 0 ? (
            <div style={{ padding: 100, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Receipt size={32} style={{ opacity: 0.2 }} />
              </div>
              <p style={{ fontWeight: 600, color: 'var(--midnight)' }}>No settlement requests found</p>
              <p style={{ fontSize: 13 }}>Validated requests will appear here for cost reconciliation.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead style={{ background: '#fff' }}>
                <tr>
                  <th>Request Title</th>
                  <th>Requester</th>
                  <th>Vendor Info</th>
                  <th>Original</th>
                  <th>Actual</th>
                  <th>Amount paid (₹)</th>
                  <th>Variance</th>
                  <th>Current Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSettlements.map((s) => {
                  const variance = s.actual_amount - s.original_amount;
                  const isSelected = selectedSettlement?.id === s.id;
                  
                  return (
                    <Fragment key={s.id}>
                      <tr className={isSelected ? 'selected-row' : ''} style={{ background: isSelected ? 'var(--bg-secondary)' : 'transparent' }}>
                        <td style={{ minWidth: 240, borderBottom: isSelected ? 'none' : '1px solid var(--border)' }}>
                          <div style={{ fontWeight: 700, color: 'var(--midnight)' }}>{s.approval_requests?.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--slate)', fontWeight: 500 }}>{s.approval_requests?.approval_templates?.name}</div>
                        </td>
                        <td style={{ borderBottom: isSelected ? 'none' : '1px solid var(--border)' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                             <div className="avatar-xs" style={{ background: 'var(--navy-light)' }}>{s.profiles?.full_name?.[0]}</div>
                             <div>
                               <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--midnight)' }}>{s.profiles?.full_name}</div>
                             </div>
                           </div>
                        </td>
                        <td style={{ borderBottom: isSelected ? 'none' : '1px solid var(--border)' }}>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {(s.actual_bifurcation || []).slice(0, 2).map((item: any, idx: number) => (
                                <div key={idx} style={{ 
                                  padding: '8px 12px', 
                                  background: 'rgba(56,189,248,0.03)', 
                                  borderRadius: 10, 
                                  border: '1px solid rgba(56,189,248,0.1)',
                                  minWidth: 160
                                }}>
                                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--midnight)' }}>{item.vendor_name || item.description || 'Vendor Info'}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                                     <span style={{ fontSize: 10, color: 'var(--slate)', fontWeight: 600 }}>{item.vendor_phone || '9958399157'}</span>
                                     <button 
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         const url = item.attachment || s.approval_requests?.attachments?.[0];
                                         if (url?.toLowerCase().endsWith('.pdf')) window.open(url, '_blank');
                                         else if (url) setViewerUrl(url);
                                       }}
                                       style={{ 
                                         fontSize: 9, 
                                         fontWeight: 800, 
                                         color: 'var(--accent)', 
                                         background: '#fff', 
                                         padding: '2px 8px', 
                                         border: '1px solid var(--border)',
                                         borderRadius: 6,
                                         cursor: 'pointer',
                                         boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                       }}
                                     >
                                       Details Attached
                                     </button>
                                  </div>
                                </div>
                              ))}
                              {(s.actual_bifurcation?.length || 0) > 2 && (
                                <div style={{ fontSize: 10, color: 'var(--slate)', fontWeight: 600, textAlign: 'center' }}>+{s.actual_bifurcation!.length - 2} more</div>
                              )}
                              {(!s.actual_bifurcation || s.actual_bifurcation.length === 0) && (
                                <div style={{ 
                                  padding: '8px 12px', 
                                  background: '#f8fafc', 
                                  borderRadius: 10, 
                                  border: '1px dashed var(--border)',
                                  fontSize: 10,
                                  color: 'var(--slate)',
                                  textAlign: 'center'
                                }}>
                                  No vendor info
                                </div>
                              )}
                           </div>
                        </td>
                        <td style={{ fontWeight: 600, borderBottom: isSelected ? 'none' : '1px solid var(--border)' }}>₹{s.original_amount.toLocaleString('en-IN')}</td>
                        <td style={{ fontWeight: 700, borderBottom: isSelected ? 'none' : '1px solid var(--border)' }}>₹{s.actual_amount.toLocaleString('en-IN')}</td>
                        <td style={{ borderBottom: isSelected ? 'none' : '1px solid var(--border)' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Wallet size={12} style={{ color: 'var(--accent)', opacity: 0.8 }} />
                              <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--midnight)' }}>₹{Number(s.advance_amount || 0).toLocaleString('en-IN')}</span>
                           </div>
                        </td>
                        <td style={{ borderBottom: isSelected ? 'none' : '1px solid var(--border)' }}>
                          {variance === 0 ? (
                             <span className="badge badge-slate" style={{ fontSize: 10 }}>Balanced</span>
                          ) : variance > 0 ? (
                             <span className="badge badge-rose" style={{ fontSize: 10, gap: 4 }}>
                               <TrendingUp size={12} /> +₹{Math.abs(variance).toLocaleString('en-IN')}
                             </span>
                          ) : (
                             <span className="badge badge-emerald" style={{ fontSize: 10, gap: 4 }}>
                               <TrendingDown size={12} /> -₹{Math.abs(variance).toLocaleString('en-IN')}
                             </span>
                          )}
                        </td>
                        <td style={{ borderBottom: isSelected ? 'none' : '1px solid var(--border)' }}>
                           <div className={`status-badge ${s.status === 'approved' ? 'approved' : 'pending'}`} style={{ marginBottom: 4 }}>
                              {s.status.toUpperCase()}
                           </div>
                           <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              {s.current_step === 'store' && <Package size={12} />}
                              {(s.current_step === 'accountant' || s.current_step === 'accountant_final') && <Calculator size={12} />}
                              {s.current_step === 'director' && <Landmark size={12} />}
                              {s.current_step === 'deputy_chief_accountant' && <ShieldCheck size={12} />}
                              {s.current_step === 'completed' && <CheckCircle2 size={12} style={{ color: 'var(--emerald)' }} />}
                              {s.current_step === 'completed' ? (
                                <span style={{ color: 'var(--emerald)' }}>FINALIZED</span>
                              ) : (
                                s.current_step === 'accountant_final' ? 'ACC-FINAL' : s.current_step.replace(/_/g, ' ').toUpperCase()
                              )}
                           </div>
                        </td>
                        <td style={{ textAlign: 'right', borderBottom: isSelected ? 'none' : '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            {(s.status === 'approved' || s.current_step === 'deputy_chief_accountant') && (
                              <button 
                                className="btn btn-ghost btn-sm"
                                onClick={(e) => { e.stopPropagation(); generatePDF(s); }}
                                style={{ color: 'var(--accent)', background: 'rgba(56,189,248,0.08)', borderRadius: 8, height: 32, width: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Download size={16} />
                              </button>
                            )}
                            <button className="btn btn-sm"
                              style={{ 
                                background: isSelected ? 'var(--midnight)' : ((isStore && s.current_step === 'store') || 
                                (isAccountant && (s.current_step === 'accountant' || s.current_step === 'accountant_final')) || 
                                (isDirector && s.current_step === 'director') || 
                                (isDeputyChiefAccountant && s.current_step === 'deputy_chief_accountant')) ? 'var(--accent)' : 'var(--bg-secondary)',
                                color: isSelected ? '#fff' : ((isStore && s.current_step === 'store') || 
                                (isAccountant && (s.current_step === 'accountant' || s.current_step === 'accountant_final')) || 
                                (isDirector && s.current_step === 'director') || 
                                (isDeputyChiefAccountant && s.current_step === 'deputy_chief_accountant')) ? '#fff' : 'var(--slate)',
                                padding: '6px 12px',
                                borderRadius: 8
                              }} 
                              onClick={() => setSelectedSettlement(isSelected ? null : s)}
                            >
                              {isSelected ? (
                                <span style={{ fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>Close <X size={12} /></span>
                              ) : ( (isStore && s.current_step === 'store') || 
                                (isAccountant && (s.current_step === 'accountant' || s.current_step === 'accountant_final')) || 
                                (isDirector && s.current_step === 'director') || 
                                (isDeputyChiefAccountant && s.current_step === 'deputy_chief_accountant') ? (
                                  <span style={{ fontSize: 11, fontWeight: 700 }}>Process</span>
                                ) : (
                                  <span style={{ fontSize: 11, fontWeight: 700 }}>Details</span>
                                )
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {isSelected && (
                        <tr>
                          <td colSpan={8} style={{ padding: '0 24px 32px', background: 'var(--bg-secondary)' }}>
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              style={{ 
                                background: '#fff', 
                                padding: 32, 
                                borderRadius: '0 0 20px 20px', 
                                border: '2px solid var(--accent)',
                                borderTop: 'none',
                                boxShadow: 'rgba(100, 100, 111, 0.2) 0px 7px 29px 0px'
                              }}
                            >
                              <SettlementProcessInLine 
                                settlement={s} 
                                onClose={() => setSelectedSettlement(null)} 
                                onDone={() => { setSelectedSettlement(null); fetchData(); }}
                                role={{ isStore, isAccountant, isDirector, isDeputyChiefAccountant }}
                              />
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Apply Modal */}
      <AnimatePresence>
        {isApplyModalOpen && (
          <div className="overlay" onClick={() => setIsApplyModalOpen(false)}>
            <motion.div 
              className="modal" 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: 500 }}
            >
              <div className="modal-header">
                <h2 className="modal-title" style={{ color: '#fff' }}>Select Request</h2>
                <button className="btn btn-ghost" style={{ padding: 8, minWidth: 0, color: '#fff' }} onClick={() => setIsApplyModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body" style={{ padding: 24 }}>
                <p style={{ color: 'var(--slate)', fontSize: 13, marginBottom: 20 }}>Only approved budget requests can be settled.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {approvedRequests.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 12 }}>
                      <AlertCircle size={28} style={{ marginBottom: 12, opacity: 0.3, color: 'var(--slate)' }} />
                      <p style={{ fontSize: 14, color: 'var(--slate)' }}>No approved requests found.</p>
                    </div>
                  ) : (
                    approvedRequests.map(r => {
                      return (
                        <div 
                          key={r.id} 
                          className={`selectable-card ${submitting ? 'disabled' : ''}`}
                          style={{ opacity: submitting ? 0.6 : 1, pointerEvents: submitting ? 'none' : 'auto' }}
                          onClick={() => handleApply(r.id)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--midnight)' }}>{r.title}</div>
                              <div style={{ fontSize: '11px', color: 'var(--slate)', marginTop: 2 }}>
                                {r.approval_templates?.name} • 
                                <span style={{ color: 'var(--accent)', fontWeight: 700 }}> Approved Amount: ₹{(r.amount || 0).toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                            <ChevronRight size={16} style={{ color: 'var(--slate)', opacity: 0.5 }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Process Modal */}
      <AnimatePresence>
      </AnimatePresence>

      <AnimatePresence>
        {viewerUrl && <MediaViewer url={viewerUrl} onClose={() => setViewerUrl(null)} />}
      </AnimatePresence>
    </AppShell>
  );
}

function SettlementProcessInLine({ settlement, onClose, onDone, role }: any) {
  const [remarks, setRemarks] = useState('');
  const [bifurcation, setBifurcation] = useState<any[]>(settlement.actual_bifurcation || []);
  const [loading, setLoading] = useState(false);
  const [expandedVendorIdx, setExpandedVendorIdx] = useState<number | null>(null);
  const [advAmount, setAdvAmount] = useState('');
  const [advDesc, setAdvDesc] = useState('');
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  const attachments = settlement.approval_requests?.attachments || [];

  const totalActual = bifurcation.reduce((acc, item) => acc + (Number(item.total) || 0), 0);
  const diff = totalActual - settlement.actual_amount;

  const canEdit = (role.isStore && settlement.current_step === 'store') || 
                  (role.isAccountant && (settlement.current_step === 'accountant' || settlement.current_step === 'accountant_final'));
  const canApprove = (role.isStore && settlement.current_step === 'store') || 
                     (role.isAccountant && (settlement.current_step === 'accountant' || settlement.current_step === 'accountant_final')) || 
                     (role.isDirector && settlement.current_step === 'director') || 
                     (role.isDeputyChiefAccountant && settlement.current_step === 'deputy_chief_accountant');
  
  const canRevert = role.isAccountant && (settlement.current_step === 'accountant' || settlement.current_step === 'accountant_final');

  const handleAddAdvance = async () => {
    if (!advAmount || !advDesc) return;
    setLoading(true);
    try {
      await addSettlementAdvance(settlement.id, Number(advAmount), advDesc);
      setAdvAmount('');
      setAdvDesc('');
      onDone();
    } catch (error) {
      alert('Failed to add advance');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      await approveSettlement(settlement.id, {
        actual_amount: totalActual,
        actual_bifurcation: bifurcation,
        remarks
      });
      onDone();
    } catch (error) {
      alert('Action failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = async () => {
    if (!remarks) return alert('Please provide remarks for revert');
    setLoading(true);
    try {
      await revertSettlement(settlement.id, remarks);
      onDone();
    } catch (error) {
      alert('Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 15 }}>
           <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Process Settlement Ledger</h2>
           <div className={`badge badge-gold`} style={{ fontSize: 11 }}>
              CURRENT STAGE: {settlement.current_step.toUpperCase()}
           </div>
        </div>

        <div className="process-body">
           <div className="section-header" style={{ marginTop: 0 }}>
              <div className="section-title">
                 <div className="section-icon" style={{ background: 'var(--midnight)', color: '#fff' }}><FileText size={16} /></div>
                 Original Approval Info
              </div>
           </div>
           
            <div className="card" style={{ padding: 20, background: '#f8fafc', border: '1px solid var(--border)', marginBottom: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                 <div>
                   <p className="field-label">Request Title</p>
                   <p style={{ fontWeight: 700, margin: 0 }}>{settlement.approval_requests?.title}</p>
                 </div>
                 <div>
                   <p className="field-label">Total Request Approved</p>
                   <p style={{ fontWeight: 700, color: 'var(--slate)', margin: 0 }}>₹{settlement.original_amount.toLocaleString('en-IN')}</p>
                 </div>
                 <div>
                   <p className="field-label">Current Settlement Target</p>
                   <p style={{ fontWeight: 800, fontSize: '18px', color: 'var(--accent)', margin: 0 }}>₹{settlement.actual_amount.toLocaleString('en-IN')}</p>
                 </div>
              </div>
              
              {attachments.length > 0 && (
                 <div style={{ marginTop: 20, paddingTop: 15, borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                   {attachments.map((url: string, i: number) => (
                      <button key={i} onClick={() => url.endsWith('.pdf') ? window.open(url, '_blank') : setViewerUrl(url)} className="btn btn-sm btn-ghost" style={{ background: '#fff', border: '1px solid var(--border)' }}>
                        <FileText size={14} /> Details Attached
                      </button>
                   ))}
                 </div>
               )}
            </div>
            <AnimatePresence>
              {viewerUrl && <MediaViewer url={viewerUrl} onClose={() => setViewerUrl(null)} />}
            </AnimatePresence>

           <div className="card" style={{ padding: 0, background: '#fff', border: '1px solid var(--border)', marginBottom: 24, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                     <Wallet size={16} style={{ color: 'var(--accent)' }} />
                     <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--midnight)' }}>ADVANCE PAYMENT LEDGER</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--midnight)' }}>
                     Total Amount: <span style={{ color: 'var(--accent)' }}>₹{Number(settlement.advance_amount || 0).toLocaleString('en-IN')}</span>
                  </div>
              </div>
              
              <div style={{ padding: 20 }}>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
                    {/* Advance History */}
                    <div style={{ minHeight: 100 }}>
                       <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                             <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ paddingBottom: 8, fontSize: 11, color: 'var(--slate)' }}>Date</th>
                                <th style={{ paddingBottom: 8, fontSize: 11, color: 'var(--slate)' }}>Description</th>
                                <th style={{ paddingBottom: 8, fontSize: 11, color: 'var(--slate)', textAlign: 'right' }}>Amount (₹)</th>
                             </tr>
                          </thead>
                          <tbody>
                             {(settlement.advance_logs && settlement.advance_logs.length > 0) ? settlement.advance_logs.map((log: any, i: number) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                   <td style={{ padding: '10px 0', fontSize: 12, color: 'var(--slate)' }}>{new Date(log.date).toLocaleDateString('en-IN')}</td>
                                   <td style={{ padding: '10px 0', fontSize: 12, fontWeight: 600 }}>{log.description}</td>
                                   <td style={{ padding: '10px 0', fontSize: 12, fontWeight: 800, textAlign: 'right' }}>₹{Number(log.amount).toLocaleString('en-IN')}</td>
                                </tr>
                             )) : (
                                <tr>
                                   <td colSpan={3} style={{ padding: '30px 0', textAlign: 'center', fontSize: 13, color: 'var(--slate)' }}>No advance payments recorded yet.</td>
                                </tr>
                             )}
                          </tbody>
                       </table>
                    </div>

                    {/* Add New Advance */}
                    {role.isAccountant && (
                       <div style={{ padding: 20, background: '#f1f5f9', borderRadius: 12 }}>
                          <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800 }}>Add New Amount</h4>
                          <div style={{ marginBottom: 12 }}>
                             <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate)', marginBottom: 4 }}>Amount (₹)</label>
                             <input 
                               type="text"
                               inputMode="decimal"
                               className="field-input"
                               placeholder="0.00"
                               style={{ height: 38, width: '100%', padding: '0 10px', fontWeight: 800, color: 'var(--accent)' }}
                               value={advAmount}
                               onChange={e => setAdvAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                             />
                          </div>
                          <div style={{ marginBottom: 16 }}>
                             <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate)', marginBottom: 4 }}>Description / Purpose</label>
                             <textarea 
                               className="field-input"
                               placeholder="e.g. Fuel advance, Initial funds..."
                               style={{ width: '100%', padding: '10px', fontSize: 12, height: 60, resize: 'none' }}
                               value={advDesc}
                               onChange={e => setAdvDesc(e.target.value)}
                             />
                          </div>
                          <button 
                             className="btn btn-primary w-full" 
                             style={{ height: 40 }}
                             onClick={handleAddAdvance}
                             disabled={loading || !advAmount || !advDesc}
                          >
                             <Plus size={16} />
                             <span>Add Payment</span>
                          </button>
                       </div>
                    )}
                 </div>

                 <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--slate)' }}>Net Payable Balance</p>
                        <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: 'var(--midnight)' }}>
                           ₹{(totalActual - Number(settlement.advance_amount || 0)).toLocaleString('en-IN')}
                        </p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="section-header">
              <div className="section-title">
                 <div className="section-icon" style={{ background: 'var(--accent)', color: '#fff' }}><Calculator size={16} /></div>
                 Reconciled Expenses
              </div>
              <div style={{ textAlign: 'right' }}>
                 <p className="field-label" style={{ marginBottom: 2 }}>Current Settlement Total</p>
                 <p style={{ fontWeight: 900, fontSize: '20px', color: diff > 0 ? 'var(--rose)' : 'var(--emerald)', margin: 0 }}>₹{totalActual.toLocaleString('en-IN')}</p>
              </div>
           </div>

           <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style={{ width: 100 }}>Approved (₹)</th>
                    <th style={{ width: 140 }}>Actual Basic (₹)</th>
                    <th style={{ width: 90 }}>GST %</th>
                    <th style={{ width: 140 }}>Total Reconciled (₹)</th>
                    <th style={{ minWidth: 160 }}>Vendor Info</th>
                    <th style={{ width: 110, textAlign: 'right' }}>Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {bifurcation.map((item: any, idx: number) => {
                    const originalItem = settlement.approval_requests?.bifurcation?.[idx];
                    const targetTotal = originalItem?.total || originalItem?.amount || 0;
                    const rowVariance = Number(item.total) - targetTotal;
                    const isExpanded = expandedVendorIdx === idx;
                    
                    return (
                      <Fragment key={idx}>
                        <tr style={{ background: isExpanded ? 'var(--bg-secondary)' : 'transparent', borderBottom: isExpanded ? 'none' : '1px solid var(--border)' }}>
                          <td style={{ minWidth: 160 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--midnight)' }}>{item.description}</div>
                            <div style={{ fontSize: '10px', color: 'var(--slate)', fontWeight: 500, marginTop: 2 }}>Original: ₹{targetTotal.toLocaleString('en-IN')}</div>
                          </td>
                          <td style={{ color: 'var(--slate)', fontWeight: 600, fontSize: '12px' }}>₹{targetTotal.toLocaleString('en-IN')}</td>
                          <td>
                            {canEdit ? (
                              <input 
                                type="text"
                                inputMode="decimal"
                                className="field-input" 
                                style={{ 
                                  height: 38, 
                                  width: '100%', 
                                  padding: '0 8px', 
                                  fontSize: '13px', 
                                  fontWeight: 700, 
                                  borderRadius: 8,
                                }}
                                value={item.amount}
                                onChange={(e) => {
                                   const valStr = e.target.value.replace(/[^0-9.]/g, '');
                                   const val = Number(valStr);
                                   const newBif = [...bifurcation];
                                   newBif[idx].amount = valStr;
                                   const gstRate = Number(newBif[idx].gstRate) || 0;
                                   newBif[idx].total = (val * (1 + gstRate/100)).toFixed(2);
                                   setBifurcation(newBif);
                                }}
                              />
                            ) : (
                              <span style={{ fontWeight: 700 }}>₹{Number(item.amount).toLocaleString('en-IN')}</span>
                            )}
                          </td>
                          <td>
                            {canEdit ? (
                              <input 
                                type="text"
                                inputMode="decimal"
                                className="field-input" 
                                style={{ 
                                  height: 38, 
                                  width: '100%', 
                                  padding: '0 6px', 
                                  fontSize: '13px', 
                                  fontWeight: 700, 
                                  borderRadius: 8, 
                                  textAlign: 'center'
                                }}
                                value={item.gstRate}
                                onChange={(e) => {
                                   const valStr = e.target.value.replace(/[^0-9.]/g, '');
                                   const val = Number(valStr);
                                   const newBif = [...bifurcation];
                                   newBif[idx].gstRate = valStr;
                                   const basic = Number(newBif[idx].amount) || 0;
                                   newBif[idx].total = (basic * (1 + val/100)).toFixed(2);
                                   setBifurcation(newBif);
                                }}
                              />
                            ) : (
                              <span style={{ fontWeight: 600 }}>{item.gstRate}%</span>
                            )}
                          </td>
                          <td>
                            {canEdit ? (
                              <input 
                                type="text"
                                inputMode="decimal"
                                className="field-input" 
                                style={{ 
                                  height: 38, 
                                  width: '100%', 
                                  padding: '0 8px', 
                                  fontSize: '13px', 
                                  fontWeight: 900, 
                                  borderRadius: 8,
                                  background: '#f0fdf4',
                                  color: 'var(--midnight)'
                                }}
                                value={item.total}
                                onChange={(e) => {
                                   const valStr = e.target.value.replace(/[^0-9.]/g, '');
                                   const totalVal = Number(valStr);
                                   const newBif = [...bifurcation];
                                   newBif[idx].total = valStr;
                                   const gstRate = Number(newBif[idx].gstRate) || 0;
                                   // Basic = Total / (1 + Rate/100)
                                   newBif[idx].amount = (totalVal / (1 + gstRate/100)).toFixed(2);
                                   setBifurcation(newBif);
                                }}
                              />
                            ) : (
                              <span style={{ fontWeight: 900, fontSize: '15px' }}>₹{Number(item.total).toLocaleString('en-IN')}</span>
                            )}
                          </td>
                          <td>
                             <div 
                               style={{ 
                                 display: 'flex', 
                                 flexDirection: 'column',
                                 gap: 4, 
                                 cursor: canEdit ? 'pointer' : 'default',
                                 background: isExpanded ? '#fff' : '#f1f5f9',
                                 padding: '6px 10px',
                                 borderRadius: 10,
                                 border: isExpanded ? '2px solid var(--accent)' : '1px solid var(--border)',
                                 minHeight: 46,
                                 transition: 'all 0.2s'
                               }} 
                               onClick={() => canEdit && setExpandedVendorIdx(isExpanded ? null : idx)}
                             >
                               {item.vendor_name || item.vendor_contact || item.vendor_address ? (
                                 <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                   {item.vendor_name && <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--midnight)' }}>{item.vendor_name}</div>}
                                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                     {item.vendor_contact && <span style={{ fontSize: 9, borderRadius: 4, padding: '1px 5px', background: '#fff', color: 'var(--slate)', fontWeight: 600, border: '1px solid var(--border)' }}>{item.vendor_contact}</span>}
                                     {item.vendor_address && <span style={{ fontSize: 9, borderRadius: 4, padding: '1px 5px', background: '#fff', color: 'var(--slate)', fontWeight: 600, border: '1px solid var(--border)' }}>Details Attached</span>}
                                   </div>
                                 </div>
                               ) : (
                                 <span style={{ fontSize: 10, color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                                   {isExpanded ? <X size={14} /> : <Plus size={14} />} 
                                   {isExpanded ? 'CLOSE' : 'ADD VENDOR'}
                                 </span>
                                )}
                             </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {rowVariance === 0 ? (
                              <span className="badge badge-slate" style={{ fontSize: '10px' }}>BALANCED</span>
                            ) : rowVariance < 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ fontSize: '11px', color: 'var(--emerald)', fontWeight: 900 }}>SAVED</span>
                                <span style={{ fontSize: '10px', color: 'var(--emerald)', fontWeight: 600 }}>₹{Math.abs(rowVariance).toLocaleString('en-IN')}</span>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ fontSize: '11px', color: 'var(--rose)', fontWeight: 900 }}>EXTRA</span>
                                <span style={{ fontSize: '10px', color: 'var(--rose)', fontWeight: 600 }}>+₹{rowVariance.toLocaleString('en-IN')}</span>
                              </div>
                            )}
                          </td>
                        </tr>

                        {/* Collapsible Detail Row */}
                        <AnimatePresence>
                          {isExpanded && canEdit && (
                            <tr>
                              <td colSpan={7} style={{ padding: '0 24px 20px' }}>
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  style={{ overflow: 'hidden' }}
                                >
                                  <div style={{ 
                                    background: '#fff', 
                                    padding: 20, 
                                    borderRadius: '0 0 16px 16px', 
                                    border: '2px solid var(--accent)',
                                    borderTop: 'none',
                                    display: 'flex',
                                    gap: 20
                                  }}>
                                    <div style={{ flex: 1 }}>
                                      <label className="field-label" style={{ fontSize: 11 }}>Vendor Name</label>
                                      <input 
                                        type="text" 
                                        className="field-input" 
                                        placeholder="Enter vendor name..."
                                        style={{ height: 40, fontSize: 14 }}
                                        value={item.vendor_name || ''}
                                        onChange={(e) => {
                                          const newBif = [...bifurcation];
                                          newBif[idx].vendor_name = e.target.value;
                                          setBifurcation(newBif);
                                        }}
                                      />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <label className="field-label" style={{ fontSize: 11 }}>Contact Info</label>
                                      <input 
                                        type="text" 
                                        className="field-input" 
                                        placeholder="Phone or email..."
                                        style={{ height: 40, fontSize: 14 }}
                                        value={item.vendor_contact || ''}
                                        onChange={(e) => {
                                          const newBif = [...bifurcation];
                                          newBif[idx].vendor_contact = e.target.value;
                                          setBifurcation(newBif);
                                        }}
                                      />
                                    </div>
                                    <div style={{ flex: 2 }}>
                                      <label className="field-label" style={{ fontSize: 11 }}>Address / Bill Reference</label>
                                      <input 
                                        type="text" 
                                        className="field-input" 
                                        placeholder="Full address or bill number details..."
                                        style={{ height: 40, fontSize: 14 }}
                                        value={item.vendor_address || ''}
                                        onChange={(e) => {
                                          const newBif = [...bifurcation];
                                          newBif[idx].vendor_address = e.target.value;
                                          setBifurcation(newBif);
                                        }}
                                      />
                                    </div>
                                    <div style={{ alignSelf: 'flex-end' }}>
                                      <button 
                                        className="btn btn-accent" 
                                        style={{ height: 40, borderRadius: 10 }}
                                        onClick={() => setExpandedVendorIdx(null)}
                                      >
                                        SAVE & CLOSE
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
           </div>

           <div className="section-header">
              <div className="section-title">
                 <div className="section-icon" style={{ background: 'var(--slate)', color: '#fff' }}><HistoryIcon size={16} /></div>
                 Process Ledger
              </div>
           </div>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {settlement.settlement_approvals?.length === 0 ? (
                <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--slate)', padding: 20 }}>No activity logged yet.</p>
              ) : (
                settlement.settlement_approvals?.map((a: any) => (
                  <div key={a.id} className="card" style={{ padding: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                     <div style={{ display: 'flex', gap: 12 }}>
                        <div className="sidebar-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{a.profiles?.full_name?.[0]}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--midnight)' }}>{a.profiles?.full_name} <span style={{ fontWeight: 400, color: 'var(--slate)', fontSize: 11 }}>({a.profiles?.designations?.name})</span></div>
                            <span style={{ fontSize: 10, fontWeight: 800, color: a.status === 'approved' ? 'var(--emerald)' : 'var(--rose)' }}>{a.status.toUpperCase()}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--slate)', marginTop: 2 }}>{new Date(a.acted_at).toLocaleString()}</div>
                          {a.comments && <div style={{ fontSize: '13px', marginTop: 8, color: 'var(--midnight)', background: '#fff', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>{a.comments}</div>}
                        </div>
                     </div>
                  </div>
                ))
              )}
           </div>

           <div className="field-group">
             <label className="field-label">Verification Remarks / Comments</label>
             <textarea 
               className="field-input" 
               placeholder="Add your justification or internal remarks..."
               value={remarks}
               onChange={e => setRemarks(e.target.value)}
             ></textarea>
           </div>
        </div>

        <div className="modal-footer">
           {canRevert && (
             <button 
                className="btn btn-outline" 
                style={{ color: 'var(--rose)', borderColor: 'var(--rose)' }}
                onClick={handleRevert}
                disabled={loading}
             >
                <ArrowBigLeft size={18} />
                <span>Revert to Store</span>
             </button>
           )}
           <div style={{ flex: 1 }} />
           <button className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
           {canApprove && (
             <button className="btn btn-accent" onClick={handleApprove} disabled={loading}>
                {loading ? 'Processing...' : (settlement.current_step === 'deputy_chief_accountant' ? 'Complete Settlement' : 'Verify & Forward')}
                <ArrowRight size={18} />
             </button>
           )}
        </div>
    </div>
  );
}

function MediaViewer({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="overlay" style={{ background: 'rgba(0,0,0,0.95)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }} onClick={onClose}>
      <button 
        className="btn btn-ghost" 
        style={{ position: 'absolute', top: 30, right: 30, color: '#fff', background: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: '50%' }}
        onClick={onClose}
      >
        <X size={24} />
      </button>
      <motion.img 
        src={url} 
        alt="Attachment Preview" 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        style={{ 
          maxWidth: '90vw', 
          maxHeight: '90vh', 
          objectFit: 'contain',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.1)'
        }} 
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}
