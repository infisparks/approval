'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ShieldCheck, ShieldAlert, Loader2, Calendar, User, Building, FileText, CheckCircle2, IndianRupee } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ApprovalRequest } from '@/lib/types';

export default function VerificationPage() {
  const params = useParams();
  const id = params?.id as string;
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyDoc() {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('approval_requests')
          .select(`
            *,
            profiles!requester_id (
              full_name, 
              role, 
              departments (name), 
              institutes (name)
            ),
            cells (name),
            request_approvals (
              *,
              profiles (
                full_name, 
                designations (name)
              )
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setRequest(data);
      } catch (err: any) {
        console.error('Verification failed:', err);
        setError(err.message || 'Invalid or tampered document identifier');
      } finally {
        setLoading(false);
      }
    }
    verifyDoc();
  }, [id]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0F1E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 className="animate-spin" size={48} color="#3B82F6" style={{ margin: '0 auto 20px' }} />
          <p style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: 1 }}>AUTHENTICATING DIGITAL SIGNATURES...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0A0F1E 0%, #131C35 100%)', padding: '40px 20px' }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        {/* Verification Status Header */}
        <div style={{ 
          background: error ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
          border: `1px solid ${error ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
          borderRadius: 24, padding: 40, textAlign: 'center', marginBottom: 24, backdropFilter: 'blur(10px)'
        }}>
          {error ? (
            <>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <ShieldAlert size={40} color="#EF4444" />
              </div>
              <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 900, margin: '0 0 10px', letterSpacing: '-0.5px' }}>Authentication Failed</h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 500 }}>The scanned digital fingerprint does not match any official AikTC Cluster record.</p>
            </>
          ) : (
            <>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <ShieldCheck size={40} color="#10B981" />
              </div>
              <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 900, margin: '0 0 10px', letterSpacing: '-0.5px' }}>Verified Authentic</h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 500 }}>This document is a certified digital record, authorized by the institutional ledger.</p>
            </>
          )}
        </div>

        {request && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 28, overflow: 'hidden', backdropFilter: 'blur(16px)', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '32px 40px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 10, fontWeight: 900, color: '#3B82F6', letterSpacing: 2.5, textTransform: 'uppercase' }}>Certificate Authentication</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 800 }}>ID: {request.id.slice(-10).toUpperCase()}</span>
              </div>
              <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: 0, lineHeight: 1.4, letterSpacing: '-0.2px' }}>{request.title}</h2>
            </div>

            <div style={{ padding: 40 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'min-content 1fr', gap: '32px 24px' }}>
                <Building size={20} color="#3B82F6" style={{ marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 1 }}>Institutional Source</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>{request.profiles?.institutes?.name || 'AIKTC ADMINISTRATIVE CENTRAL'}</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2, fontWeight: 500 }}>{request.cells?.name || 'Authorized Oversight Cell'}</p>
                </div>

                <User size={20} color="#3B82F6" style={{ marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 1 }}>Originating Authority</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>{request.profiles?.full_name}</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2, fontWeight: 500 }}>{request.profiles?.departments?.name} • {request.profiles?.role?.toUpperCase()}</p>
                </div>

                <IndianRupee size={20} color="#10B981" style={{ marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: 10, fontWeight: 800, color: '#10B981', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 1 }}>Financial Reconciliation</p>
                  <p style={{ fontSize: 22, fontWeight: 950, color: '#10B981', letterSpacing: '-0.5px' }}>{request.has_amount ? `₹${request.amount?.toLocaleString('en-IN')}` : 'NO DIRECT OUTLAY'}</p>
                </div>

                <Calendar size={20} color="#3B82F6" style={{ marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 1 }}>Audit Timestamp</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>{new Date(request.created_at).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>
                </div>
              </div>

              <div style={{ marginTop: 48, paddingTop: 40, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 20 }}>Authorized Digital Signatories</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {request.request_approvals?.filter((a: any) => a.status === 'approved').map((app: any, idx: number) => (
                    <div key={idx} style={{ 
                      display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', 
                      background: 'rgba(255,255,255,0.015)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)',
                      transition: 'all 0.2s'
                    }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyCenter: 'center', flexShrink: 0 }}>
                        <CheckCircle2 size={18} color="#10B981" />
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0 }}>{app.profiles?.full_name}</p>
                        <p style={{ fontSize: 10, color: 'rgba(16,185,129,0.8)', fontWeight: 800, textTransform: 'uppercase', marginTop: 1 }}>{app.profiles?.designations?.name || 'OFFICIATING AUTHORITY'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding: '24px 40px', background: 'rgba(16,185,129,0.05)', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: '#10B981', letterSpacing: 1.2 }}>INSTITUTIONAL REPOSITORY VALIDATED</p>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: 600 }}>AikTC Cluster Document Verification Protocol v3.1.2 • Secured Encryption System</p>
        </div>
      </div>
    </div>
  );
}
