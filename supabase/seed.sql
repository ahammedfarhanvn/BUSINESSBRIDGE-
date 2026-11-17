-- ==============================================================================
-- BUSINESSBRIDGE SEED DATA (For local development and testing)
-- ==============================================================================

-- Sample mock profiles (note: in production, auth.users creates profiles via trigger)
-- This seed provides baseline reference data.

DO $$
BEGIN
  -- Safe placeholder seed for reference when testing without production auth
  RAISE NOTICE 'BusinessBridge seed script loaded. Ready for initial development.';
END $$;
