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

      // Create a temporary container for the PDF content
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '850px';
      container.style.backgroundColor = '#ffffff';
      container.style.color = '#1e293b';
      container.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";

      const steps = request.approval_templates?.template_steps?.sort((a, b) => a.step_order - b.step_order) || [];
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

      container.innerHTML = `
        <div style="padding: 40px 50px; background: #fff; min-height: 1000px; display: flex; flex-direction: column;">
          <!-- MODERN HEADER -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 45px; border-bottom: 2px solid #f1f5f9; padding-bottom: 30px;">
            <div style="max-width: 60%;">
              <div style="background: #0f172a; color: #fff; display: inline-block; padding: 5px 12px; border-radius: 4px; margin-bottom: 15px;">
                <p style="margin: 0; font-size: 9px; font-weight: 900; letter-spacing: 2.5px; text-transform: uppercase;">INSTITUTIONAL AUTHORIZATION</p>
              </div>
              <h1 style="margin: 0; color: #0f172a; font-size: 28px; font-weight: 950; line-height: 1.1; letter-spacing: -1px;">Approval Certificate<br/><span style="color: #2563eb;">Official Reference</span></h1>
              <div style="margin-top: 20px; display: flex; gap: 25px;">
                <div>
                  <p style="margin: 0; color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Verification ID</p>
                  <p style="margin: 3px 0 0; color: #0f172a; font-family: monospace; font-size: 13px; font-weight: 800;">${verificationId}</p>
                </div>
                <div>
                  <p style="margin: 0; color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Issue Date</p>
                  <p style="margin: 3px 0 0; color: #0f172a; font-size: 13px; font-weight: 800;">${new Date(request.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
            </div>
            <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 12px;">
              <div style="padding: 6px; background: #fff; border: 1.5px solid #f1f5f9; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.04);">
                <img src="${qrCodeDataUrl}" alt="QR" style="width: 80px; height: 80px; display: block;" />
              </div>
              <p style="margin: 0; color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Scan to Verify Document</p>
            </div>
          </div>

          <!-- PRIMARY INFORMATION -->
          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 35px; margin-bottom: 40px;">
            <div style="background: #f8fafc; border-left: 5px solid #0f172a; padding: 25px; border-radius: 0 10px 10px 0;">
              <p style="margin: 0 0 8px; color: #94a3b8; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Subject Title</p>
              <h2 style="margin: 0 0 15px; color: #0f172a; font-size: 19px; font-weight: 900; line-height: 1.3; letter-spacing: -0.2px;">${request.title}</h2>
              <div style="display: flex; gap: 25px;">
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
            <div style="display: flex; flex-direction: column; gap: 15px;">
              <div style="background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 12px; padding: 18px; text-align: center;">
                <p style="margin: 0 0 6px; color: #166534; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Approved Value</p>
                <p style="margin: 0; color: #15803d; font-size: 26px; font-weight: 950; letter-spacing: -1.5px;">
                  ${request.has_amount ? `₹${request.amount?.toLocaleString('en-IN')}` : 'NO AMT'}
                </p>
              </div>
              <div style="background: #eff6ff; border: 1px solid #dbeafe; border-radius: 12px; padding: 18px; text-align: center;">
                <p style="margin: 0 0 6px; color: #1e40af; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Overall Decision</p>
                <div style="margin-top: 8px;">${getStatusBadge(request.status?.toUpperCase())}</div>
              </div>
            </div>
          </div>

          <!-- STATEMENT BODY -->
          <div style="margin-bottom: 45px;">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
              <div style="height: 1.5px; flex: 1; background: #f1f5f9;"></div>
              <p style="margin: 0; color: #64748b; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">Case Statement & Justification</p>
              <div style="height: 1.5px; flex: 1; background: #f1f5f9;"></div>
            </div>
            <div style="background: #fff; padding: 0 10px; border-left: 2px solid #f1f5f9; margin-left: 5px;">
              <h3 style="margin: 0 0 15px; font-size: 16px; font-weight: 850; color: #0f172a; letter-spacing: -0.3px;">${request.content?.subject || 'Reference Application'}</h3>
              <div style="color: #334155; font-size: 12px; line-height: 1.7; white-space: pre-wrap; font-weight: 450;">${request.content?.body || 'No detailed content provided.'}</div>
            </div>
          </div>

          <!-- ENDORSEMENT BOARD -->
          <div style="margin-top: auto; border: 1.5px solid #f1f5f9; border-radius: 16px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.02);">
            <div style="background: #fcfcfd; border-bottom: 1.5px solid #f1f5f9; padding: 15px 25px; display: flex; justify-content: space-between; align-items: center;">
              <p style="margin: 0; color: #0f172a; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px;">Official Endorsement Ledger</p>
              <p style="margin: 0; color: #94a3b8; font-size: 9px; font-weight: 700; text-transform: uppercase;">Digital Authentication Board</p>
            </div>
            <div style="padding: 25px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
              ${steps.map(step => {
                const hist = approvals.filter(a => a.step_order === step.step_order);
                const latest = hist[hist.length - 1];
                if (!latest && step.step_order > request.current_step_order) return '';

                return `
                  <div style="background: #fff; border: 1px solid #f1f5f9; border-radius: 10px; padding: 15px; display: flex; flex-direction: column; gap: 10px; min-height: 100px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                      <p style="margin: 0; color: #94a3b8; font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">${step.designations?.name || 'Signatory'}</p>
                      <div style="transform: scale(0.85); transform-origin: top right;">
                        ${getStatusBadge(latest?.status?.toUpperCase() || 'PENDING')}
                      </div>
                    </div>
                    <div style="min-height: 50px; display: flex; flex-direction: column; justify-content: center;">
                      <p style="margin: 0; color: #0f172a; font-size: 13px; font-weight: 800;">${latest?.profiles?.full_name || 'Await Decision'}</p>
                      <p style="margin: 5px 0 0; color: #64748b; font-size: 9px; font-weight: 600; font-style: italic; line-height: 1.4; opacity: 0.9;">
                        ${latest?.comments ? `"${latest.comments}"` : '<span style="opacity: 0.25;">Pending...</span>'}
                      </p>
                    </div>
                    <div style="margin-top: auto; padding-top: 10px; border-top: 1px solid #fcfcfd; display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-size: 7.5px; color: #cbd5e1; font-weight: 800; letter-spacing: 0.5px;">UNIPORT AUTH</span>
                      <span style="font-size: 8px; color: #94a3b8; font-weight: 800;">${latest?.acted_at ? new Date(latest.acted_at).toLocaleDateString('en-IN') : '--/--/--'}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- DOCUMENT FOOTER -->
          <div style="margin-top: 50px; padding-top: 25px; border-top: 2.5px solid #0f172a; display: flex; justify-content: space-between; align-items: flex-end;">
            <div style="max-width: 450px;">
              <p style="margin: 0; color: #0f172a; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Initiated By: <span style="color: #2563eb;">${(request.requester_name || request.profiles?.full_name || '').toUpperCase()}</span></p>
              <p style="margin: 6px 0 0; color: #94a3b8; font-size: 8.5px; font-weight: 600; line-height: 1.5;">This institutional certificate is a secure electronic record generated by the UniPort Governance System. It is digitally authenticated and holds full validity without a physical signature under AIKTC Cluster regulations.</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; color: #1e293b; font-size: 10px; font-weight: 900; letter-spacing: 0.5px;">Auth Date: ${new Date().toLocaleString('en-IN')}</p>
              <p style="margin: 5px 0 0; color: #2563eb; font-size: 8.5px; font-weight: 900; letter-spacing: 1px;">SYSTEM BUILD: AIKTC-CERT-LTS-2026</p>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(container);

      // Wait for images (QR code) to load
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
        scale: 2.0, // Switched to 2.0 for better memory performance
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 850,
        logging: false
      });

      // Use JPEG for robust PDF compatibility and avoid PNG signature issues
      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      // Create PDF
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const horizontalMargin = 30; // Reduced margin for modern look
      const topMargin = 40;
      const bottomMargin = 40;

      const contentWidth = pdfWidth - (horizontalMargin * 2);
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * contentWidth) / canvas.width;
      const pageHeight = pdfHeight - topMargin - bottomMargin;

      let position = topMargin;
      let heightLeft = imgHeight;

      // Add main content
      pdf.addImage(imgData, 'JPEG', horizontalMargin, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft > 20) {
        pdf.addPage();
        position = (heightLeft - imgHeight) + topMargin;
        pdf.addImage(imgData, 'JPEG', horizontalMargin, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      // Open in new tab
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
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
