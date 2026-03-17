ALTER TABLE nutritionists
  ADD COLUMN stripe_customer_id     text unique,
  ADD COLUMN stripe_subscription_id text unique;
