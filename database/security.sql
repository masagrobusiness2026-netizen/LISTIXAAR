create index if not exists idx_users_email on users(email);
create index if not exists idx_payment_provider_ref
on payment_transactions(provider, provider_reference);
