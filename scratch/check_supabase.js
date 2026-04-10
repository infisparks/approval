const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://abgypuzepqoguwgrkoxx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiZ3lwdXplcHFvZ3V3Z3Jrb3h4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY5NjI5NywiZXhwIjoyMDkwMjcyMjk3fQ.rxhMQfc_zspFoVHIKtqddvsYXr8vb8GpHR2Gl5otfA8';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkData() {
  console.log('--- Checking Supabase Data ---');

  // List some tables
  const { data: tables, error: tableError } = await supabase
    .from('_rpc_tables') // This might not work, let's try a real table
    .select('*')
    .limit(1);

  // Try to list profiles (likely exists)
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .limit(5);

  if (profileError) {
    console.log('Error fetching profiles:', profileError.message);
  } else {
    console.log('Profiles Found:', profiles.length);
    console.table(profiles.map(p => ({ id: p.id, email: p.email, role: p.role, name: p.full_name })));
  }

  // Try to list institutes
  const { data: institutes, error: instError } = await supabase
    .from('institutes')
    .select('*')
    .limit(5);

  if (instError) {
    console.log('Error fetching institutes:', instError.message);
  } else {
    console.log('Institutes Found:', institutes.length);
    console.table(institutes.map(i => ({ id: i.id, name: i.name })));
  }
}

checkData();
