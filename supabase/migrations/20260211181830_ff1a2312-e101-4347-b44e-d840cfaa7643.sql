-- Drop RLS policies first
DROP POLICY IF EXISTS "Users can view their own import jobs" ON import_jobs;
DROP POLICY IF EXISTS "Users can insert their own import jobs" ON import_jobs;
DROP POLICY IF EXISTS "Users can update their own import jobs" ON import_jobs;
DROP POLICY IF EXISTS "import_jobs_select_own" ON import_jobs;
DROP POLICY IF EXISTS "import_jobs_insert_own" ON import_jobs;
DROP POLICY IF EXISTS "import_jobs_update_own" ON import_jobs;
DROP POLICY IF EXISTS "import_jobs_delete_own" ON import_jobs;

-- Drop the table
DROP TABLE IF EXISTS import_jobs;

-- Drop associated enum types if no longer needed
DROP TYPE IF EXISTS import_job_status;
DROP TYPE IF EXISTS import_job_type;