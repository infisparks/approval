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
      const verificationId = `VERIF-${request.id.slice(-10).toUpperCase()}`;
      const verificationUrl = `${window.location.origin}/verify/${request.id}`;
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 120,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });

      // Create a temporary container for the PDF content
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '800px';
      container.style.padding = '0'; // External margin handled by container child
      container.style.backgroundColor = '#ffffff';
      container.style.color = '#1e293b';
      container.style.fontFamily = "'Inter', system-ui, sans-serif";

      const steps = request.approval_templates?.template_steps?.sort((a, b) => a.step_order - b.step_order) || [];
      const approvals = request.request_approvals?.sort((a, b) =>
        new Date(a.acted_at || 0).getTime() - new Date(b.acted_at || 0).getTime()
      ) || [];

      container.innerHTML = `
        <div style="padding: 30px 40px; background: #fff; border: 1px solid #eee; display: flex; flex-direction: column;">
          <!-- Institution Header -->
          <div style="margin: -30px -40px 25px -40px; text-align: center; border-bottom: 3px solid #0f172a; overflow: hidden;">
            <img src="/header/aiktcheader.png" alt="AIKTC Header" style="width: 100%; height: auto; display: block;" />
          </div>

          <!-- Document Control Info -->
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; padding: 0 5px;">
            <div>
              <h1 style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Approval Certificate</h1>
              <div style="margin-top: 4px; display: flex; gap: 15px; align-items: center;">
                <p style="margin: 0; color: #64748b; font-size: 10px; font-weight: 600;">Verification ID: <span style="font-family: monospace; color: #0f172a;">${verificationId}</span></p>
                <p style="margin: 0; color: #64748b; font-size: 10px; font-weight: 600;">Issued Date: <span style="color: #0f172a;">${new Date(request.created_at).toLocaleDateString('en-IN')}</span></p>
              </div>
            </div>
            <div style="text-align: right; display: flex; align-items: center; gap: 10px;">
              <div style="text-align: right;">
                <p style="margin: 0; color: #94a3b8; font-size: 8px; font-weight: 800; text-transform: uppercase;">Digital Authentication</p>
                <p style="margin: 0; color: #64748b; font-size: 8px;">Scan to Verify Document</p>
              </div>
              <img src="${qrCodeDataUrl}" alt="QR" style="width: 50px; height: 50px; border: 1px solid #f1f5f9; padding: 2px;" />
            </div>
          </div>

          <!-- Professional Information Grid -->
          <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; margin-bottom: 20px;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px;">
              <p style="margin: 0 0 4px; color: #94a3b8; font-size: 8px; font-weight: 800; text-transform: uppercase;">Request Information</p>
              <h2 style="margin: 0 0 8px; color: #1e293b; font-size: 14px; font-weight: 700; line-height: 1.3;">${request.title}</h2>
              <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 4px;">
                  <span style="font-size: 9px; color: #64748b;">Protocol:</span>
                  <span style="font-size: 9px; color: #0f172a; font-weight: 700;">${request.template_name || 'Standard'}</span>
                </div>
                ${request.cells?.name ? `
                <div style="display: flex; align-items: center; gap: 4px;">
                  <span style="font-size: 9px; color: #64748b;">Department/Cell:</span>
                  <span style="font-size: 9px; color: #2563eb; font-weight: 800;">${request.cells.name}</span>
                </div>` : ''}
              </div>
            </div>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 15px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
              <p style="margin: 0 0 2px; color: #166534; font-size: 8px; font-weight: 800; text-transform: uppercase;">Financial Disbursement</p>
              <span style="font-size: 20px; font-weight: 950; color: #15803d; letter-spacing: -0.5px;">
                ${request.has_amount ? `₹${request.amount?.toLocaleString('en-IN')}` : 'NO AMOUNT'}
              </span>
            </div>
          </div>

          <!-- Body Content -->
          <div style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; margin-bottom: 25px;">
            <div style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 8px 15px; display: flex; justify-content: space-between; align-items: center;">
              <p style="margin: 0; color: #64748b; font-size: 9px; font-weight: 800; text-transform: uppercase;">Official Statement & Justification</p>
              <p style="margin: 0; color: #94a3b8; font-size: 8px;">Case Study Content</p>
            </div>
            <div style="padding: 15px; background: #fff;">
              <h3 style="margin: 0 0 10px; font-size: 12px; font-weight: 700; color: #0f172a; border-left: 3px solid #0f172a; padding-left: 10px;">${request.content?.subject || 'Reference Subject'}</h3>
              <p style="margin: 0; color: #334155; font-size: 10.5px; line-height: 1.5; white-space: pre-wrap;">${request.content?.body || 'No detailed content provided.'}</p>
            </div>
          </div>

          <!-- DIGITAL SIGNATURES PANEL -->
          <div style="border-top: 2px double #0f172a; padding-top: 15px; margin-bottom: 20px;">
            <p style="margin: 0 0 15px; color: #0f172a; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; text-align: center;">Official Endorsement & Signatures</p>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
              ${steps.map(step => {
                const hist = approvals.filter(a => a.step_order === step.step_order);
                const latest = hist[hist.length - 1];
                if (!latest && step.step_order > request.current_step_order) return ''; 

                return `
                  <div style="border: 1.5px dashed #cbd5e1; border-radius: 6px; padding: 10px; background-color: ${latest?.status === 'approved' ? '#fcfdfa' : '#fff'}; display: flex; flex-direction: column; gap: 6px; min-height: 110px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <p style="margin: 0; color: #94a3b8; font-size: 7.5px; font-weight: 800; text-transform: uppercase;">${step.designations?.name || 'Signatory'}</p>
                      <span style="font-size: 6.5px; font-weight: 900; padding: 2px 5px; border-radius: 3px; background-color: ${latest?.status === 'approved' ? '#dcfce7' : '#fee2e2'}; color: ${latest?.status === 'approved' ? '#166534' : '#991b1b'}; text-transform: uppercase;">
                        ${latest?.status || 'WAITING'}
                      </span>
                    </div>
                    <div>
                      <p style="margin: 0; color: #0f172a; font-size: 11px; font-weight: 800;">${latest?.profiles?.full_name || 'Pending Action'}</p>
                      <p style="margin: 2px 0 0; color: #64748b; font-size: 9px; font-weight: 600; font-style: italic; line-height: 1.2;">
                        ${latest?.comments ? `"${latest.comments}"` : '<span style="opacity: 0.4;">...</span>'}
                      </p>
                    </div>
                    <div style="margin-top: auto; padding-top: 6px; border-top: 1px solid #f1f5f9;">
                      <p style="margin: 0; color: #94a3b8; font-size: 7px; text-align: right;">${latest?.acted_at ? new Date(latest.acted_at).toLocaleDateString('en-IN') : '--/--/----'}</p>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- ACTION HISTORY FOR REVERTS -->
          ${approvals.some(a => a.status === 'reverted') ? `
          <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 12px; margin-bottom: 20px;">
            <p style="margin: 0 0 8px; color: #92400e; font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Amendment History & Feedback</p>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              ${approvals.map(a => `
                <div style="font-size: 9px; color: #92400e; display: flex; justify-content: space-between; align-items: flex-start; padding: 3px 0; border-bottom: 1px solid rgba(146, 64, 14, 0.1);">
                  <span>
                    <strong>${a.status.toUpperCase()}</strong> by ${a.profiles?.full_name} (${a.approver_name || 'Admin'})
                    <div style="font-size: 8px; font-style: italic; margin-top: 1px;">"${a.comments || 'No comment'}"</div>
                  </span>
                  <span style="font-size: 8px; opacity: 0.7; white-space: nowrap;">${new Date(a.acted_at || '').toLocaleDateString()}</span>
                </div>
              `).join('')}
            </div>
          </div>` : ''}

          <!-- Page Footer -->
          <div style="border-top: 1px solid #f1f5f9; padding-top: 12px; margin-top: auto; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <p style="margin: 0; color: #94a3b8; font-size: 8px; font-weight: 700;">Initiated By: <span style="color: #475569;">${request.requester_name || request.profiles?.full_name}</span></p>
              <p style="margin: 1px 0 0; color: #cbd5e1; font-size: 7.5px;">This is a digitally signed and verified document. Required no physical signature.</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; color: #94a3b8; font-size: 8px; font-weight: 700;">Document Generated: ${new Date().toLocaleString('en-IN')}</p>
              <p style="margin: 1px 0 0; color: #cbd5e1; font-size: 7.5px;">AikTC Cluster Approval Management System v1.1.2</p>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(container);

      // Wait for image to load if any
      const images = container.getElementsByTagName('img');
      await Promise.all(
        Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      const canvas = await html2canvas(container, {
        scale: 2.5, // Increased scale for pro-grade sharpness
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 800,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png', 1.0);

      // Multi-page logic for jsPDF
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Standard Institutional Margins (pt)
      const horizontalMargin = 40;
      const topMargin = 40;
      const bottomMargin = 40;

      const contentWidth = pdfWidth - (horizontalMargin * 2);
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * contentWidth) / canvas.width;
      const pageHeight = pdfHeight - topMargin - bottomMargin;

      let position = topMargin;
      let heightLeft = imgHeight;

      // Add the entire image to the first page (jsPDF will automatically clip based on the current page boundary)
      pdf.addImage(imgData, 'PNG', horizontalMargin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Only add new pages if there is significant remaining content (using a 40pt buffer to prevent blank/duplicate footers)
      while (heightLeft > 40) {
        pdf.addPage();
        // The position is negative. We are "sliding" the full image up.
        // On the second page, we want to start from where the first page cut off.
        position = (heightLeft - imgHeight) + topMargin; 
        pdf.addImage(imgData, 'PNG', horizontalMargin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Open as Blob URL
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noreferrer');

      document.body.removeChild(container);
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
