const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://abgypuzepqoguwgrkoxx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiZ3lwdXplcHFvZ3V3Z3Jrb3h4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY5NjI5NywiZXhwIjoyMDkwMjcyMjk3fQ.rxhMQfc_zspFoVHIKtqddvsYXr8vb8GpHR2Gl5otfA8';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const DUP_DIRECTOR_ID = '092738fe-4d7d-4082-a9b3-2c1ecd53c5bd';
const MAIN_DIRECTOR_ID = 'e084e90f-1333-4dfd-a8a6-40d8a19c7e99';

async function mergeDirector() {
  console.log('--- Merging Director Designations ---');

  // 1. Update template_steps
  const { data: steps, error: errorSteps } = await supabase
    .from('template_steps')
    .update({ designation_id: MAIN_DIRECTOR_ID })
    .eq('designation_id', DUP_DIRECTOR_ID);
  
  if (errorSteps) console.error('Error updating steps:', errorSteps);
  else console.log('Successfully updated template steps.');

  // 2. Update profiles (just in case)
  const { data: profiles, error: errorProfiles } = await supabase
    .from('profiles')
    .update({ designation_id: MAIN_DIRECTOR_ID })
    .eq('designation_id', DUP_DIRECTOR_ID);
  
  if (errorProfiles) console.error('Error updating profiles:', errorProfiles);
  else console.log('Successfully updated profiles.');

  // 3. Delete duplicate designation
  const { error: errorDelete } = await supabase
    .from('designations')
    .delete()
    .eq('id', DUP_DIRECTOR_ID);
  
  if (errorDelete) console.error('Error deleting duplicate designation:', errorDelete);
  else console.log('Successfully deleted duplicate Director designation.');

  console.log('--- DONE ---');
}

mergeDirector();
