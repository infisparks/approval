'use client';
import { useState, useEffect } from 'react';
import { 
  BarChart3, Calendar as CalendarIcon, Search, Filter,
  CheckCircle2, RotateCcw, FileText, Download, 
  Building2, Shapes, AppWindow, Clock
} from 'lucide-react';
import Select from 'react-select';
import makeAnimated from 'react-select/animated';
import AppShell from '@/components/AppShell';
import { 
  getAdminStats, getInstitutes, getDepartments, getCells 
} from '@/lib/api';
import { ApprovalRequest } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { DatePickerWithRange } from '@/components/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import jsPDF from 'jspdf';

const animatedComponents = makeAnimated();

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: '48px',
    borderRadius: '12px',
    border: state.isFocused ? '2px solid var(--accent)' : '1.5px solid var(--border)',
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

export default function AdminDashboard() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  
  const [selInstitutes, setSelInstitutes] = useState<any[]>([]);
  const [selDepartments, setSelDepartments] = useState<any[]>([]);
  const [selCells, setSelCells] = useState<any[]>([]);

  const [institutes, setInstitutes] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [cells, setCells] = useState<any[]>([]);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!profile || (profile.designations?.rank ?? 0) < 4)) {
      router.replace('/dashboard');
    }
  }, [profile, authLoading, router]);

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const [inst, dept, cl] = await Promise.all([
          getInstitutes(), getDepartments(), getCells() 
        ]);
        setInstitutes(inst.map(i => ({ value: i.id, label: i.name })));
        setDepartments(dept.map(d => ({ value: d.id, label: d.name })));
        setCells(cl.map(c => ({ value: c.id, label: c.name })));
        
        const initBatch = await getAdminStats({ 
          startDate: dateRange?.from ? startOfDay(dateRange.from).toISOString() : undefined, 
          endDate: dateRange?.to ? endOfDay(dateRange.to).toISOString() : undefined
        });
        setRequests(initBatch);
      } catch (err) {
        console.error("Data Load Error:", err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const data = await getAdminStats({
        startDate: dateRange?.from ? startOfDay(dateRange.from).toISOString() : undefined,
        endDate: dateRange?.to ? endOfDay(dateRange.to).toISOString() : undefined,
        instituteIds: selInstitutes.map(i => i.value),
        departmentIds: selDepartments.map(d => d.value),
        cellIds: selCells.map(c => c.value)
      });
      setRequests(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(r => ['approved', 'reverted', 'pending'].includes(r.status));

  const stats = {
    total: filteredRequests.length,
    approved: filteredRequests.filter(r => r.status === 'approved').length,
    reverted: filteredRequests.filter(r => r.status === 'reverted').length,
    pending: filteredRequests.filter(r => r.status === 'pending').length
  };

  if (authLoading || (profile && (profile.designations?.rank ?? 0) < 4)) {
    return <div className="loading-screen" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="loading-spinner" /></div>;
  }

  return (
    <AppShell title="Internal Oversight Dashboard">
      <div style={{ marginBottom: 32 }}>
        <div style={{ 
          background: 'linear-gradient(135deg, var(--midnight), var(--navy-light))',
          borderRadius: 24, padding: '40px', color: '#fff', marginBottom: 28,
          boxShadow: '0 20px 40px rgba(10,15,30,0.15)',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', right: -30, top: -30, opacity: 0.1 }}><BarChart3 size={240} /></div>
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
              <div style={{ padding: 10, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: 12 }}>
                <BarChart3 size={28} color="var(--gold)" />
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: -1 }}>Institutional Analytics</h1>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: 500, margin: 0 }}>Executive Command Center • AIKTC Cluster Dashboard</p>
          </div>
        </div>

        <div style={{ 
          background: '#fff', borderRadius: 20, padding: '28px', 
          border: '1px solid var(--border)', boxShadow: '0 8px 30px rgba(0,0,0,0.03)',
          marginBottom: 32
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <Filter size={16} color="var(--accent)" />
            <h2 style={{ fontSize: 13, fontWeight: 800, color: 'var(--midnight)', textTransform: 'uppercase', margin: 0, letterSpacing: 1 }}>Filter Parameters</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 24 }}>
            <div className="col-span-2">
              <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--slate)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <CalendarIcon size={14} className="text-accent" style={{ opacity: 0.8 }} /> Report Period
              </label>
              <DatePickerWithRange 
                value={dateRange}
                onChange={setDateRange}
              />
            </div>
            
            <div className="field-group">
              <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building2 size={12} /> Institutes
              </label>
              <Select 
                isMulti 
                options={institutes} 
                value={selInstitutes} 
                onChange={val => setSelInstitutes(val as any[])}
                styles={selectStyles}
                components={animatedComponents}
                placeholder="Select Institutes..."
                closeMenuOnSelect={false}
              />
            </div>
            
            <div className="field-group">
              <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shapes size={12} /> Departments
              </label>
              <Select 
                isMulti 
                options={departments} 
                value={selDepartments} 
                onChange={val => setSelDepartments(val as any[])}
                styles={selectStyles}
                components={animatedComponents}
                placeholder="Select Departments..."
                closeMenuOnSelect={false}
              />
            </div>

            <div className="field-group">
              <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <AppWindow size={12} /> Administrative Cells
              </label>
              <Select 
                isMulti 
                options={cells} 
                value={selCells} 
                onChange={val => setSelCells(val as any[])}
                styles={selectStyles}
                components={animatedComponents}
                placeholder="Select Cells..."
                closeMenuOnSelect={false}
              />
            </div>
          </div>

          <button onClick={handleSearch} className="btn-premium" style={{ width: '100%', height: 52, borderRadius: 12, fontSize: 16, fontWeight: 800 }}>
            <Search size={19} /> ANALYZE DATASET
          </button>
        </div>

        <div className="stats-grid" style={{ marginBottom: 40, gap: 24 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Throughput</span>
              <FileText size={20} color="var(--midnight)" />
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--midnight)', lineHeight: 1 }}>{loading ? '—' : stats.total}</div>
            <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 8, fontWeight: 600 }}>Total Processed</div>
          </div>
          
          <div style={{ borderRadius: 20, padding: 24, border: '1px solid var(--emerald-light)', background: 'linear-gradient(to bottom, #ffffff, rgba(16,185,129,0.03))', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: 'var(--emerald)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Approved</span>
              <CheckCircle2 size={20} color="var(--emerald)" />
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--emerald)', lineHeight: 1 }}>{loading ? '—' : stats.approved}</div>
            <div style={{ fontSize: 12, color: 'var(--emerald)', marginTop: 8, fontWeight: 600 }}>Final Authorization</div>
          </div>

          <div style={{ borderRadius: 20, padding: 24, border: '1px solid var(--gold-light)', background: 'linear-gradient(to bottom, #ffffff, rgba(245,158,11,0.03))', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Reverted</span>
              <RotateCcw size={20} color="var(--gold)" />
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--gold)', lineHeight: 1 }}>{loading ? '—' : stats.reverted}</div>
            <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 8, fontWeight: 600 }}>Action Corrected</div>
          </div>

          <div style={{ borderRadius: 20, padding: 24, border: '1px solid var(--rose-light)', background: 'linear-gradient(to bottom, #ffffff, rgba(244,63,94,0.03))', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: 'var(--rose)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Active</span>
              <Clock size={20} color="var(--rose)" />
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--rose)', lineHeight: 1 }}>{loading ? '—' : stats.pending}</div>
            <div style={{ fontSize: 12, color: 'var(--rose)', marginTop: 8, fontWeight: 600 }}>Awaiting Signature</div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 24, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fcfcfd' }}>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--midnight)', margin: 0, letterSpacing: -0.2 }}>Operational Oversight Ledger</h3>
              <p style={{ margin: '4px 0 0', color: 'var(--slate)', fontSize: 12, fontWeight: 500 }}>Comprehensive record of institutional activity • April 2026</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => {
                  const csv = [
                    ['ID', 'Title', 'Requester', 'Institute', 'Department', 'Amount', 'Status', 'Date'],
                    ...filteredRequests.map(r => [
                      r.id.slice(-6),
                      r.title,
                      r.profiles?.full_name,
                      r.profiles?.institutes?.name,
                      r.profiles?.departments?.name,
                      r.has_amount ? r.amount : 0,
                      r.status,
                      new Date(r.created_at).toLocaleDateString()
                    ])
                  ].map(e => e.map(cell => `"${cell}"`).join(",")).join("\n");
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.setAttribute("href", url);
                  link.setAttribute("download", `AIKTC_Executive_Report_${new Date().toISOString().split('T')[0]}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="btn btn-outline" style={{ gap: 8, height: 40, borderRadius: 10, borderColor: '#e2e8f0', fontSize: 11, fontWeight: 800 }}
              >
                <Download size={14} /> EXCEL EXPORT
              </button>
              
              <button 
                onClick={async () => {
                  const doc = new jsPDF('p', 'pt', 'a4');
                  const total = filteredRequests.reduce((sum, r) => sum + (r.has_amount ? (r.amount || 0) : 0), 0);
                  
                  // Load Header
                  try {
                    const img = new Image();
                    img.src = '/header/aiktcheader.png';
                    await new Promise((resolve) => {
                      img.onload = resolve;
                      img.onerror = resolve; // Continue even if image fails
                    });
                    if (img.complete && img.naturalWidth > 0) {
                      doc.addImage(img, 'PNG', 0, 0, 595, 75);
                    }
                  } catch (e) {
                    console.error("Header load failed", e);
                  }

                  doc.setFontSize(18);
                  doc.setTextColor(15, 23, 42); 
                  doc.setFont('helvetica', 'bold');
                  doc.text('INSTITUTIONAL PERFORMANCE REPORT', 40, 110);
                  
                  doc.setFontSize(10);
                  doc.setTextColor(100, 116, 139);
                  doc.setFont('helvetica', 'normal');
                  doc.text(`AIKTC Cluster Administrative Oversight • Generated: ${new Date().toLocaleString()}`, 40, 125);
                  
                  let y = 160;
                  doc.setFillColor(241, 245, 249);
                  doc.rect(40, y - 15, 515, 30, 'F');
                  doc.setTextColor(15, 23, 42);
                  doc.setFont('helvetica', 'bold');
                  doc.text('ID', 45, y + 5);
                  doc.text('REQUEST TITLE', 100, y + 5);
                  doc.text('REQUESTER', 280, y + 5);
                  doc.text('STATUS', 420, y + 5);
                  doc.text('AMOUNT', 500, y + 5);
                  
                  y += 35;
                  doc.setFont('helvetica', 'normal');
                  doc.setFontSize(9);
                  
                  const headerImage = new Image();
                  headerImage.src = '/header/aiktcheader.png';
                  await new Promise((res) => { headerImage.onload = res; headerImage.onerror = res; });

                  filteredRequests.forEach((r) => {
                    if (y > 780) {
                      doc.addPage();
                      // Brand Header on every page
                      if (headerImage.complete && headerImage.naturalWidth > 0) {
                        doc.addImage(headerImage, 'PNG', 0, 0, 595, 75);
                      }
                      
                      doc.setFillColor(241, 245, 249);
                      doc.rect(40, 85, 515, 30, 'F');
                      doc.setTextColor(15, 23, 42);
                      doc.setFont('helvetica', 'bold');
                      doc.text('ID', 45, 105);
                      doc.text('REQUEST TITLE', 100, 105);
                      doc.text('REQUESTER', 280, 105);
                      doc.text('STATUS', 420, 105);
                      doc.text('AMOUNT', 500, 105);
                      doc.setFont('helvetica', 'normal');
                      y = 135;
                    }
                    doc.setTextColor(71, 85, 105);
                    doc.text(r.id.slice(-6).toUpperCase(), 45, y);
                    doc.setTextColor(15, 23, 42);
                    doc.text(r.title.slice(0, 35) + (r.title.length > 35 ? '...' : ''), 100, y);
                    doc.text(r.profiles?.full_name?.slice(0, 20) || 'Unknown', 280, y);
                    
                    // Color code status in PDF
                    if (r.status === 'approved') doc.setTextColor(22, 163, 74);
                    else if (r.status === 'reverted') doc.setTextColor(217, 119, 6);
                    else doc.setTextColor(37, 99, 235);
                    
                    doc.text(r.status === 'pending' ? 'ACTIVE' : r.status.toUpperCase(), 420, y);
                    doc.setTextColor(15, 23, 42);
                    doc.text(`₹ ${r.has_amount ? (r.amount || 0).toLocaleString('en-IN') : 0}`, 500, y);
                    
                    y += 24;
                    doc.setDrawColor(241, 245, 249);
                    doc.line(40, y - 8, 555, y - 8);
                  });
                  
                  y += 30;
                  if (y > 800) { doc.addPage(); y = 60; }
                  doc.setFillColor(15, 23, 42);
                  doc.rect(40, y - 20, 515, 40, 'F');
                  doc.setFontSize(11);
                  doc.setTextColor(255, 255, 255);
                  doc.setFont('helvetica', 'bold');
                  doc.text(`EXECUTIVE FINANCIAL SUMMARY`, 55, y + 5);
                  doc.setFontSize(14);
                  doc.text(`TOTAL OUTLAY: INR ${total.toLocaleString('en-IN')}`, 320, y + 5);
                  
                  const blob = doc.output('blob');
                  window.open(URL.createObjectURL(blob));
                }}
                className="btn-premium" style={{ gap: 8, height: 40, borderRadius: 10, fontSize: 11, fontWeight: 800, padding: '0 16px' }}
              >
                <FileText size={14} /> PDF SUMMARY
              </button>
            </div>
          </div>
          
          {loading ? (
            <div style={{ padding: 100, textAlign: 'center' }}><div className="loading-spinner" /></div>
          ) : filteredRequests.length === 0 ? (
            <div style={{ padding: 100, textAlign: 'center', color: 'var(--slate-light)' }}>
              <div style={{ width: 80, height: 80, borderRadius: 20, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Search size={32} color="#cbd5e1" />
              </div>
              <h4 style={{ color: 'var(--midnight)', fontSize: 16, margin: '0 0 4px' }}>No Pertinent Signals Detected</h4>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>All requests currently outside oversight scope</p>
            </div>
          ) : (
            <div className="table-wrapper" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 1100 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '16px 32px', fontSize: 10, fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: 1 }}>Request Details</th>
                    <th style={{ padding: '16px 32px', fontSize: 10, fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: 1 }}>Subject / Requester</th>
                    <th style={{ padding: '16px 32px', fontSize: 10, fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: 1 }}>Institutional Origin</th>
                    <th style={{ padding: '16px 32px', fontSize: 10, fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: 1 }}>Financials</th>
                    <th style={{ padding: '16px 32px', fontSize: 10, fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: 1 }}>Status State</th>
                    <th style={{ padding: '16px 32px', fontSize: 10, fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: 1 }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.2s', cursor: 'default' }}>
                      <td style={{ padding: '20px 32px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--midnight)', fontSize: 15 }}>{r.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 800, background: 'rgba(59,130,246,0.06)', padding: '2px 6px', borderRadius: 4 }}>ID: {r.id.slice(-8).toUpperCase()}</span>
                          <span style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 600 }}>{r.approval_templates?.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '20px 32px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--midnight)', fontSize: 14 }}>{r.profiles?.full_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 2 }}>{r.profiles?.departments?.name}</div>
                      </td>
                      <td style={{ padding: '20px 32px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--midnight)', fontSize: 13 }}>{r.profiles?.institutes?.name}</div>
                        {r.cells && (
                          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
                            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase' }}>{r.cells.name}</span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '20px 32px' }}>
                        {r.has_amount ? (
                          <div style={{ fontWeight: 900, color: '#15803d', fontSize: 16, letterSpacing: -0.5 }}>₹{r.amount?.toLocaleString('en-IN')}</div>
                        ) : (
                          <div style={{ color: 'var(--slate-light)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>No Amount</div>
                        )}
                      </td>
                      <td style={{ padding: '20px 32px' }}>
                        <div style={{ 
                          padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: r.status === 'approved' ? '#dcfce7' : r.status === 'reverted' ? '#fef3c7' : r.status === 'pending' ? '#eff6ff' : '#fee2e2',
                          color: r.status === 'approved' ? '#166534' : r.status === 'reverted' ? '#92400e' : r.status === 'pending' ? '#1d4ed8' : '#991b1b',
                          border: `1px solid ${r.status === 'approved' ? '#bbf7d0' : r.status === 'reverted' ? '#fde68a' : r.status === 'pending' ? '#dbeafe' : '#fecaca'}`
                        }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                          {r.status === 'pending' ? 'ACTIVE' : r.status}
                        </div>
                      </td>
                      <td style={{ padding: '20px 32px', fontSize: 13, fontWeight: 600, color: 'var(--slate)' }}>
                        {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
