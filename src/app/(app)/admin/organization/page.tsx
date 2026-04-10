'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import AppShell from '@/components/AppShell';
import { 
  getAllProfilesAdmin, getDesignations, getPersonTypes, getInstitutes, getInstituteTypes, getDepartments,
  createDesignation, createPersonType, updateProfileAdmin, updateProfileLockStatus
} from '@/lib/api';
import { UserProfile, Designation, PersonType, Institute, InstituteType, Department } from '@/lib/types';
import { ShieldCheck, User, Building, Users, Search, Edit2, Check, X, Info, Plus, Lock, Unlock, Phone, ChevronRight } from 'lucide-react';

function ProfilesTab() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [personTypes, setPersonTypes] = useState<PersonType[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [instituteTypes, setInstituteTypes] = useState<InstituteType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempType, setTempType] = useState<string | null>(null);
  const [tempName, setTempName] = useState<string>('');
  const [tempNumber, setTempNumber] = useState<string>('');
  const [tempInstitute, setTempInstitute] = useState<string | null>(null);
  const [tempInstituteType, setTempInstituteType] = useState<string | null>(null);
  const [tempDept, setTempDept] = useState<string | null>(null);
  const [tempDesig, setTempDesig] = useState<string | null>(null);
  const [tempIsAdmin, setTempIsAdmin] = useState<boolean>(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showHierarchy, setShowHierarchy] = useState(false);

  // Search/Filter State
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [filterInstitute, setFilterInstitute] = useState(searchParams.get('institute') || '');
  const [filterType, setFilterType] = useState(searchParams.get('type') || '');
  const [filterDept, setFilterDept] = useState(searchParams.get('dept') || '');
  const [filterDesig, setFilterDesig] = useState(searchParams.get('desig') || '');

  const updateUrlParams = (params: Record<string, string | null>) => {
    const current = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value) current.set(key, value);
      else current.delete(key);
    });
    router.replace(`${pathname}?${current.toString()}`);
  };

  const loadData = async () => {
    setLoading(true);
    const [p, pt, inst, instT, dept, desig] = await Promise.all([
      getAllProfilesAdmin(), 
      getPersonTypes(),
      getInstitutes(),
      getInstituteTypes(),
      getDepartments(),
      getDesignations()
    ]);
    setProfiles(p);
    setPersonTypes(pt);
    setInstitutes(inst);
    setInstituteTypes(instT);
    setDepartments(dept);
    setDesignations(desig);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdate = async (profileId: string) => {
    if (!tempName.trim()) {
      alert("Name cannot be empty");
      return;
    }
    setUpdating(profileId);
    try {
      // Automatic data sanitization and SUPERIOR auto-assignment
      const desigName = designations.find(d => d.id === tempDesig)?.name?.toLowerCase() || '';
      let finalDept = tempDept;
      let finalInstType = tempInstituteType;
      let finalInst = tempInstitute;

      const globalNames = ['director', 'chairman', 'cfo', 'ceo', 'treasurer', 'vice president', 'president', 'accountant', 'admin'];

      // Rule 1: If it's a Global/Superior role, try to auto-map to "Administration" dept/type/inst if not already set
      if (globalNames.includes(desigName)) {
        const adminInst = institutes.find(i => i.name.toLowerCase() === 'administration');
        const adminType = instituteTypes.find(it => it.name.toLowerCase() === 'administration' && (it.institute_id === finalInst || it.institute_id === adminInst?.id));
        const adminDept = departments.find(d => d.name.toLowerCase() === 'administration' && (d.institute_type_id === finalInstType || d.institute_type_id === adminType?.id));

        if (desigName === 'chairman' || desigName === 'cfo' || desigName === 'ceo' || desigName === 'treasurer' || desigName === 'vice president' || desigName === 'president') {
           // Institutional Superior: Default to Administration Institute/Type/Dept
           if (!finalInst && adminInst) finalInst = adminInst.id;
           if (!finalInstType && adminType) finalInstType = adminType.id;
           if (!finalDept && adminDept) finalDept = adminDept.id;
        } else if (desigName === 'director') {
           // Director: Default to Administration Type/Dept within the selected Institute
           if (!finalInstType && adminType) finalInstType = adminType.id;
           if (!finalDept && adminDept) finalDept = adminDept.id;
        } else if (['accountant', 'admin'].includes(desigName)) {
           // Staff Admin: Default to Administration Dept within the selected Type
           if (!finalDept && adminDept) finalDept = adminDept.id;
        }
      } else if (desigName === 'dean') {
        // Dean: Default to Administration Dept within the selected Type
        const adminDept = departments.find(d => d.name.toLowerCase() === 'administration' && d.institute_type_id === finalInstType);
        if (!finalDept && adminDept) finalDept = adminDept.id;
      }

      await updateProfileAdmin(profileId, {
        full_name: tempName,
        number: tempNumber || null,
        person_type_id: tempType || null,
        institute_id: finalInst || null,
        institute_type_id: finalInstType || null,
        department_id: finalDept || null,
        designation_id: tempDesig || null,
        is_admin: tempIsAdmin
      });
      await loadData();
      setEditingId(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(null);
    }
  };
  
  const handleToggleLock = async (profileId: string, currentStatus: boolean) => {
    setUpdating(profileId);
    try {
      await updateProfileLockStatus(profileId, !currentStatus);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const filtered = profiles.filter(p => {
    const matchesSearch = !search || 
      p.full_name?.toLowerCase().includes(search.toLowerCase()) || 
      p.email?.toLowerCase().includes(search.toLowerCase());
    
    const matchesInstitute = !filterInstitute || p.institute_id === filterInstitute;
    const matchesType = !filterType || p.institute_type_id === filterType;
    const matchesDept = !filterDept || p.department_id === filterDept;
    const matchesDesig = !filterDesig || p.designation_id === filterDesig;

    return matchesSearch && matchesInstitute && matchesType && matchesDept && matchesDesig;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, gap: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', maxWidth: 480, flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-light)', opacity: 0.7 }} />
          <input
            className="field-input"
            style={{ 
              paddingLeft: 48, 
              marginBottom: 0, 
              height: 52, 
              borderRadius: 16,
              background: '#fff',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.02)',
              fontSize: 15
            }}
            placeholder="Search within institutional directory..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              updateUrlParams({ q: e.target.value });
            }}
          />
        </div>
        
        {/* Advanced Filters */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24, width: '100%' }}>
          <select 
            className="field-input" 
            style={{ width: 'auto', minWidth: 160, marginBottom: 0, height: 44, borderRadius: 12, fontSize: 13 }}
            value={filterInstitute}
            onChange={e => {
              setFilterInstitute(e.target.value);
              setFilterType('');
              setFilterDept('');
              updateUrlParams({ institute: e.target.value, type: null, dept: null });
            }}
          >
            <option value="">All Institutes</option>
            {institutes.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>

          <select 
            className="field-input" 
            style={{ width: 'auto', minWidth: 160, marginBottom: 0, height: 44, borderRadius: 12, fontSize: 13 }}
            value={filterType}
            onChange={e => {
              setFilterType(e.target.value);
              setFilterDept('');
              updateUrlParams({ type: e.target.value, dept: null });
            }}
            disabled={!filterInstitute}
          >
            <option value="">All Types</option>
            {instituteTypes.filter(it => it.institute_id === filterInstitute).map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
          </select>

          <select 
            className="field-input" 
            style={{ width: 'auto', minWidth: 160, marginBottom: 0, height: 44, borderRadius: 12, fontSize: 13 }}
            value={filterDept}
            onChange={e => {
              setFilterDept(e.target.value);
              updateUrlParams({ dept: e.target.value });
            }}
            disabled={!filterType}
          >
            <option value="">All Departments</option>
            {departments.filter(d => d.institute_type_id === filterType).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          <select 
            className="field-input" 
            style={{ width: 'auto', minWidth: 160, marginBottom: 0, height: 44, borderRadius: 12, fontSize: 13 }}
            value={filterDesig}
            onChange={e => {
              setFilterDesig(e.target.value);
              updateUrlParams({ desig: e.target.value });
            }}
          >
            <option value="">All Designations</option>
            {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          <button 
            className="btn btn-icon" 
            style={{ height: 44, width: 44, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={() => {
              setSearch('');
              setFilterInstitute('');
              setFilterType('');
              setFilterDept('');
              setFilterDesig('');
              updateUrlParams({ q: null, institute: null, type: null, dept: null, desig: null });
            }}
            title="Clear All Filters"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ 
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', 
          background: 'linear-gradient(135deg, var(--midnight), var(--navy-light))', 
          borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={16} color="var(--gold)" />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1.5, lineHeight: 1 }}>Directory Size</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>{profiles.length} Records</div>
          </div>
        </div>
      </div>

      <div style={{ 
        marginBottom: 24, 
        padding: '16px 20px', 
        background: '#fff', 
        borderRadius: 16, 
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <label className="checkbox-container" style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', margin: 0 }}>
          <input 
            type="checkbox" 
            checked={showHierarchy} 
            onChange={e => setShowHierarchy(e.target.checked)}
            style={{ width: 20, height: 20, cursor: 'pointer', accentColor: 'var(--midnight)' }}
          />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--midnight)' }}>Show Full Institutional Hierarchy Details</span>
        </label>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loading-spinner" /></div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Profile Info</th>
                {showHierarchy ? (
                  <th>Full Institutional Path (Inst. &gt; Type &gt; Dept. &gt; Desig. &gt; Cat.)</th>
                ) : (
                  <>
                    <th>Designation / Dept.</th>
                    <th>Institution (Inst. Type)</th>
                    <th>Staff Category (Person Type)</th>
                  </>
                )}
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className={editingId === p.id ? 'row-editing' : ''}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="avatar-admin">
                        {p.full_name?.[0]?.toUpperCase() || '?'}
                        <div className="status-dot" />
                      </div>
                      <div>
                        {editingId === p.id ? (
                          <>
                            <input 
                              className="field-input" 
                              style={{ marginBottom: 4, height: 32, fontSize: 13, padding: '0 8px', borderRadius: 6, width: '100%', fontWeight: 700 }}
                              value={tempName}
                              onChange={e => setTempName(e.target.value)}
                              disabled={!!updating}
                              placeholder="Full Name"
                            />
                            <input 
                              className="field-input" 
                              style={{ marginBottom: 4, height: 32, fontSize: 13, padding: '0 8px', borderRadius: 6, width: '100%', fontWeight: 700 }}
                              value={tempNumber}
                              onChange={e => setTempNumber(String(e.target.value))}
                              disabled={!!updating}
                              placeholder="Phone Number"
                            />
                          </>
                        ) : (
                          <>
                            <div style={{ fontWeight: 800, color: 'var(--midnight)', fontSize: 14 }}>{p.full_name}</div>
                            <div style={{ fontSize: 12, color: 'var(--slate)', fontWeight: 500 }}>{p.email}</div>
                            {p.number && (
                              <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Phone size={10} /> {p.number}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </td>

                  {showHierarchy || editingId === p.id ? (
                    <td>
                      {editingId === p.id ? (
                        <div style={{ display: 'grid', gap: 12, padding: 16, background: 'var(--surface)', borderRadius: 16, border: '2px solid var(--accent)' }}>
                          {/* Profile Hierarchy Configuration */}
                          <div style={{ padding: '8px 12px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: 10, border: '1px solid rgba(59, 130, 246, 0.1)', marginBottom: 4 }}>
                            <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1 }}>Superior Assignment Rules</div>
                            <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>
                              Selecting <b>'Administration'</b> in Department/Type allows this user to manage <b>ALL</b> sub-entities in that scope.
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="field-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase' }}>Institute</label>
                              <select 
                                className="field-input" 
                                style={{ marginBottom: 0, height: 38, fontSize: 13 }} 
                                value={tempInstitute || ''} 
                                onChange={e => {
                                  setTempInstitute(e.target.value);
                                  setTempInstituteType(null);
                                  setTempDept(null);
                                }}
                              >
                                <option value="">Select Institute</option>
                                {institutes.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                              </select>
                            </div>

                            <div className="field-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase' }}>Inst. Type</label>
                              <select 
                                className="field-input" 
                                style={{ marginBottom: 0, height: 38, fontSize: 13 }} 
                                value={tempInstituteType || ''} 
                                onChange={e => {
                                  setTempInstituteType(e.target.value);
                                  setTempDept(null);
                                }}
                                disabled={!tempInstitute}
                              >
                                <option value="">Select Type</option>
                                {instituteTypes
                                  .filter(it => it.institute_id === tempInstitute)
                                  .map(it => <option key={it.id} value={it.id}>{it.name}</option>)
                                }
                              </select>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="field-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase' }}>Department</label>
                              <select 
                                className="field-input" 
                                style={{ marginBottom: 0, height: 38, fontSize: 13 }} 
                                value={tempDept || ''} 
                                onChange={e => setTempDept(e.target.value)}
                                disabled={!tempInstituteType}
                              >
                                <option value="">Select Department</option>
                                {departments
                                  .filter(d => d.institute_type_id === tempInstituteType)
                                  .map(d => <option key={d.id} value={d.id}>{d.name}</option>)
                                }
                              </select>
                            </div>
                            
                            <div className="field-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase' }}>Designation</label>
                              <select className="field-input" style={{ marginBottom: 0, height: 38, fontSize: 13 }} value={tempDesig || ''} onChange={e => setTempDesig(e.target.value)}>
                                <option value="">Select Designation</option>
                                {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                              </select>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase' }}>Staff Category</label>
                              <select className="field-input" style={{ marginBottom: 0, height: 38, fontSize: 13 }} value={tempType || ''} onChange={e => setTempType(e.target.value)}>
                                <option value="">Select Category</option>
                                {personTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                              </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,0,0,0.03)', borderRadius: 10, padding: '0 12px' }}>
                               <input type="checkbox" checked={tempIsAdmin} onChange={e => setTempIsAdmin(e.target.checked)} />
                               <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--midnight)' }}>Admin Portal Access</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ 
                          fontSize: 12, 
                          fontWeight: 700, 
                          color: 'var(--midnight)',
                          padding: '10px 14px',
                          background: 'var(--surface)',
                          borderRadius: 10,
                          border: '1px solid var(--border)',
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: 8
                        }}>
                          <span style={{ color: 'var(--accent)' }}>{p.institutes?.name || 'N/A'}</span>
                          <span style={{ opacity: 0.3 }}>&gt;</span>
                          <span style={{ color: 'var(--midnight)' }}>{p.institute_types?.name || 'N/A'}</span>
                          <span style={{ opacity: 0.3 }}>&gt;</span>
                          <span style={{ color: 'var(--navy-light)' }}>{p.departments?.name || 'N/A'}</span>
                          <span style={{ opacity: 0.3 }}>&gt;</span>
                          <span style={{ color: 'var(--slate)' }}>{p.designations?.name || 'N/A'}</span>
                          <span style={{ opacity: 0.3 }}>&gt;</span>
                          <span style={{ color: 'var(--emerald)', fontWeight: 800 }}>{p.person_types?.name || 'N/A'}</span>
                        </div>
                      )}
                    </td>
                  ) : (
                    <>
                      <td>
                        {p.designations ? (
                          <div className="badge-modern badge-blue" style={{ marginBottom: 4 }}>{p.designations.name}</div>
                        ) : <span className="text-muted" style={{ display: 'block', marginBottom: 4 }}>No Designation</span>}
                        <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Building size={10} /> {p.departments?.name || 'No Department'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--midnight)' }}>{p.institutes?.name || 'N/A'}</div>
                        <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Building size={10} /> {p.institute_types?.name || 'N/A'}
                        </div>
                      </td>
                      <td>
                        {editingId === p.id ? (
                          <select 
                            className="field-input" 
                            style={{ marginBottom: 0, height: 36, fontSize: 13, padding: '0 10px', borderRadius: 8, border: '2px solid var(--accent)' }}
                            value={tempType || ''}
                            onChange={e => setTempType(e.target.value)}
                            disabled={!!updating}
                          >
                            <option value="">Select Category</option>
                            {personTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                          </select>
                        ) : (
                          p.person_types ? (
                            <div className="badge-modern badge-green">{p.person_types.name}</div>
                          ) : <span className="text-muted">Uncategorized</span>
                        )}
                      </td>
                    </>
                  )}
                  <td style={{ textAlign: 'right' }}>
                    {editingId === p.id ? (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button 
                          className="btn-icon btn-icon-cancel" 
                          onClick={() => setEditingId(null)}
                          disabled={!!updating}
                        >
                          <X size={14} />
                        </button>
                        <button 
                          className="btn-icon btn-icon-save" 
                          onClick={() => handleUpdate(p.id)}
                          disabled={!!updating}
                        >
                          {updating === p.id ? '...' : <Check size={14} />}
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button 
                          className={`btn-icon ${p.is_locked ? 'btn-icon-locked' : 'btn-icon-unlock'}`}
                          title={p.is_locked ? "Unlock Account" : "Lock Account"}
                          onClick={() => handleToggleLock(p.id, !!p.is_locked)}
                          disabled={!!updating}
                        >
                          {updating === p.id ? '...' : (p.is_locked ? <Lock size={14} /> : <Unlock size={14} />)}
                        </button>
                        <button 
                          className="btn-icon btn-icon-edit" 
                          onClick={() => {
                            setEditingId(p.id);
                            setTempType(p.person_type_id || null);
                            setTempName(p.full_name || '');
                            setTempNumber(String(p.number || ''));
                            setTempInstitute(p.institute_id || null);
                            setTempInstituteType(p.institute_type_id || null);
                            setTempDept(p.department_id || null);
                            setTempDesig(p.designation_id || null);
                            setTempIsAdmin(!!p.is_admin);
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={showHierarchy ? 3 : 5} style={{ textAlign: 'center', padding: '50px', background: 'var(--surface)' }}>
                    <div style={{ opacity: 0.5, marginBottom: 12 }}><Search size={40} /></div>
                    <div style={{ fontWeight: 700, color: 'var(--slate)' }}>No profiles matched your search</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .avatar-admin {
          width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #f8fafc, #eff6ff); color: var(--accent);
          display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px;
          position: relative; border: 1px solid rgba(59, 130, 246, 0.1);
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        .status-dot {
          position: absolute; bottom: -2px; right: -2px; width: 12px; height: 12px;
          border-radius: 50%; background: #10b981; border: 2px solid #fff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .badge-modern {
          display: inline-flex; align-items: center; padding: 6px 12px; border-radius: 10px;
          font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;
        }
        .badge-blue { background: rgba(59, 130, 246, 0.08); color: var(--accent); border: 1px solid rgba(59, 130, 246, 0.15); }
        .badge-green { background: rgba(16, 185, 129, 0.08); color: var(--emerald); border: 1px solid rgba(16, 185, 129, 0.15); }
        .text-muted { font-size: 12px; font-weight: 600; color: var(--slate-light); font-style: italic; }
        .btn-icon {
          width: 36px; height: 36px; border-radius: 10px; border: none; cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-icon:hover { transform: translateY(-2px); }
        .btn-icon-edit { background: #fff; color: var(--slate); border: 1.5px solid var(--border); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .btn-icon-edit:hover { background: var(--midnight); color: #fff; border-color: var(--midnight); }
        .btn-icon-save { background: var(--emerald); color: #fff; box-shadow: 0 4px 10px rgba(16,185,129,0.2); }
        .btn-icon-cancel { background: #fee2e2; color: #ef4444; border: 1.5px solid #fecaca; }
        .btn-icon-locked { background: #fee2e2; color: #ef4444; border: 1.5px solid #fecaca; }
        .btn-icon-unlock { background: #f0fdf4; color: #16a34a; border: 1.5px solid #bbfcce; }
        .row-editing { background: #f8fafc !important; box-shadow: inset 4px 0 0 var(--accent); }
      `}</style>
    </div>
  );
}

function DesignationsTab() {
  const [items, setItems] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    getDesignations().then(setItems).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createDesignation(name, 100);
      setName('');
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 32, alignItems: 'start' }}>
      <div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loading-spinner" /></div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Designation Name</th>
                </tr>
              </thead>
              <tbody>
                {items.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ padding: 8, background: 'rgba(59, 130, 246, 0.08)', borderRadius: 8 }}>
                          <ShieldCheck size={16} color="var(--accent)" />
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--midnight)', fontSize: 14 }}>{d.name}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div style={{ background: '#fff', padding: 24, borderRadius: 20, border: '1px solid var(--border)', boxShadow: '0 10px 25px -10px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 20, color: 'var(--midnight)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Plus size={20} color="var(--accent)" /> New Designation
        </h3>
        <form onSubmit={handleCreate}>
          <div className="field-group">
            <label className="field-label">Name</label>
            <input className="field-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Finance Officer" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', borderRadius: 12, height: 46, fontWeight: 800 }} disabled={creating || !name.trim()}>
            {creating ? 'Adding...' : 'Create Designation'}
          </button>
        </form>
      </div>
    </div>
  );
}

function PersonTypesTab() {
  const [items, setItems] = useState<PersonType[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    getPersonTypes().then(setItems).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createPersonType(name);
      setName('');
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 32, alignItems: 'start' }}>
      <div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loading-spinner" /></div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Category Name</th>
                </tr>
              </thead>
              <tbody>
                {items.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ padding: 8, background: 'rgba(16, 185, 129, 0.08)', borderRadius: 8 }}>
                          <Users size={16} color="var(--emerald)" />
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--midnight)', fontSize: 14 }}>{p.name}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div style={{ background: '#fff', padding: 24, borderRadius: 20, border: '1px solid var(--border)', boxShadow: '0 10px 25px -10px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 20, color: 'var(--midnight)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Plus size={20} color="var(--emerald)" /> New Category
        </h3>
        <form onSubmit={handleCreate}>
          <div className="field-group">
            <label className="field-label">Name</label>
            <input className="field-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Contractual Staff" />
          </div>
          <button type="submit" className="btn btn-emerald" style={{ width: '100%', borderRadius: 12, height: 46, fontWeight: 800 }} disabled={creating || !name.trim()}>
            {creating ? 'Adding...' : 'Create Category'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function OrganizationPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'profiles'|'designations'|'person_types'>('profiles');

  useEffect(() => {
    if (profile && !profile.is_admin) {
      router.replace('/dashboard');
    }
  }, [profile, router]);

  if (!profile || !profile.is_admin) return null;

  return (
    <AppShell title="Organization & Access Management">
      
      {/* Tabs */}
      <div style={{ 
        display: 'flex', gap: 12, marginBottom: 32, padding: '6px', 
        background: '#fff', borderRadius: 20, border: '1px solid var(--border)',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
        width: 'fit-content'
      }}>
        {[
          { id: 'profiles', label: 'Institutional Directory', icon: User, color: 'var(--midnight)', accent: 'var(--accent)' },
          { id: 'designations', label: 'Master Designations', icon: Building, color: 'var(--midnight)', accent: 'var(--accent2)' },
          { id: 'person_types', label: 'Access Categories', icon: Users, color: 'var(--midnight)', accent: 'var(--emerald)' }
        ].map(t => (
          <button 
            key={t.id}
            onClick={() => setTab(t.id as any)}
            style={{ 
              padding: '12px 24px', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800,
              background: tab === t.id ? t.color : 'transparent',
              color: tab === t.id ? '#fff' : 'var(--slate)',
              display: 'flex', alignItems: 'center', gap: 12,
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: tab === t.id ? `0 10px 15px -3px ${t.accent}40` : 'none',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            <t.icon size={18} style={{ opacity: tab === t.id ? 1 : 0.6 }} /> {t.label}
          </button>
        ))}
      </div>

      <div className="tab-animation-container">
        {tab === 'profiles' && <ProfilesTab />}
        {tab === 'designations' && <DesignationsTab />}
        {tab === 'person_types' && <PersonTypesTab />}
      </div>

      <style jsx global>{`
        .tab-animation-container {
          animation: slideUp 0.4s ease-out;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      
    </AppShell>
  );
}
