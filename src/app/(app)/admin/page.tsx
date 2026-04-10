'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, Fragment } from 'react';
import { 
  BarChart3, Calendar as CalendarIcon, Search, Filter,
  CheckCircle2, RotateCcw, FileText, Download, 
  Building2, Shapes, AppWindow, Clock, X, Banknote
} from 'lucide-react';
import Select from 'react-select';
import makeAnimated from 'react-select/animated';
import AppShell from '@/components/AppShell';
import BifurcationTable from '@/components/BifurcationTable';
import { 
  getAdminStats, getInstitutes, getDepartments, getCells, getInstituteTypes
} from '@/lib/api';
import { ApprovalRequest, RequestApproval } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { DatePickerWithRange } from '@/components/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import jsPDF from 'jspdf';
import DownloadPDFButton from '@/components/DownloadPDFButton';

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
  const [selInstituteTypes, setSelInstituteTypes] = useState<any[]>([]);
  const [selDepartments, setSelDepartments] = useState<any[]>([]);
  const [selCells, setSelCells] = useState<any[]>([]);
  const [selStatuses, setSelStatuses] = useState<any[]>([]);

  const [rawInstitutes, setRawInstitutes] = useState<any[]>([]);
  const [rawInstituteTypes, setRawInstituteTypes] = useState<any[]>([]);
  const [rawDepartments, setRawDepartments] = useState<any[]>([]);
  const [rawCells, setRawCells] = useState<any[]>([]);
  const statusOptions = [
    { value: 'approved', label: 'Approved' },
    { value: 'reverted', label: 'Reverted' },
    { value: 'pending', label: 'Active' },
    { value: 'rejected', label: 'Rejected' },
  ];
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);

  const isAdmin = profile?.is_admin;

  useEffect(() => {
    if (!authLoading && (!profile || !isAdmin)) {
      router.replace('/dashboard');
    }
  }, [profile, authLoading, router, isAdmin]);

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const [inst, instT, dept, cl] = await Promise.all([
          getInstitutes(), getInstituteTypes(), getDepartments(), getCells() 
        ]);
        setRawInstitutes(inst);
        setRawInstituteTypes(instT);
        setRawDepartments(dept);
        setRawCells(cl);
        
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
        instituteTypeIds: selInstituteTypes.map(i => i.value),
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

  const filteredRequests = requests.filter(r => {
    const s = selStatuses.map(x => x.value);
    if (s.length > 0) return s.includes(r.status);
    return ['approved', 'reverted', 'pending'].includes(r.status);
  });

  const stats = {
    total: filteredRequests.length,
    approved: filteredRequests.filter(r => r.status === 'approved').length,
    reverted: filteredRequests.filter(r => r.status === 'reverted').length,
    pending: filteredRequests.filter(r => r.status === 'pending').length
  };

  // Derived Options
  const instituteOptions = rawInstitutes.map(i => ({ value: i.id, label: i.name }));
  
  const instituteTypeOptions = rawInstituteTypes
    .filter(it => selInstitutes.length === 0 || selInstitutes.some(inst => inst.value === it.institute_id))
    .map(it => ({ value: it.id, label: it.name }));

  const departmentOptions = rawDepartments
    .filter(d => selInstituteTypes.length === 0 || selInstituteTypes.some(it => it.value === d.institute_type_id))
    .map(d => ({ value: d.id, label: d.name }));

  const cellOptions = rawCells.map(c => ({ value: c.id, label: c.name }));

  if (authLoading || (profile && !isAdmin)) {
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
                options={instituteOptions} 
                value={selInstitutes} 
                onChange={val => {
                  setSelInstitutes(val as any[]);
                  setSelInstituteTypes([]);
                  setSelDepartments([]);
                }}
                styles={selectStyles}
                components={animatedComponents}
                placeholder="Select Institutes..."
                closeMenuOnSelect={false}
              />
            </div>

            <div className="field-group">
              <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shapes size={12} /> School / Institute Type
              </label>
              <Select 
                isMulti 
                options={instituteTypeOptions} 
                value={selInstituteTypes} 
                onChange={val => {
                  setSelInstituteTypes(val as any[]);
                  setSelDepartments([]);
                }}
                styles={selectStyles}
                components={animatedComponents}
                placeholder="Engineering, Pharmacy etc..."
                closeMenuOnSelect={false}
              />
            </div>
            
            <div className="field-group">
              <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shapes size={12} /> Departments
              </label>
              <Select 
                isMulti 
                options={departmentOptions} 
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
                options={cellOptions} 
                value={selCells} 
                onChange={val => setSelCells(val as any[])}
                styles={selectStyles}
                components={animatedComponents}
                placeholder="Select Cells..."
                closeMenuOnSelect={false}
              />
            </div>

            <div className="field-group">
              <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Filter size={12} /> Status State
              </label>
              <Select 
                isMulti 
                options={statusOptions} 
                value={selStatuses} 
                onChange={val => setSelStatuses(val as any[])}
                styles={selectStyles}
                components={animatedComponents}
                placeholder="Filter by Status..."
                closeMenuOnSelect={false}
              />
            </div>
          </div>

          <button onClick={handleSearch} className="btn-premium" style={{ 
            width: '100%', 
            height: 56, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: 12, 
            fontSize: 15, 
            fontWeight: 800, 
            letterSpacing: 0.5,
            border: 'none',
            borderRadius: 14,
            cursor: 'pointer'
          }}>
            <Search size={22} style={{ opacity: 0.8 }} /> ANALYZE DATASET
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
                  try {
                    const total = filteredRequests.reduce((sum, r) => sum + (r.has_amount ? (r.amount || 0) : 0), 0);
                    
                    // Create a hidden container for the report
                    const container = document.createElement('div');
                    container.style.position = 'fixed';
                    container.style.left = '-9999px';
                    container.style.top = '0';
                    container.style.width = '1000px';
                    container.style.background = '#fff';
                    container.style.fontFamily = "'Inter', -apple-system, sans-serif";
                    container.style.padding = '0';

                    container.innerHTML = `
                      <div style="padding: 45px 55px; background: #fff; min-height: 1200px; display: flex; flex-direction: column;">
                        <!-- Report Header -->
                        <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 4px solid #0f172a; padding-bottom: 25px; margin-bottom: 35px;">
                          <div>
                            <div style="background: #0f172a; color: #fff; display: inline-block; padding: 5px 12px; border-radius: 4px; margin-bottom: 12px; font-size: 11px; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase;">ADMINISTRATIVE DASHBOARD</div>
                            <h1 style="margin: 0; color: #0f172a; font-size: 36px; font-weight: 950; letter-spacing: -1.5px; line-height: 1;">INSTITUTIONAL <br/><span style="color: #2563eb;">PERFORMANCE REPORT</span></h1>
                          </div>
                          <div style="text-align: right;">
                            <p style="margin: 0; color: #94a3b8; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Document Authenticated On</p>
                            <p style="margin: 5px 0 0; color: #0f172a; font-size: 16px; font-weight: 800;">${new Date().toLocaleString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>

                        <!-- Data Table -->
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 50px;">
                          <thead>
                            <tr style="background: #fcfcfd; border-bottom: 2px solid #e2e8f0;">
                              <th style="padding: 16px 20px; text-align: left; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; width: 100px;">REF ID</th>
                              <th style="padding: 16px 20px; text-align: left; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">APPLICATION DETAILS</th>
                              <th style="padding: 16px 20px; text-align: left; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">STAKEHOLDER</th>
                              <th style="padding: 16px 20px; text-align: center; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; width: 120px;">STATUS</th>
                              <th style="padding: 16px 20px; text-align: right; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; width: 140px;">AMOUNT (INR)</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${filteredRequests.map((r, idx) => {
                              const statusColor = r.status === 'approved' ? '#166534' : r.status === 'reverted' ? '#92400e' : '#1d4ed8';
                              const statusBg = r.status === 'approved' ? '#dcfce7' : r.status === 'reverted' ? '#fef3c7' : '#eff6ff';
                              const rowBg = idx % 2 === 0 ? '#ffffff' : '#fcfcfd';
                              return `
                                <tr style="background: ${rowBg}; vertical-align: middle;">
                                  <td style="padding: 20px; border-bottom: 1px solid #f1f5f9; font-family: monospace; font-size: 13px; font-weight: 700; color: #94a3b8; vertical-align: middle;">#${r.id.slice(-6).toUpperCase()}</td>
                                  <td style="padding: 20px; border-bottom: 1px solid #f1f5f9; vertical-align: middle;">
                                    <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">${r.title}</div>
                                    <div style="font-size: 11px; color: #2563eb; font-weight: 700; text-transform: uppercase; opacity: 0.8;">${r.profiles?.institutes?.name || 'AIKTC Institutional'}</div>
                                  </td>
                                  <td style="padding: 20px; border-bottom: 1px solid #f1f5f9; vertical-align: middle;">
                                    <div style="font-size: 14px; font-weight: 800; color: #1e293b;">${r.profiles?.full_name || 'System User'}</div>
                                    <div style="font-size: 11px; color: #94a3b8; font-weight: 600;">${r.profiles?.departments?.name || 'Administrative Unit'}</div>
                                  </td>
                                  <td style="padding: 20px; border-bottom: 1px solid #f1f5f9; text-align: center; vertical-align: middle;">
                                    <span style="display: inline-block; padding: 6px 12px; border-radius: 6px; font-size: 10px; font-weight: 900; background: ${statusBg}; color: ${statusColor}; border: 1px solid rgba(0,0,0,0.03); text-transform: uppercase; letter-spacing: 0.5px;">
                                      ${(r.status === 'pending' ? 'ACTIVE' : r.status).toUpperCase()}
                                    </span>
                                  </td>
                                  <td style="padding: 20px; border-bottom: 1px solid #f1f5f9; text-align: right; vertical-align: middle;">
                                    <div style="font-size: 18px; font-weight: 950; color: #0f172a; letter-spacing: -0.5px;">
                                      ${r.has_amount ? `₹${r.amount?.toLocaleString('en-IN')}` : '<span style="color: #cbd5e1; font-size: 12px; font-weight: 700;">—</span>'}
                                    </div>
                                  </td>
                                </tr>
                              `;
                            }).join('')}
                          </tbody>
                        </table>

                        <!-- Summary Block -->
                        <div style="margin-top: auto; background: linear-gradient(135deg, #0f172a, #1e293b); border-radius: 20px; padding: 40px; display: flex; justify-content: space-between; align-items: center; color: #fff; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                          <div>
                            <p style="margin: 0; font-size: 12px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 3px;">Resource Allocation Summary</p>
                            <h2 style="margin: 8px 0 0; font-size: 28px; font-weight: 900; letter-spacing: -1px;">Consolidated <span style="color: #6366f1;">Aggregate</span></h2>
                          </div>
                          <div style="text-align: right;">
                            <p style="margin: 0; font-size: 12px; font-weight: 800; color: #6366f1; text-transform: uppercase; letter-spacing: 1px;">Total Authorized Funds</p>
                            <div style="font-size: 44px; font-weight: 950; letter-spacing: -2px; line-height: 1;">₹${total.toLocaleString('en-IN')}</div>
                          </div>
                        </div>

                        <!-- Footer -->
                        <div style="margin-top: 50px; padding-top: 25px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                          <div style="display: flex; align-items: center; gap: 15px;">
                            <div style="width: 10px; height: 10px; border-radius: 50%; background: #2563eb;"></div>
                            <p style="margin: 0; color: #0f172a; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Institutional Record • Confidential</p>
                          </div>
                          <p style="margin: 0; color: #94a3b8; font-size: 10px; font-weight: 600;">System Generated via UniPort v2.4.1 • No Signature Required</p>
                        </div>
                      </div>
                    `;

                    document.body.appendChild(container);

                    const html2canvas = (await import('html2canvas')).default;
                    const canvas = await html2canvas(container, {
                      scale: 2,
                      useCORS: true,
                      logging: false,
                      backgroundColor: '#ffffff'
                    });

                    const imgData = canvas.toDataURL('image/jpeg', 0.98);
                    const pdf = new jsPDF('p', 'pt', 'a4');
                    const imgWidth = 595.28;
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;
                    
                    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
                    
                    // Handle multi-page
                    let heightLeft = imgHeight - 841.89;
                    let position = -841.89;
                    while (heightLeft > 0) {
                      pdf.addPage();
                      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
                      heightLeft -= 841.89;
                      position -= 841.89;
                    }

                    const blob = pdf.output('blob');
                    window.open(URL.createObjectURL(blob));
                    document.body.removeChild(container);
                  } catch (e) {
                    console.error("PDF Generation failed:", e);
                    alert("Failed to generate PDF report.");
                  }
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
                    <tr 
                      key={r.id} 
                      onClick={() => setSelectedRequest(r)}
                      style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.2s', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
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

      {selectedRequest && (
        <InspectionModal 
          req={selectedRequest} 
          onClose={() => setSelectedRequest(null)} 
        />
      )}

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </AppShell>
  );
}

