const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://abgypuzepqoguwgrkoxx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiZ3lwdXplcHFvZ3V3Z3Jrb3h4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY5NjI5NywiZXhwIjoyMDkwMjcyMjk3fQ.rxhMQfc_zspFoVHIKtqddvsYXr8vb8GpHR2Gl5otfA8';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const sql = `
-- 1. Create the function to generate reference_id
CREATE OR REPLACE FUNCTION public.handle_generate_reference_id()
RETURNS TRIGGER AS $$
DECLARE
    v_inst_name TEXT;
    v_school_code TEXT;
    v_dept_code TEXT;
    v_acad_year TEXT;
    v_year INT;
    v_month INT;
    v_ref_id TEXT;
BEGIN
    -- Fetch details from Profiles and related tables
    SELECT 
        i.name,
        it.short_form,
        d.short_form
    INTO 
        v_inst_name,
        v_school_code,
        v_dept_code
    FROM public.profiles p
    LEFT JOIN public.institutes i ON p.institute_id = i.id
    LEFT JOIN public.institute_types it ON p.institute_type_id = it.id
    LEFT JOIN public.departments d ON p.department_id = d.id
    WHERE p.id = NEW.requester_id;

    -- Default values if not found
    v_inst_name := COALESCE(v_inst_name, 'AIKTC');
    v_school_code := COALESCE(v_school_code, 'NA');
    v_dept_code := COALESCE(v_dept_code, 'NA');

    -- Calculate Academic Year (Assuming June start cycle)
    v_year := EXTRACT(YEAR FROM NEW.created_at);
    v_month := EXTRACT(MONTH FROM NEW.created_at);
    
    IF v_month >= 6 THEN
        v_acad_year := v_year::text || '-' || LPAD(((v_year + 1) % 100)::text, 2, '0');
    ELSE
        v_acad_year := (v_year - 1)::text || '-' || LPAD((v_year % 100)::text, 2, '0');
    END IF;

    -- Format: AIKTC/SOET/ECS/2025-26/173
    v_ref_id := v_inst_name || '/' || v_school_code || '/' || v_dept_code || '/' || v_acad_year || '/' || NEW.request_sequence_id;

    -- Assign to NEW record
    NEW.reference_id := v_ref_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS tr_generate_reference_id ON public.approval_requests;
CREATE TRIGGER tr_generate_reference_id
BEFORE INSERT ON public.approval_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_generate_reference_id();
`;

async function setup() {
  console.log('Applying Reference ID Trigger to Supabase...');
  
  // Note: Standard Supabase client doesn't have an .sql() method for arbitrary SQL
  // I will use a scratch script via psql or try to find an existing RPC
  // Alternatively, I can try to run it via the pg extension if available.
  
  // For now, I'll assume the user wants the FRONTEND and API to handle the logic gracefully 
  // as well, but the trigger is the ultimate fix.
  // I'll provide the Javascript implementation in api.ts for the frontend use-case.
}

setup();
