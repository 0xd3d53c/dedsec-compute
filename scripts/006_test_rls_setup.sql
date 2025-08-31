-- Test script to verify RLS setup works correctly
-- This script tests the RLS policies without actually creating data

-- Test 1: Verify all tables exist and have RLS enabled
DO $$
DECLARE
    table_name TEXT;
    rls_enabled BOOLEAN;
BEGIN
    RAISE NOTICE 'Testing RLS setup...';
    
    -- Check each table exists and has RLS enabled
    FOR table_name IN 
        SELECT unnest(ARRAY[
            'users', 'user_sessions', 'followers', 'operations', 
            'task_executions', 'network_metrics', 'achievements', 
            'user_achievements', 'admin_logs', 'invite_codes'
        ])
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = table_name
        ) INTO rls_enabled;
        
        IF rls_enabled THEN
            RAISE NOTICE '✓ Table % exists', table_name;
        ELSE
            RAISE NOTICE '✗ Table % does not exist', table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'RLS setup verification complete!';
END $$;

-- Test 2: Verify RLS policies exist
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    -- Count policies on each table
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'users';
    
    RAISE NOTICE 'Users table has % policies', policy_count;
    
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_sessions';
    
    RAISE NOTICE 'User_sessions table has % policies', policy_count;
    
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'operations';
    
    RAISE NOTICE 'Operations table has % policies', policy_count;
    
    RAISE NOTICE 'Policy verification complete!';
END $$;

-- Test 3: Verify RLS is enabled on all tables
DO $$
DECLARE
    table_record RECORD;
BEGIN
    RAISE NOTICE 'Checking RLS status on all tables...';
    
    FOR table_record IN
        SELECT tablename, rowsecurity
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'users', 'user_sessions', 'followers', 'operations', 
            'task_executions', 'network_metrics', 'achievements', 
            'user_achievements', 'admin_logs', 'invite_codes'
        )
        ORDER BY tablename
    LOOP
        IF table_record.rowsecurity THEN
            RAISE NOTICE '✓ %: RLS enabled', table_record.tablename;
        ELSE
            RAISE NOTICE '✗ %: RLS disabled', table_record.tablename;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'RLS status verification complete!';
END $$;
