const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://abgypuzepqoguwgrkoxx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiZ3lwdXplcHFvZ3V3Z3Jrb3h4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY5NjI5NywiZXhwIjoyMDkwMjcyMjk3fQ.rxhMQfc_zspFoVHIKtqddvsYXr8vb8GpHR2Gl5otfA8';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function explore() {
  console.log('--- All Departments ---');
  const { data: depts } = await supabase.from('departments').select('*, institute_types(name)');
  console.table(depts.map(d => ({ id: d.id, name: d.name, type: d.institute_types?.name })));

  console.log('\n--- Profiles in Pharmacy (if any) ---');
  const { data: pharmacists } = await supabase.from('profiles').select('*, departments!inner(name), designations(name)')
    .ilike('departments.name', '%pharmacy%');
  console.table(pharmacists.map(p => ({ 
    name: p.full_name, 
    email: p.email,
    des: p.designations?.name, 
    dept: p.departments?.name 
  })));

  console.log('\n--- Who are the HODs/DEANs/DIRECTORs/ACCOUNTANTs? ---');
  const { data: approvers } = await supabase.from('profiles').select('*, designations!inner(name), departments(name), institute_types(name), institutes(name)')
    .in('designations.name', ['HOD', 'DEAN', 'Director', 'DIRECTOR', 'Accountant', 'Admin']);
  console.table(approvers.map(a => ({
    name: a.full_name,
    des: a.designations?.name,
    dept: a.departments?.name,
    inst_type: a.institute_types?.name,
    inst: a.institutes?.name
  })));
}

explore();
