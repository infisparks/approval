'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, Building, GraduationCap, BadgeCheck, ShieldCheck, ArrowLeft } from 'lucide-react';
import { signUp, getDepartments, getDesignations, getInstitutes, getInstituteTypes } from '@/lib/api';
import { Department, Designation, Institute, InstituteType } from '@/lib/types';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: '', email: '', password: '',
    departmentId: '', designationId: '',
    instituteId: '', instituteTypeId: '',
  });
  const [depts, setDepts] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [instTypes, setInstTypes] = useState<InstituteType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getDepartments(), getDesignations(), getInstitutes(), getInstituteTypes()]).then(([d, des, ins, it]) => {
      setDepts(d); setDesignations(des); setInstitutes(ins); setInstTypes(it);
      // Auto-select AIKTC if it's the only one
      if (ins.length === 1) setForm(f => ({ ...f, instituteId: ins[0].id }));
    });
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.departmentId || !form.designationId || !form.instituteTypeId || !form.instituteId) {
      setError('Please fill in all required fields'); return;
    }
    setLoading(true);
    try {
      await signUp(form.email, form.password, form.fullName, form.designationId, form.departmentId, form.instituteId, form.instituteTypeId);
      router.replace('/login');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ alignItems: 'flex-start', paddingTop: 40 }}>
      <div className="auth-orb" style={{ width: 350, height: 350, background: '#3B82F6', top: -80, right: -80 }} />
      <div className="auth-orb" style={{ width: 300, height: 300, background: '#6366F1', bottom: -100, left: -60 }} />

      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div style={{ marginBottom: 28 }}>
          <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', marginBottom: 24 }}>
            <ArrowLeft size={14} /> Back to Login
          </Link>
          <div className="auth-logo">
            <div className="auth-logo-icon"><ShieldCheck size={26} color="#fff" /></div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>ApproveIt</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 2 }}>AIKTC PORTAL</div>
            </div>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: -1, marginBottom: 6 }}>Create Account</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>Join the college approval system.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="auth-input-wrap" style={{ marginBottom: 12 }}>
            <User size={15} className="auth-input-icon" style={{ top: 14, transform: 'none' }} />
            <input type="text" className="auth-input" style={{ marginBottom: 0 }} placeholder="Full Name" value={form.fullName} onChange={set('fullName')} required />
          </div>
          <div className="auth-input-wrap" style={{ marginBottom: 12 }}>
            <Mail size={15} className="auth-input-icon" style={{ top: 14, transform: 'none' }} />
            <input type="email" className="auth-input" style={{ marginBottom: 0 }} placeholder="Email Address" value={form.email} onChange={set('email')} required />
          </div>
          <div className="auth-input-wrap" style={{ marginBottom: 12 }}>
            <Lock size={15} className="auth-input-icon" style={{ top: 14, transform: 'none' }} />
            <input type="password" className="auth-input" style={{ marginBottom: 0 }} placeholder="Password" value={form.password} onChange={set('password')} required />
          </div>

          <div className="auth-input-wrap" style={{ marginBottom: 12 }}>
            <Building size={15} className="auth-input-icon" style={{ top: 14, transform: 'none' }} />
            <select className="auth-select" style={{ marginBottom: 0 }} value={form.departmentId} onChange={set('departmentId')} required>
              <option value="">Select Department</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="auth-input-wrap" style={{ marginBottom: 12 }}>
            <BadgeCheck size={15} className="auth-input-icon" style={{ top: 14, transform: 'none' }} />
            <select className="auth-select" style={{ marginBottom: 0 }} value={form.designationId} onChange={set('designationId')} required>
              <option value="">Select Designation</option>
              {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="auth-input-wrap" style={{ marginBottom: 12 }}>
            <Building size={15} className="auth-input-icon" style={{ top: 14, transform: 'none' }} />
            <select className="auth-select" style={{ marginBottom: 0 }} value={form.instituteId} onChange={set('instituteId')} required>
              <option value="">Select Institute</option>
              {institutes.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>

          <div className="auth-input-wrap" style={{ marginBottom: 24 }}>
            <GraduationCap size={15} className="auth-input-icon" style={{ top: 14, transform: 'none' }} />
            <select className="auth-select" style={{ marginBottom: 0 }} value={form.instituteTypeId} onChange={set('instituteTypeId')} required>
              <option value="">Select Institute Type</option>
              {instTypes.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
            </select>
          </div>

          <button type="submit" className="auth-btn" disabled={loading} id="register-submit">
            {loading ? (
              <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            ) : 'Create Account'}
          </button>
        </form>

        <div className="auth-link">Already have an account? <Link href="/login">Sign In</Link></div>
      </div>
    </div>
  );
}
