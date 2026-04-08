'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import AppShell from '@/components/AppShell';
import { 
  getAllProfilesAdmin, getDesignations, getPersonTypes, 
  createDesignation, createPersonType, updateProfilePersonType, updateProfileName, updateProfileLockStatus
} from '@/lib/api';
import { UserProfile, Designation, PersonType } from '@/lib/types';
import { ShieldCheck, User, Building, Users, Search, Edit2, Check, X, Info, Plus, Lock, Unlock } from 'lucide-react';

function ProfilesTab() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [personTypes, setPersonTypes] = useState<PersonType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempType, setTempType] = useState<string | null>(null);
  const [tempName, setTempName] = useState<string>('');
  const [updating, setUpdating] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [p, pt] = await Promise.all([getAllProfilesAdmin(), getPersonTypes()]);
    setProfiles(p);
    setPersonTypes(pt);
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
      await Promise.all([
        updateProfilePersonType(profileId, tempType || null),
        updateProfileName(profileId, tempName)
      ]);
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

  const filtered = profiles.filter(p => 
    p.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

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
            onChange={e => setSearch(e.target.value)}
          />
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

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loading-spinner" /></div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Profile Info</th>
                <th>Designation / Dept.</th>
                <th>Institution (Inst. Type)</th>
                <th>Staff Category (Person Type)</th>
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
                          <input 
                            className="field-input" 
                            style={{ marginBottom: 4, height: 32, fontSize: 13, padding: '0 8px', borderRadius: 6, width: '100%', fontWeight: 700 }}
                            value={tempName}
                            onChange={e => setTempName(e.target.value)}
                            disabled={!!updating}
                          />
                        ) : (
                          <div style={{ fontWeight: 800, color: 'var(--midnight)', fontSize: 14 }}>{p.full_name}</div>
                        )}
                        <div style={{ fontSize: 12, color: 'var(--slate)', fontWeight: 500 }}>{p.email}</div>
                      </div>
                    </div>
                  </td>
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
                  <td colSpan={5} style={{ textAlign: 'center', padding: '50px', background: 'var(--surface)' }}>
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
