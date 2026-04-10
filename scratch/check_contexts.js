const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://abgypuzepqoguwgrkoxx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiZ3lwdXplcHFvZ3V3Z3Jrb3h4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY5NjI5NywiZXhwIjoyMDkwMjcyMjk3fQ.rxhMQfc_zspFoVHIKtqddvsYXr8vb8GpHR2Gl5otfA8';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function check() {
  const { data: steps } = await supabase.from('template_steps').select('context');
  const contexts = [...new Set(steps.map(s => s.context))];
  console.log('Available Contexts in template_steps:', contexts);

  console.log('\n--- Designations and their average context ---');
  const { data: desigSteps } = await supabase.from('template_steps').select('context, designations(name, rank)');
  const stats = {};
  desigSteps.forEach(s => {
    const name = s.designations?.name;
    if (!stats[name]) stats[name] = new Set();
    stats[name].add(s.context);
  });
  console.table(Object.entries(stats).map(([name, ctxs]) => ({ designation: name, contexts: Array.from(ctxs).join(', ') })));
}

check();
