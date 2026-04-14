'use client';
import { useState } from 'react';
import { Eye, Loader2, Printer } from 'lucide-react';
import { ApprovalRequest } from '@/lib/types';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface DownloadPDFButtonProps {
  request: ApprovalRequest;
}

export default function DownloadPDFButton({ request }: DownloadPDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const verificationId = `VERIF-${request.id.slice(-8).toUpperCase()}`;
      const verificationUrl = `${window.location.origin}/verify/${request.id}`;
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 140,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });

      // Helper to load image as DataURL for reliable PDF rendering
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

      const letterheadUrl = request.profiles?.institute_types?.letterhead_url;
      const letterheadDataUrl = letterheadUrl ? await loadImageAsDataURL(letterheadUrl) : null;

      // Create a temporary container for the PDF content
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '850px';
      container.style.backgroundColor = 'transparent';
      container.style.color = '#1e293b';
      container.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";

      const allSteps = request.approval_templates?.template_steps?.sort((a, b) => a.step_order - b.step_order) || [];
      const requesterRank = (request.profiles?.designations as any)?.rank || 0;
      const requesterDesignationId = (request.profiles as any)?.designation_id;
      const requestAmount = request.amount || 0;

      const skipUntilOrder = allSteps.reduce((max, s) => {
        const stepRank = (s.designations as any)?.rank ?? (s.profiles?.designations as any)?.rank ?? 0;
        const isUnderOrSame = (stepRank > 0 && stepRank <= requesterRank) || (s.designation_id === requesterDesignationId);
        return isUnderOrSame ? Math.max(max, s.step_order) : max;
      }, -1);

      const steps = allSteps.filter(s => s.step_order > skipUntilOrder && (!s.min_amount || requestAmount >= s.min_amount));

      const approvals = request.request_approvals?.sort((a, b) =>
        new Date(a.acted_at || 0).getTime() - new Date(b.acted_at || 0).getTime()
      ) || [];

      // Status Badge Component
      const getStatusBadge = (status: string) => {
        const s = status?.toLowerCase() || 'pending';
        const colors: any = {
          approved: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
          reverted: { bg: '#fff7ed', text: '#9a3412', border: '#ffedd5' },
          rejected: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
          pending: { bg: '#eff6ff', text: '#1d4ed8', border: '#dbeafe' },
          active: { bg: '#eff6ff', text: '#1d4ed8', border: '#dbeafe' },
        };
        const c = colors[s] || colors.pending;
        return `<span style="display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 9px; font-weight: 950; background: ${c.bg}; color: ${c.text}; border: 1px solid ${c.border}; vertical-align: middle; text-transform: uppercase; letter-spacing: 0.5px;">${s}</span>`;
      };

      // Reference ID Generator (Javascript version of the Postgres function)
      const getReferenceId = () => {
        if (request.reference_id) return request.reference_id;
        
        try {
          const inst = request.profiles?.institutes?.name || 'AIKTC';
          const school = request.profiles?.institute_types?.short_form || 'NA';
          const dept = request.profiles?.departments?.short_form || 'NA';
          const seq = request.request_sequence_id || request.id.slice(-4).toUpperCase();
          
          const date = new Date(request.created_at);
          const year = date.getFullYear();
          const month = date.getMonth() + 1; // JS months are 0-indexed
          
          let acadYear = '';
          if (month >= 6) {
            acadYear = `${year}-${(year + 1).toString().slice(-2)}`;
          } else {
            acadYear = `${year - 1}-${year.toString().slice(-2)}`;
          }
          
          return `${inst}/${school}/${dept}/${acadYear}/${seq}`;
        } catch (e) {
          return verificationId;
        }
      };

      const referenceId = getReferenceId();

      container.innerHTML = `
        <div style="width: 595.28pt; background: transparent; position: relative; margin: 0; padding: 0; overflow: visible; box-sizing: border-box;">
          <!-- CONTENT OVERLAY LAYER (No letterhead here to avoid double-rendering) -->
          <div style="position: relative; z-index: 10; padding: 210px 50px 70px; display: flex; flex-direction: column; width: 100%; box-sizing: border-box; overflow: visible; background: transparent;">
            <!-- MODERN HEADER -->
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; border-bottom: 1.5px solid #0f172a; padding-bottom: 15px;">
              <div style="max-width: 65%;">
                <div style="margin-bottom: 15px;">
                  <p style="margin: 0; color: #2563eb; font-size: 10px; font-weight: 950; letter-spacing: 1.5px; text-transform: uppercase;">Reference No: ${referenceId}</p>
                </div>
                <h1 style="margin: 0; color: #0f172a; font-size: 28px; font-weight: 950; line-height: 1.1; letter-spacing: -1px;">Approval Certificate<br/><span style="color: #000; font-size: 22px; letter-spacing: 0px;">Submitted for Management Approval</span></h1>
                <div style="margin-top: 20px; display: flex; gap: 35px;">
                  <div>
                    <p style="margin: 0; color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Generate Date</p>
                    <p style="margin: 3px 0 0; color: #0f172a; font-size: 12px; font-weight: 800;">${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div>
                    <p style="margin: 0; color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Approve Date</p>
                    <p style="margin: 3px 0 0; color: #0f172a; font-size: 12px; font-weight: 800;">
                      ${request.status === 'approved' 
                        ? (request.request_approvals?.filter(a => a.status === 'approved').sort((a, b) => new Date(b.acted_at || 0).getTime() - new Date(a.acted_at || 0).getTime())[0]?.acted_at 
                            ? new Date(request.request_approvals.filter(a => a.status === 'approved').sort((a, b) => new Date(b.acted_at || 0).getTime() - new Date(a.acted_at || 0).getTime())[0].acted_at!).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            : 'N/A')
                        : 'PENDING'}
                    </p>
                  </div>
                </div>
              </div>
              <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 12px;">
                <div style="padding: 6px; background: transparent; border: 1.5px solid rgba(15,23,42,0.1); border-radius: 12px; box-shadow: none;">
                  <img src="${qrCodeDataUrl}" alt="QR" style="width: 80px; height: 80px; display: block;" />
                </div>
                <p style="margin: 0; color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Secure Verification QR</p>
              </div>
            </div>

            <!-- PRIMARY INFORMATION -->
            <div class="pdf-item" style="display: grid; grid-template-columns: 2fr 1fr; gap: 35px; margin-bottom: 40px; background: transparent;">
              <div style="background: transparent; border-left: 5px solid #0f172a; padding: 25px; border-radius: 0 10px 10px 0;">
                <p style="margin: 0 0 8px; color: #2563eb; font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: 1.5px;">Subject Title</p>
                <h2 style="margin: 0 0 15px; color: #0f172a; font-size: 19px; font-weight: 900; line-height: 1.3; letter-spacing: -0.2px;">${request.title}</h2>
                <div style="display: flex; gap: 25px; background: transparent;">
                  <div>
                    <p style="margin: 0; color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase;">Origin Department</p>
                    <p style="margin: 3px 0 0; color: #1e293b; font-size: 11px; font-weight: 800;">${request.cells?.name || 'Central Administration'}</p>
                  </div>
                  <div>
                    <p style="margin: 0; color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase;">Approval Protocol</p>
                    <p style="margin: 3px 0 0; color: #1e293b; font-size: 11px; font-weight: 800;">${request.template_name || 'Standard Internal'}</p>
                  </div>
                </div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 15px; background: transparent;">
                <div style="background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.2); border-radius: 12px; padding: 18px; text-align: center;">
                  <p style="margin: 0 0 6px; color: #166534; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Approved Value</p>
                  <p style="margin: 0; color: #15803d; font-size: 26px; font-weight: 950; letter-spacing: -1.5px;">
                    ${request.has_amount ? `₹${request.amount?.toLocaleString('en-IN')}` : 'NO AMT'}
                  </p>
                </div>
                <div style="background: rgba(30,64,175,0.05); border: 1px solid rgba(30,64,175,0.2); border-radius: 12px; padding: 18px; text-align: center;">
                  <p style="margin: 0 0 6px; color: #1e40af; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Overall Decision</p>
                  <div style="margin-top: 8px;">${getStatusBadge(request.status?.toUpperCase())}</div>
                </div>
              </div>
            </div>

            <!-- STATEMENT BODY -->
            <div style="margin-bottom: 45px; background: transparent;">
              <div class="pdf-item" style="display: flex; align-items: center; gap: 15px; margin-bottom: 12px; background: transparent;">
                <div style="height: 1.5px; flex: 1; background: rgba(15,23,42,0.1);"></div>
                <p style="margin: 0; color: #64748b; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">Case Statement & Justification</p>
                <div style="height: 1.5px; flex: 1; background: rgba(15,23,42,0.1);"></div>
              </div>
              <div style="background: transparent; padding: 0 10px; border-left: 2px solid rgba(15,23,42,0.1); margin-left: 5px;">
                <h3 class="pdf-item" style="margin: 0 0 8px; font-size: 15px; font-weight: 850; color: #0f172a; letter-spacing: -0.3px;">${request.content?.subject || 'Reference Application'}</h3>
                <div style="color: #334155; font-size: 11.5px; line-height: 1.55; white-space: pre-wrap; font-weight: 450;">
                  ${(request.content?.body || 'No detailed content provided.').split('\n').map((p: string) => p.trim() ? `<div class="pdf-item" style="margin: 0;">${p}</div>` : '<div style="height: 8px;"></div>').join('')}
                </div>
              </div>
              
              ${request.has_amount && request.bifurcation && Array.isArray(request.bifurcation) && request.bifurcation.length > 0 ? `
                <div class="pdf-item" style="margin-top: 30px; background: transparent;">
                  <p style="margin: 0 0 12px; color: #64748b; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">Financial Bifurcation & GST Breakdown</p>
                  <table style="width: 100%; border-collapse: collapse; border: 1.5px solid rgba(15,23,42,0.1); border-radius: 8px; overflow: hidden; font-size: 11px; background: transparent;">
                    <thead>
                      <tr style="background: rgba(15,23,42,0.03); border-bottom: 1.5px solid rgba(15,23,42,0.1);">
                        <th style="padding: 10px 15px; text-align: left; color: #475569; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Item Description</th>
                        <th style="padding: 10px 15px; text-align: right; color: #475569; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Base (₹)</th>
                        <th style="padding: 10px 15px; text-align: right; color: #475569; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">GST</th>
                        <th style="padding: 10px 15px; text-align: right; color: #475569; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody style="background: transparent;">
                      ${request.bifurcation.map((item: any) => `
                        <tr style="border-bottom: 1px solid rgba(15,23,42,0.05); background: transparent;">
                          <td style="padding: 10px 15px; color: #1e293b; font-weight: 600;">${item.description}</td>
                          <td style="padding: 10px 15px; text-align: right; color: #1e293b;">${Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td style="padding: 10px 15px; text-align: right; color: #16a34a; font-weight: 600;">${item.gstRate}% (₹${Number(item.gstAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })})</td>
                          <td style="padding: 10px 15px; text-align: right; color: #0f172a; font-weight: 800;">₹${Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                    <tfoot>
                      <tr style="background: rgba(22,163,74,0.05);">
                        <td colspan="3" style="padding: 12px 15px; text-align: right; color: #166534; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; font-size: 10px;">Grand Total</td>
                        <td style="padding: 12px 15px; text-align: right; color: #15803d; font-weight: 950; font-size: 14px;">₹${Number(request.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ` : ''}
            </div>

            <!-- ENDORSEMENT BOARD -->
            <div style="margin-top: auto; border: 1.5px solid rgba(15,23,42,0.1); border-radius: 16px; overflow: hidden; background: transparent;">
              <div style="background: rgba(15,23,42,0.02); border-bottom: 1.5px solid rgba(15,23,42,0.1); padding: 15px 25px; display: flex; justify-content: space-between; align-items: center;">
                <p style="margin: 0; color: #0f172a; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px;">Official Endorsement Ledger</p>
                <p style="margin: 0; color: #94a3b8; font-size: 9px; font-weight: 700; text-transform: uppercase;">Digital Authentication Board</p>
              </div>
              <div style="padding: 25px; display: flex; flex-direction: column; gap: 30px; background: transparent;">
                ${(() => {
                  const roleOrder = ['Prepared by', 'Verified by', 'Forwarded by', 'Recommended by', 'Approved by'];
                  const signatories: any[] = [];
                  
                  // 1. Add Requester
                  const requesterRole = request.approval_templates?.requester_role_label || 'Prepared by';
                  signatories.push({
                    role: requesterRole,
                    name: request.requester_name || request.profiles?.full_name || '',
                    designation: request.profiles?.designations?.name || '',
                    signature: request.profiles?.signature,
                    status: 'APPROVED',
                    date: request.created_at,
                    comments: ''
                  });

                  // 2. Add Approvers
                  steps.forEach(step => {
                    const hist = approvals.filter(a => a.step_order === step.step_order);
                    const latest = hist[hist.length - 1];
                    if (!latest && step.step_order > request.current_step_order) return;
                    
                    signatories.push({
                      role: step.role_label || step.designations?.name || 'Signatory',
                      name: latest?.profiles?.full_name || (step.approver_id && step.profiles ? step.profiles.full_name : 'Await Decision'),
                      designation: latest?.profiles?.designations?.name || step.profiles?.designations?.name || step.designations?.name || '',
                      signature: latest?.profiles?.signature,
                      status: latest?.status || 'PENDING',
                      date: latest?.acted_at,
                      comments: latest?.comments || ''
                    });
                  });

                  // 3. Group by Role
                  const groups: Record<string, any[]> = {};
                  signatories.forEach(s => {
                    if (!groups[s.role]) groups[s.role] = [];
                    groups[s.role].push(s);
                  });

                  // 4. Sort Groups
                  const sortedRoles = Object.keys(groups).sort((a, b) => {
                    const idxA = roleOrder.indexOf(a);
                    const idxB = roleOrder.indexOf(b);
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    if (idxA !== -1) return -1;
                    if (idxB !== -1) return 1;
                    return a.localeCompare(b);
                  });

                  // 5. Render Groups
                  return sortedRoles.map(role => `
                    <div class="pdf-item" style="background: transparent;">
                      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <span style="font-size: 8px; font-weight: 900; color: #2563eb; text-transform: uppercase; letter-spacing: 1px; background: rgba(37,99,235,0.05); padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(37,99,235,0.1);">${role}</span>
                        <div style="height: 1px; flex: 1; background: rgba(15,23,42,0.1); min-width: 10px;"></div>
                      </div>
                      <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px;">
                        ${groups[role].map(s => `
                          <div style="background: transparent; border: 1px solid rgba(15,23,42,0.08); border-radius: 8px; padding: 10px 8px; display: flex; flex-direction: column; gap: 4px; min-height: 70px; width: 172px; box-sizing: border-box; text-align: center; align-items: center;">
                            <div style="width: 100%;">
                              <p style="margin: 0; color: #0f172a; font-size: 10px; font-weight: 950; line-height: 1.1;">${s.name}</p>
                              <p style="margin: 1px 0 0; color: #64748b; font-size: 7.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;">${s.designation}</p>
                            </div>
                            
                            ${s.signature ? `
                              <div style="height: 30px; display: flex; align-items: center; justify-content: center; margin: 1px 0;">
                                <img src="${s.signature}" style="max-height: 28px; max-width: 100%; object-fit: contain; filter: grayscale(1) contrast(1.1) brightness(0.9);" />
                              </div>
                            ` : `
                              <div style="height: 30px; display: flex; align-items: center; justify-content: center; border: 1px dashed rgba(15,23,42,0.06); border-radius: 6px; margin: 1px 0; width: 100%;">
                                <p style="margin: 0; color: #94a3b8; font-size: 6.5px; font-weight: 800; text-transform: uppercase;">Awaiting</p>
                              </div>
                            `}
                            
                            ${s.comments ? `
                              <p style="margin: 0; color: #64748b; font-size: 7px; font-weight: 600; font-style: italic; line-height: 1.1; opacity: 0.8;">"${s.comments}"</p>
                            ` : ''}

                            <div style="margin-top: auto; padding-top: 4px; border-top: 1px solid rgba(0,0,0,0.04); display: flex; justify-content: space-between; align-items: center; width: 100%;">
                              <span style="font-size: 5.5px; color: #cbd5e1; font-weight: 800; letter-spacing: 0.5px;">UNIPORT AUTH</span>
                              <span style="font-size: 6px; color: #94a3b8; font-weight: 800;">${s.date ? new Date(s.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-- --'}</span>
                            </div>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  `).join('');
                })()}
              </div>
            </div>

            <!-- DOCUMENT FOOTER -->
            <div style="margin-top: 50px; padding-top: 25px; border-top: 2.5px solid #0f172a; display: flex; justify-content: space-between; align-items: flex-end;">
              <div style="max-width: 450px;">
                <p style="margin: 0; color: #94a3b8; font-size: 8.5px; font-weight: 600; line-height: 1.5;">This institutional certificate is a secure electronic record generated by the UniPort Governance System. It is digitally authenticated and holds full validity without a physical signature under AIKTC Cluster regulations.</p>
              </div>
              <div style="text-align: right;">
                <p style="margin: 0; color: #1e293b; font-size: 10px; font-weight: 900; letter-spacing: 0.5px;">Auth Date: ${new Date().toLocaleString('en-IN')}</p>
                <p style="margin: 5px 0 0; color: #2563eb; font-size: 8.5px; font-weight: 900; letter-spacing: 1px;">SYSTEM BUILD: AIKTC-CERT-LTS-2026</p>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(container);

      // Wait for all images to load (QR, Signatures)
      const images = container.getElementsByTagName('img');
      await Promise.all(
        Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = () => {
              img.style.display = 'none'; // Prevent 0x0 dimension render crash
              resolve(null);
            };
          });
        })
      );

      const SCALE_FACTOR = 2.5;

      const canvas = await html2canvas(container, {
        scale: SCALE_FACTOR,
        useCORS: true,
        backgroundColor: null, // Critical: keeps content transparent for letterhead
        width: 793.7, // 595.28pt in px (accurate A4 width)
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png'); // PNG supports transparency

      // Create PDF
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      // Safe drawing area (A4 Height - Header Space - Footer Space)
      const headerSpace = 130; // Optimized clearance for institutional logos
      const footerSpace = 30;
      const safeArea = pdfHeight - headerSpace - footerSpace;

      // --- SMART SLICE LOGIC ---
      // 1. Find all potential break points and bounds of elements that shouldn't be cut
      const pxPerPt = canvas.width / pdfWidth;
      const elements = container.querySelectorAll('.pdf-item');
      const containerTop = container.getBoundingClientRect().top;
      
      const elementRects = Array.from(elements)
        .map(el => {
          const rect = el.getBoundingClientRect();
          return {
            // CRITICAL: rect.top is relative to viewport. 
            // rect.top - containerTop gets the CSS offset.
            // MUST multiply by SCALE_FACTOR (not pxPerPt) to map CSS to Canvas pixels
            top: (rect.top - containerTop) * SCALE_FACTOR,
            bottom: (rect.bottom - containerTop) * SCALE_FACTOR
          };
        })
        .sort((a, b) => a.top - b.top);

      const headerSpacePx = headerSpace * pxPerPt;
      const footerSpacePx = footerSpace * pxPerPt;
      const safeAreaPx = safeArea * pxPerPt;
      const pdfHeightPx = pdfHeight * pxPerPt;

      let currentYPx = 0;
      let pageNum = 0;

      while (currentYPx < canvas.height - 10) { // small threshold
        if (pageNum > 0) {
          pdf.addPage();
        }

        // 1. Draw Letterhead Background (EVERY page)
        if (letterheadDataUrl) {
          try {
            pdf.addImage(letterheadDataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
          } catch (e) {}
        }

        // 2. Determine Smart Slice Height
        const targetYPt = (pageNum === 0) ? 0 : headerSpace;
        const availableHeightPx = (pageNum === 0) ? (pdfHeightPx - footerSpacePx) : safeAreaPx;
        let sliceHeightPx = Math.min(canvas.height - currentYPx, availableHeightPx);

        // Adjust slice height to avoid cutting elements
        if (currentYPx + sliceHeightPx < canvas.height) {
           const idealBottom = currentYPx + sliceHeightPx;
           
           // Check if the cut intersects an atomic block
           const intersectedElement = elementRects.find(rect => rect.top < idealBottom && rect.bottom > idealBottom);
           
           if (intersectedElement) {
             // Cut immediately before the element so it pushes fully to next page
             const newSliceHeightPx = intersectedElement.top - currentYPx - 15; // clean 15px margin
             // Only shift if the shift is positive (prevents infinite loop if element is taller than available space)
             if (newSliceHeightPx > 0) {
               sliceHeightPx = newSliceHeightPx;
             }
           } else {
             // If not intersecting, optionally snap to a nearby bottom for cleaner margins
             const bestBottom = elementRects
               .map(rect => rect.bottom)
               .filter(b => b <= idealBottom && b > idealBottom - 100)
               .pop();
             
             if (bestBottom) {
               sliceHeightPx = bestBottom - currentYPx;
             }
           }
        }

        if (sliceHeightPx > 0) {
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceHeightPx;
          const sCtx = sliceCanvas.getContext('2d');
          
          if (sCtx) {
            sCtx.drawImage(canvas, 0, currentYPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
            const sliceData = sliceCanvas.toDataURL('image/png');
            pdf.addImage(sliceData, 'PNG', 0, targetYPt, pdfWidth, sliceHeightPx / pxPerPt, undefined, 'FAST');
          }
        }
        
        currentYPx += (sliceHeightPx + 1); // 1px gap to ensure we don't repeat the edge
        pageNum++;
        if (pageNum > 15) break; 
      }

      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      if (container.parentNode) {
        document.body.removeChild(container);
      }
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <button
      className="btn-premium-action"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.2)',
        color: '#fff',
        padding: '8px 18px',
        borderRadius: '10px',
        fontWeight: 700,
        fontSize: '11px',
        letterSpacing: '0.5px',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        position: 'relative',
        overflow: 'hidden',
        textTransform: 'uppercase'
      }}
      onClick={generatePDF}
      disabled={isGenerating}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1))';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(59,130,246,0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
      }}
    >
      {isGenerating ? (
        <>
          <Loader2 className="animate-spin" size={16} color="rgba(255,255,255,0.8)" />
          <span>PREPARING DOCUMENT...</span>
        </>
      ) : (
        <>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: 4, borderRadius: 6, display: 'flex' }}>
            <Printer size={15} />
          </div>
          <span>VIEW / PRINT PDF</span>
          <Eye size={14} style={{ opacity: 0.6 }} />
        </>
      )}
    </button>
  );
}
