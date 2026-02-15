-- Migration 004: Fix infinite recursion in profiles RLS policy
-- The "Admins read all profiles" policy queries the profiles table itself,
-- which triggers the same RLS policy, causing infinite recursion.

-- Step 1: Create a SECURITY DEFINER function that bypasses RLS to check admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 2: Drop the recursive policy
DROP POLICY IF EXISTS "Admins read all profiles" ON profiles;

-- Step 3: Recreate it using the helper function (no recursion)
CREATE POLICY "Admins read all profiles" ON profiles FOR SELECT USING (
  public.is_admin()
);

-- Step 4: Also fix the jobs policies that reference profiles directly
-- (These don't cause recursion since they're on a different table,
--  but they'll be more efficient using the function)
DROP POLICY IF EXISTS "Creators and admins can update jobs" ON jobs;
CREATE POLICY "Creators and admins can update jobs" ON jobs FOR UPDATE USING (
  auth.uid() = created_by OR public.is_admin()
);

DROP POLICY IF EXISTS "Creators and admins can delete jobs" ON jobs;
CREATE POLICY "Creators and admins can delete jobs" ON jobs FOR DELETE USING (
  auth.uid() = created_by OR public.is_admin()
);
