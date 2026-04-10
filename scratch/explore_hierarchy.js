const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://abgypuzepqoguwgrkoxx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiZ3lwdXplcHFvZ3V3Z3Jrb3h4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY5NjI5NywiZXhwIjoyMDkwMjcyMjk3fQ.rxhMQfc_zspFoVHIKtqddvsYXr8vb8GpHR2Gl5otfA8';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function explore() {
  console.log('--- Designations ---');
  const { data: desigs } = await supabase.from('designations').select('*').order('rank');
  console.table(desigs.map(d => ({ id: d.id, name: d.name, rank: d.rank })));

  console.log('\n--- Template Steps (Sample) ---');
  const { data: steps } = await supabase.from('template_steps').select('*, designations(name)').limit(20);
  console.table(steps.map(s => ({ 
    template: s.template_id, 
    order: s.step_order, 
    designation: s.designations?.name, 
    context: s.context 
  })));

  console.log('\n--- Pharmacy Teachers ---');
  const { data: teachers } = await supabase.from('profiles').select('*, designations(name), departments(name), institutes(name), institute_types(name)')
    .ilike('full_name', '%pharmacy%');
  if (teachers?.length === 0) {
    const { data: anyTeachers } = await supabase.from('profiles').select('*, designations(name), departments(name), institutes(name), institute_types(name)')
      .ilike('email', '%pharmacy%');
    console.table(anyTeachers?.map(t => ({ 
      name: t.full_name, 
      des: t.designations?.name, 
      dept: t.departments?.name, 
      inst: t.institutes?.name,
      inst_type: t.institute_types?.name
    })));
  } else {
    console.table(teachers.map(t => ({ 
      name: t.full_name, 
      des: t.designations?.name, 
      dept: t.departments?.name, 
      inst: t.institutes?.name,
      inst_type: t.institute_types?.name
    })));
  }
}

explore();
