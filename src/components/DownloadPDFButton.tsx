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

      const currentStepObj = steps.find(s => s.id === request.current_step_id);
      const currentStepOrder = currentStepObj?.step_order || 0;

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
        <div style="padding: 40px; background: transparent; width: 100%; box-sizing: border-box;">
          <!-- MODERN PREMIUM HEADER -->
          <div class="pdf-item" style="display: flex; justify-content: space-between; margin-bottom: 45px; padding-top: 140px; border-bottom: 2px solid #0f172a; padding-bottom: 25px;">
            <div style="max-width: 60%;">
               <p style="margin: 0 0 8px; color: #3b82f6; font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: 2px;">Subject Application</p>
               <h1 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 900; line-height: 1.2; letter-spacing: -0.5px;">${request.title}</h1>
               <p style="margin: 10px 0 0; font-size: 13px; font-weight: 600; color: #64748b;">Reference ID: <span style="color: #0f172a;">${referenceId}</span></p>
            </div>
            <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
                <div style="padding: 5px; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 10px; margin-bottom: 12px;">
                  <img src="${qrCodeDataUrl}" style="width: 75px; height: 75px; display: block;" />
                </div>
                <p style="margin: 0; color: #94a3b8; font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">SECURE DIGITAL AUTH</p>
            </div>
          </div>

          <!-- PRIMARY METADATA GRID -->
          <div class="pdf-item" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 25px; margin-bottom: 40px;">
            <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 15px;">
              <p style="margin: 0 0 5px; color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Origin Entity</p>
              <p style="margin: 0; color: #1e293b; font-size: 12px; font-weight: 800;">${request.cells?.name || 'Central Administration'}</p>
            </div>
            <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 15px;">
              <p style="margin: 0 0 5px; color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Protocol Type</p>
              <p style="margin: 0; color: #1e293b; font-size: 12px; font-weight: 800;">${request.template_name || 'Standard'}</p>
            </div>
            <div style="background: ${request.has_amount ? 'rgba(16,185,129,0.05)' : '#f8fafc'}; border: 1.5px solid ${request.has_amount ? 'rgba(16,185,129,0.2)' : '#e2e8f0'}; border-radius: 12px; padding: 15px; text-align: right;">
              <p style="margin: 0 0 5px; color: ${request.has_amount ? '#166534' : '#94a3b8'}; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Value Involved</p>
              <p style="margin: 0; color: ${request.has_amount ? '#15803d' : '#1e293b'}; font-size: 16px; font-weight: 950;">${request.has_amount ? `₹${request.amount?.toLocaleString('en-IN')}` : 'NO AMT'}</p>
            </div>
          </div>

          <!-- CORE JUSTIFICATION -->
          <div style="margin-bottom: 40px;">
            <div class="pdf-item" style="background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 25px; position: relative;">
               <div style="position: absolute; top: -10px; left: 20px; background: #0f172a; color: #fff; padding: 4px 12px; border-radius: 6px; font-size: 9px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">Executive Statement</div>
               <h3 style="margin: 0 0 15px; font-size: 16px; font-weight: 850; color: #0f172a; line-height: 1.3;">${request.content?.subject || 'Re: Application for Approval'}</h3>
               <div style="color: #334155; font-size: 12px; line-height: 1.6; white-space: pre-wrap; font-weight: 450;">
                 ${(request.content?.body || 'No detailed content provided.').split('\n').map((p: string) => p.trim() ? `<div class="pdf-item" style="margin-bottom: 12px;">${p}</div>` : '<div style="height: 10px;"></div>').join('')}
               </div>
            </div>
          </div>

          ${request.has_amount && request.bifurcation && Array.isArray(request.bifurcation) && request.bifurcation.length > 0 ? `
            <div class="pdf-item" style="margin-bottom: 45px; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
              <div style="background: #f8fafc; padding: 12px 20px; border-bottom: 1.5px solid #e2e8f0; font-size: 10px; font-weight: 900; letter-spacing: 1px; color: #475569;">FINANCIAL BREAKDOWN & GST MATRIX</div>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: rgba(15,23,42,0.02); border-bottom: 1px solid #e2e8f0;">
                    <th style="padding: 12px 20px; text-align: left; font-size: 10px; font-weight: 800; color: #64748b;">DESCRIPTION</th>
                    <th style="padding: 12px 20px; text-align: right; font-size: 10px; font-weight: 800; color: #64748b;">BASE (₹)</th>
                    <th style="padding: 12px 20px; text-align: right; font-size: 10px; font-weight: 800; color: #64748b;">GST/TAX</th>
                    <th style="padding: 12px 20px; text-align: right; font-size: 10px; font-weight: 800; color: #64748b;">TOTAL (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${request.bifurcation.map((item: any) => `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 12px 20px; font-size: 12px; font-weight: 600; color: #1e293b;">${item.description}</td>
                      <td style="padding: 12px 20px; text-align: right; font-size: 12px; color: #64748b;">${Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style="padding: 12px 20px; text-align: right; font-size: 11px; font-weight: 700; color: #16a34a;">${item.gstRate}% (₹${Number(item.gstAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })})</td>
                      <td style="padding: 12px 20px; text-align: right; font-size: 12px; font-weight: 800; color: #0f172a;">₹${Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot>
                  <tr style="background: rgba(16,185,129,0.05); border-top: 2px solid #e2e8f0;">
                    <td colspan="3" style="padding: 15px 20px; font-size: 11px; font-weight: 900; color: #166534;">AGGREGATE PAYABLE AMOUNT</td>
                    <td style="padding: 15px 20px; text-align: right; font-size: 15px; font-weight: 950; color: #15803d;">₹${Number(request.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ` : ''}

          <!-- AUTHENTICATION BOARD -->
          <div>
            <div class="pdf-item" style="display: flex; align-items: center; gap: 15px; margin-bottom: 25px;">
              <div style="height: 2px; flex: 1; background: #0f172a;"></div>
              <p style="margin: 0; color: #0f172a; font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: 2px;">Institutional Endorsement Ledger</p>
              <div style="height: 2px; flex: 1; background: #0f172a;"></div>
            </div>
            
            <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 25px; padding: 0 10px;">
                ${(() => {
                  const signatories: any[] = [];
                  
                  request.request_approvals?.forEach(log => {
                    if (log.status?.toUpperCase() === 'APPROVED') {
                      signatories.push({
                        role: log.step_key?.replace(/_/g, ' ') || 'Signatory',
                        name: log.profiles?.full_name,
                        designation: log.profiles?.designations?.name,
                        signature: log.profiles?.signature,
                        date: log.acted_at,
                        comments: log.comments
                      });
                    }
                  });

                  return signatories.map(s => `
                    <div class="pdf-item" style="text-align: center; display: flex; flex-direction: column; align-items: center; width: 175px; padding: 12px; background: #fff; border: 1.5px solid #f1f5f9; border-radius: 12px;">
                      <div style="height: 55px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; width: 100%;">
                        ${s.signature ? `<img src="${s.signature}" style="max-height: 50px; max-width: 130px; object-fit: contain; filter: grayscale(1) contrast(1.2);" />` : '<div style="border-bottom: 1.5px dashed #cbd5e1; width: 80%; margin-top: 25px;"></div>'}
                      </div>
                      <div style="width: 100%; height: 1.5px; background: rgba(15,23,42,0.1); margin-bottom: 8px;"></div>
                      <p style="margin: 0; font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">${s.name}</p>
                      <p style="margin: 2px 0; font-size: 9px; font-weight: 700; color: #64748b;">${s.designation}</p>
                      <p style="margin: 4px 0; font-size: 8.5px; font-weight: 950; color: #3b82f6; text-transform: uppercase; letter-spacing: 1px;">${s.role}</p>
                      ${s.comments ? `
                        <div style="margin-top: 6px; padding: 5px; background: #f8fafc; border-radius: 4px; width: 100%;">
                          <p style="margin: 0; font-size: 8px; color: #475569; font-style: italic; line-height: 1.2;">"${s.comments}"</p>
                        </div>
                      ` : ''}
                      <p style="margin-top: 8px; font-size: 7px; color: #94a3b8; font-weight: 800;">${s.date ? new Date(s.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '--'} • SECURE AUTH</p>
                    </div>
                  `).join('');
                })()}
            </div>
          </div>

          <div class="pdf-item" style="margin-top: 60px; padding-top: 25px; border-top: 1.5px solid #f1f5f9; text-align: center;">
            <p style="margin: 0; font-size: 9px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">Digitally Authenticated Institutional Record</p>
            <p style="margin: 4px 0; font-size: 8px; color: #cbd5e1; font-weight: 500;">AIKTC-CERT-LTS-2026 • Valid without physical seal</p>
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
