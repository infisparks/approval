'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { 
  getInstitutes, 
  getInstituteTypes, 
  getDepartments, 
  getAcademicYears, 
  getStudyYears, 
  getFeeCollections, 
  addFeeCollection,
  updateFeeCollection,
  checkFeeCollectionExists
} from '@/lib/api';
import { 
  Institute, 
  InstituteType, 
  Department, 
  AcademicYear, 
  StudyYear, 
  FeeCollection 
} from '@/lib/types';
import { 
  Plus, 
  Search, 
  Filter, 
  ChevronRight, 
  TrendingUp, 
  Users, 
  CreditCard,
  Building2,
  Calendar,
  School,
  Box,
  ArrowRight,
  Calculator,
  Briefcase,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AppShell from '@/components/AppShell';


export default function CollectionManagement() {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [instituteTypes, setInstituteTypes] = useState<InstituteType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [studyYears, setStudyYears] = useState<StudyYear[]>([]);
  const [collections, setCollections] = useState<FeeCollection[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FeeCollection | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters & Form State
  const [filters, setFilters] = useState({
    institute_id: '',
    institute_type_id: '',
    department_id: '',
    academic_year_id: '',
    study_year_id: ''
  });

  const [formData, setFormData] = useState({
    institute_id: '',
    institute_type_id: '',
    department_id: '',
    academic_year_id: '',
    study_year_id: '',
    total_students: 0,
    amount_per_student: 0
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadCollections();
  }, [filters]);

  const loadInitialData = async () => {
    try {
      const [insts, types, depts, ays, sys] = await Promise.all([
        getInstitutes(),
        getInstituteTypes(),
        getDepartments(),
        getAcademicYears(),
        getStudyYears()
      ]);
      setInstitutes(insts);
      setInstituteTypes(types);
      setDepartments(depts);
      setAcademicYears(ays);
      setStudyYears(sys);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCollections = async () => {
    try {
      const data = await getFeeCollections(filters);
      setCollections(data);
    } catch (error) {
      console.error('Error loading collections:', error);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Check for duplicates
      const existingId = await checkFeeCollectionExists({
        institute_id: formData.institute_id,
        institute_type_id: formData.institute_type_id,
        department_id: formData.department_id,
        academic_year_id: formData.academic_year_id,
        study_year_id: formData.study_year_id
      });

      if (existingId && (!editingItem || existingId !== editingItem.id)) {
        alert('An entry for this combination (Academic Year, School, Department, and Study Year) already exists. Please edit the existing entry instead.');
        setIsSubmitting(false);
        return;
      }

      if (editingItem) {
        await updateFeeCollection(editingItem.id, formData);
      } else {
        await addFeeCollection(formData);
      }
      setShowAddModal(false);
      setEditingItem(null);
      setFormData({
        institute_id: '',
        institute_type_id: '',
        department_id: '',
        academic_year_id: '',
        study_year_id: '',
        total_students: 0,
        amount_per_student: 0
      });
      loadCollections();
    } catch (error) {
      console.error('Error saving collection:', error);
      alert('Failed to save entry. Please check all fields.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: FeeCollection) => {
    setEditingItem(item);
    setFormData({
      institute_id: item.institute_id,
      institute_type_id: item.institute_type_id,
      department_id: item.department_id,
      academic_year_id: item.academic_year_id,
      study_year_id: item.study_year_id,
      total_students: item.total_students,
      amount_per_student: item.amount_per_student
    });
    setShowAddModal(true);
  };

  const filteredInstituteTypes = instituteTypes.filter(t => !formData.institute_id || t.institute_id === formData.institute_id);
  const filteredDepartments = departments.filter(d => !formData.institute_type_id || d.institute_type_id === formData.institute_type_id);

  const totalRevenue = collections.reduce((acc, curr) => acc + (curr.total_students * curr.amount_per_student), 0);
  const totalStudents = collections.reduce((acc, curr) => acc + curr.total_students, 0);

  return (
    <AppShell 
      title="Fee Collection Management"
      actions={
        <button 
          className="topbar-btn" 
          style={{ background: 'var(--accent)', color: 'white', padding: '8px 20px' }} 
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={16} /> Add Entry
        </button>
      }
    >
      <div className="admin-page" style={{ padding: 0 }}>
        {/* Stats Cards */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: 24 }}>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="stat-card"
          >
            <div className="stat-icon" style={{ background: 'rgba(30,27,75,0.1)' }}>
              <TrendingUp size={24} color="#1e1b4b" />
            </div>
            <div className="stat-info">
              <span className="stat-label" style={{ color: 'black', fontWeight: 600 }}>Total Projected Revenue</span>
              <span className="stat-value" style={{ color: 'black' }}>₹{totalRevenue.toLocaleString('en-IN')}</span>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="stat-card"
          >
            <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)' }}>
              <Users size={24} color="#10b981" />
            </div>
            <div className="stat-info">
              <span className="stat-label" style={{ color: 'black', fontWeight: 600 }}>Total Students Enrolled</span>
              <span className="stat-value" style={{ color: 'black' }}>{totalStudents.toLocaleString()}</span>
            </div>
          </motion.div>

        </div>

        {/* Filters Section */}
        <div className="card" style={{ marginBottom: 24, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Filter size={18} color="var(--primary)" />
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Advanced Bifurcation Filters</h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 15 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ color: 'black', fontWeight: 600 }}>Academic Year</label>
              <select 
                value={filters.academic_year_id} 
                onChange={(e) => setFilters({...filters, academic_year_id: e.target.value})}
                className="form-select"
              >
                <option value="">All Academic Years</option>
                {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ color: 'black', fontWeight: 600 }}>School (Institute Type)</label>
              <select 
                value={filters.institute_type_id} 
                onChange={(e) => setFilters({...filters, institute_type_id: e.target.value})}
                className="form-select"
              >
                <option value="">All Schools</option>
                {instituteTypes.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ color: 'black', fontWeight: 600 }}>Department</label>
              <select 
                value={filters.department_id} 
                onChange={(e) => setFilters({...filters, department_id: e.target.value})}
                className="form-select"
              >
                <option value="">All Departments</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ color: 'black', fontWeight: 600 }}>Year of Study</label>
              <select 
                value={filters.study_year_id} 
                onChange={(e) => setFilters({...filters, study_year_id: e.target.value})}
                className="form-select"
              >
                <option value="">All Years</option>
                {studyYears.map(sy => <option key={sy.id} value={sy.id}>{sy.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Collection List */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Revenue Bifurcation Breakdown</h2>
            <span style={{ fontSize: '12px', color: 'black' }}>Showing {collections.length} entries</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Academic Year</th>
                  <th>School & Department</th>
                  <th>Admission Year</th>
                  <th>Students</th>
                  <th>Avg. Fee</th>
                  <th>Total Revenue</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {collections.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      No collection data found. Add your first entry to start tracking.
                    </td>
                  </tr>
                ) : (
                  collections.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Calendar size={14} color="var(--primary)" />
                          <span style={{ fontWeight: 600 }}>{c.academic_years?.name}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>{c.departments?.name}</span>
                          <span style={{ fontSize: '11px', color: 'black' }}>{c.institute_types?.name}</span>
                        </div>
                      </td>
                      <td>
                        <div className="badge" style={{ background: 'rgba(15,23,42,0.05)', color: '#0f172a' }}>
                          {c.study_years?.name}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Users size={14} color="#64748b" />
                          <span>{c.total_students}</span>
                        </div>
                      </td>
                      <td>₹{c.amount_per_student.toLocaleString('en-IN')}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--emerald)' }}>
                          ₹{(c.total_students * c.amount_per_student).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td>
                        <button 
                          onClick={() => handleEdit(c)}
                          className="btn-icon" 
                          style={{ color: 'var(--primary)', background: 'rgba(37,99,235,0.1)' }}
                        >
                          <Edit2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 1000 }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="card" 
              style={{ width: '100%', maxWidth: '600px', margin: '20px', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div style={{ padding: '25px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ padding: 8, background: 'rgba(37,99,235,0.1)', borderRadius: 8 }}>
                    {editingItem ? <Edit2 size={20} color="var(--primary)" /> : <Plus size={20} color="var(--primary)" />}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{editingItem ? 'Edit' : 'Add'} Collection Data</h2>
                    <p style={{ fontSize: '12px', color: 'black', margin: 0 }}>Define student count and fee structure</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItem(null);
                  }}
                  style={{ background: 'rgba(0,0,0,0.05)', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer' }}
                >
                  <ArrowRight size={18} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} style={{ padding: '25px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="form-group">
                    <label>Institute</label>
                    <select 
                      required
                      value={formData.institute_id} 
                      onChange={(e) => setFormData({...formData, institute_id: e.target.value, institute_type_id: '', department_id: ''})}
                      className="form-select"
                    >
                      <option value="">Select Institute</option>
                      {institutes.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>School (Institute Type)</label>
                    <select 
                      required
                      disabled={!formData.institute_id}
                      value={formData.institute_type_id} 
                      onChange={(e) => setFormData({...formData, institute_type_id: e.target.value, department_id: ''})}
                      className="form-select"
                    >
                      <option value="">Select School</option>
                      {filteredInstituteTypes.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Department</label>
                    <select 
                      required
                      disabled={!formData.institute_type_id}
                      value={formData.department_id} 
                      onChange={(e) => setFormData({...formData, department_id: e.target.value})}
                      className="form-select"
                    >
                      <option value="">Select Department</option>
                      {filteredDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Academic Year</label>
                    <select 
                      required
                      value={formData.academic_year_id} 
                      onChange={(e) => setFormData({...formData, academic_year_id: e.target.value})}
                      className="form-select"
                    >
                      <option value="">Select Acedemic Year</option>
                      {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Study Year</label>
                    <select 
                      required
                      value={formData.study_year_id} 
                      onChange={(e) => setFormData({...formData, study_year_id: e.target.value})}
                      className="form-select"
                    >
                      <option value="">Select Study Year</option>
                      {studyYears.map(sy => <option key={sy.id} value={sy.id}>{sy.name}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Total Students</label>
                    <input 
                      type="number" 
                      required
                      min="1"
                      placeholder="e.g. 60"
                      value={formData.total_students || ''} 
                      onChange={(e) => setFormData({...formData, total_students: parseInt(e.target.value)})}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Amount Per Student (Annual Fee)</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: '#64748b' }}>₹</span>
                      <input 
                        type="number" 
                        required
                        min="0"
                        style={{ paddingLeft: '30px' }}
                        placeholder="e.g. 125000"
                        value={formData.amount_per_student || ''} 
                        onChange={(e) => setFormData({...formData, amount_per_student: parseFloat(e.target.value)})}
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Estimate Preview */}
                <div style={{ marginTop: 10, padding: 15, borderRadius: 12, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#065f46', fontWeight: 600 }}>Projected Year Collection</span>
                    <span style={{ fontSize: '18px', color: '#047857', fontWeight: 800 }}>
                      ₹{(formData.total_students * formData.amount_per_student).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 30, display: 'flex', gap: 12 }}>
                  <button 
                    type="button" 
                    className="btn-outline" 
                    style={{ flex: 1 }} 
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingItem(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-accent" style={{ flex: 2 }} disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editingItem ? 'Update Collection Entry' : 'Submit Collection Entry'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
