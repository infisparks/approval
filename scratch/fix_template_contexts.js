const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://abgypuzepqoguwgrkoxx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiZ3lwdXplcHFvZ3V3Z3Jrb3h4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY5NjI5NywiZXhwIjoyMDkwMjcyMjk3fQ.rxhMQfc_zspFoVHIKtqddvsYXr8vb8GpHR2Gl5otfA8';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixTemplates() {
  console.log('--- Fetching Designations ---');
  const { data: desigs } = await supabase.from('designations').select('*');
  
  const globalNames = ['director', 'accountant', 'admin', 'chairman', 'cfo', 'ceo', 'treasurer', 'vice president', 'president'];
  const instituteNames = ['dean'];
  const departmentalNames = ['hod', 'clerk', 'senior clerk', 'faculty'];

  const updates = [];

  for (const d of desigs) {
    const name = d.name.toLowerCase();
    let targetContext = '';
    
    if (globalNames.includes(name)) targetContext = 'global';
    else if (instituteNames.includes(name)) targetContext = 'institute';
    else if (departmentalNames.some(dn => name.includes(dn))) targetContext = 'departmental';

    if (targetContext) {
      console.log(`Setting context for "${d.name}" to "${targetContext}"`);
      const { data, error } = await supabase
        .from('template_steps')
        .update({ context: targetContext })
        .eq('designation_id', d.id);
      
      if (error) console.error(`Error updating ${d.name}:`, error);
      else console.log(`Updated steps for ${d.name}`);
    }
  }

  console.log('--- DONE ---');
}

fixTemplates();