function InspectionModal({ req, onClose }: { req: ApprovalRequest; onClose: () => void }) {
  const hasChanges = req.last_reverted_step_order !== undefined;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.3s ease' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 900, maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.4s ease' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '28px 32px', background: 'linear-gradient(135deg, var(--midnight), var(--navy-light))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 2 }}>Inspection Panel</div>
              {hasChanges && <span style={{ padding: '2px 8px', background: 'rgba(245,158,11,0.2)', borderRadius: 6, fontSize: 9, fontWeight: 900, color: 'var(--gold)' }}>RESUBMITTED</span>}
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '4px 0 0' }}>{req.title}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', padding: 12, borderRadius: 12 }}><X size={20}/></button>
        </div>

        <div style={{ padding: 40, overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24 }}>
            <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', marginBottom: 12 }}>Case Narrative Details</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--midnight)', marginBottom: 8, borderLeft: '4px solid var(--accent)', paddingLeft: 12 }}>{req.content?.subject || req.title}</div>
              
              <div style={{ margin: '16px 0', height: 1, background: 'var(--border)', opacity: 0.5 }} />

              <div style={{ fontSize: 14, color: 'var(--slate)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{req.content?.body || 'No detailed content provided.'}</div>

              {req.has_amount && req.bifurcation && Array.isArray(req.bifurcation) && req.bifurcation.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                    Itemized Breakdown
                  </div>
                  <BifurcationTable data={req.bifurcation} onChange={() => {}} readOnly />
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.02))', border: '1.5px solid var(--emerald)', borderRadius: 20, padding: 28, textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--emerald)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Total Financial Impact</div>
                <div style={{ fontSize: 36, fontWeight: 950, color: 'var(--emerald)', letterSpacing: -1.5 }}>₹{req.has_amount ? (req.amount || 0).toLocaleString('en-IN') : '0.00'}</div>
                <div style={{ fontSize: 11, color: 'var(--emerald)', fontWeight: 800, marginTop: 4, opacity: 0.8 }}>Institutional Authorization Required</div>
              </div>

              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 20, padding: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>Request Originator</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--midnight)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800 }}>{req.profiles?.full_name?.charAt(0)}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--midnight)' }}>{req.profiles?.full_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--slate)', fontWeight: 600 }}>{req.profiles?.departments?.name}</div>
                  </div>
                </div>
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9', fontSize: 11, color: 'var(--slate)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {req.profiles?.institutes?.name}
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>Audit Timestamp</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--midnight)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={14} color="var(--accent)" />
                  {new Date(req.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 32, display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
            <button onClick={onClose} style={{ padding: '0 28px', height: 48, borderRadius: 12, background: '#f1f5f9', border: 'none', color: 'var(--slate)', fontWeight: 800, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}>CLOSE INSPECTOR</button>
            <div style={{ width: 240 }}><DownloadPDFButton request={req} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
