# Security Guidelines

## Environment Variables

This application relies on environment variables for sensitive configuration. 

**Setup:**
1. Copy `.env.example` to `.env`
2. Fill in your specific values

**Best Practices:**
- NEVER commit `.env` files to version control.
- Ensure `.gitignore` includes `.env` and `.env.*.local`.
- Use `VITE_` prefix only for variables that MUST be exposed to the client browser.

## Supabase Credentials

- **Anon Key (Public):** It is safe to expose the `VITE_SUPABASE_ANON_KEY` in the frontend, provided your Supabase RLS (Row Level Security) policies are correctly configured.
- **Service Role Key (Secret):** NEVER use the service_role key in this frontend application. If you need admin privileges, use Supabase Edge Functions.

## Sensitive Data Handling

- **Console Logs:** Do not leave `console.log` statements that print entire user objects, session tokens, or API responses in production code.
- **Local Storage:** Avoid storing sensitive personal information (PII) directly in localStorage. Supabase handles session storage securely by default.
- **Error Messages:** Ensure UI error messages do not reveal stack traces or database structure to the user.

## Incident Response

If you suspect keys have been compromised:
1. Go to Supabase Dashboard -> Project Settings -> API.
2. Rotate your API keys immediately.
3. Update your `.env` file with new keys.
4. Redeploy the application.


<=====================================================================================>
Create More Users
Another View-Only Admin:
-- First create user in dashboard, then run:
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin_view"}'::jsonb
WHERE email = 'newuser@example.com';

Full Admin (Can Edit Everything):
-- First create user in dashboard, then run:
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'admin@example.com';


UPDATE auth.users
SET raw_user_meta_data =
  jsonb_set(
    jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{display_name}',
      '"Ciza PK"'::jsonb
    ),
    '{role}',
    '"admin_view"'::jsonb
  )
WHERE email = 'cizapk@dataversedynamics.org';
<=====================================================================================>

To change user roles in Supabase, you need to update the app_metadata field in the auth.users table. Here's how:

SQL Commands to Change Roles
Option 1: Change to view-only admin (admin_view)
UPDATE auth.users 
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin_view"}'::jsonb 
WHERE email = 'user@example.com';


Option 2: Change to full admin (admin)
UPDATE auth.users 
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb 
WHERE email = 'user@example.com';



Option 3: Remove role completely (user won't have admin access)
UPDATE auth.users 
SET raw_app_meta_data = raw_app_meta_data - 'role'
WHERE email = 'user@example.com';


SELECT user_id, email, display_name, role, created_at FROM admin_users;


Steps to Apply:
1. Open Supabase Dashboard → SQL Editor → New Query
2. Paste one of the SQL commands above
3. Replace 'user@example.com' with the actual user email
4. Click Run
5. The user must log out and log back in for the role change to take effect (JWT needs to refresh)

Verify the Change:
SELECT email, raw_app_meta_data->>'role' as role 
FROM auth.users 
WHERE email = 'user@example.com';


This will show you the current role for that user
<=====================================================================================>
Alternative: If you want to see ALL admin users and their roles at once:

SELECT 
  email, 
  raw_app_meta_data->>'role' as role,
  created_at
FROM auth.users 
WHERE raw_app_meta_data->>'role' IN ('admin', 'admin_view')
   OR email LIKE '%admin%'
ORDER BY created_at DESC;
<=====================================================================================>
-- Set all existing admins to full admin role
UPDATE auth.users 
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb 
WHERE email IN (
  'ahbhinder@dataversedynamics.org',
  'another-admin@example.com'
);
<=====================================================================================>