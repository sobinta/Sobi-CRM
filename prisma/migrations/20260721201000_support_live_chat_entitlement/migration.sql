-- Live chat is an optional professional-plan capability. Ticket support stays
-- available to every tenant and therefore needs no entitlement flag.
UPDATE "PricingPlan"
SET "entitlements" = CASE
  WHEN "entitlements" @> '["support.live_chat"]'::jsonb THEN "entitlements"
  ELSE "entitlements" || '["support.live_chat"]'::jsonb
END
WHERE "key" IN ('pro', 'team', 'enterprise');
