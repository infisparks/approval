'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import AppShell from '@/components/AppShell';
import { 
  getAllDepartmentsAdmin, getInstituteTypes, 
  createDepartment, updateDepartment 
} from '@/lib/api';
import { Department, InstituteType } from '@/lib/types';
import { Building, Plus, Search, Edit2, Check, X, ShieldAlert, GraduationCap } from 'lucide-react';

export default function AdminDepartmentsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  
  const [departments, setDepartments] = useState<any[]>([]);
  const [instituteTypes, setInstituteTypes] = useState<InstituteType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create / Edit state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [instituteTypeId, setInstituteTypeId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile && !profile.is_admin) {
      router.replace('/dashboard');
    }
  }, [profile, router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [deps, types] = await Promise.all([
        getAllDepartmentsAdmin(),
        getInstituteTypes()
      ]);
      setDepartments(deps);
      setInstituteTypes(types);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.is_admin) {
      loadData();
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !instituteTypeId) {
      setError('Please fill all fields');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      if (editingId) {
        await updateDepartment(editingId, name, instituteTypeId);
      } else {
        await createDepartment(name, instituteTypeId);
      }
      await loadData();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (dep: any) => {
    setEditingId(dep.id);
    setName(dep.name);
    setInstituteTypeId(dep.institute_type_id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName('');
    setInstituteTypeId('');
    setError('');
  };

  if (!profile || !profile.is_admin) return null;

  const filtered = departments.filter(d => 
    d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.institute_types?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppShell title="Departments Management">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 32, alignItems: 'start' }}>
        
        {/* Left Side: Directory */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-light)' }} />
              <input
                className="field-input"
                style={{ paddingLeft: 42, marginBottom: 0 }}
                placeholder="Search departments..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            {!showForm && (
              <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ gap: 8 }}>
                <Plus size={18} /> New Department
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="loading-spinner" /></div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Department Name</th>
                    <th>Institutional Home</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(d => (
                    <tr key={d.id} className={editingId === d.id ? 'row-editing' : ''}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59,130,246,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Building size={16} color="var(--accent)" />
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--midnight)' }}>{d.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--slate-light)', fontWeight: 600 }}>Active Department</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="badge-modern badge-blue">
                             {d.institute_types?.name || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn-icon btn-icon-edit" onClick={() => startEdit(d)}>
                          <Edit2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--slate)' }}>
                        <ShieldAlert size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
                        <div style={{ fontWeight: 700 }}>No departments found</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Sidebar Form */}
        <aside style={{ position: 'sticky', top: 24 }}>
          {showForm ? (
            <div className="admin-card-sidebar">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--midnight)', margin: 0 }}>
                  {editingId ? 'Edit Dept.' : 'New Dept.'}
                </h3>
                <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-light)' }}>
                  <X size={20} />
                </button>
              </div>

              {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="field-group">
                  <label className="field-label">Department Name</label>
                  <input 
                    className="field-input" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="e.g. Computer Engineering"
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Institutional Home</label>
                  <select 
                    className="field-input" 
                    value={instituteTypeId} 
                    onChange={e => setInstituteTypeId(e.target.value)}
                  >
                    <option value="">Select Institute Type</option>
                    {instituteTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', height: 48, borderRadius: 12, fontWeight: 800, marginTop: 12 }}
                  disabled={submitting}
                >
                  {submitting ? 'Processing...' : editingId ? 'Update Department' : 'Create Department'}
                </button>
              </form>
            </div>
          ) : (
            <div className="admin-card-sidebar" style={{ background: 'linear-gradient(135deg, var(--midnight), var(--navy-light))', color: '#fff', border: 'none' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <GraduationCap size={22} color="var(--gold)" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 12 }}>Departmental Policy</h3>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                Departments are high-level organizational units. Once created, they cannot be deleted to maintain request integrity. You can however edit their metadata.
              </p>
            </div>
          )}
        </aside>

      </div>

      <style jsx>{`
        .admin-card-sidebar {
          background: #fff;
          padding: 24px;
          border-radius: 20px;
          border: 1px solid var(--border);
          box-shadow: 0 10px 25px -10px rgba(0,0,0,0.05);
        }
        .btn-icon {
          width: 36px; height: 36px; border-radius: 10px; border: none; cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s;
        }
        .btn-icon-edit { background: #fff; color: var(--slate); border: 1.5px solid var(--border); }
        .btn-icon-edit:hover { background: var(--midnight); color: #fff; border-color: var(--midnight); }
        
        .badge-modern {
          display: inline-flex; align-items: center; padding: 6px 12px; border-radius: 10px;
          font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;
        }
        .badge-blue { background: rgba(59, 130, 246, 0.08); color: var(--accent); border: 1px solid rgba(59, 130, 246, 0.15); }
        
        .row-editing { background: #f8fafc !important; box-shadow: inset 4px 0 0 var(--accent); }
      `}</style>
    </AppShell>
  );
}
