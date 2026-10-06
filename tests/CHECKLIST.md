# LISTIXAAR V9 — tests

## Authentication
- [ ] Weak/invalid passwords rejected
- [ ] Duplicate email rejected
- [ ] Wrong password rejected
- [ ] Protected endpoints reject missing/invalid tokens

## Abjad
- [ ] 28 official letters
- [ ] Repeated letters counted
- [ ] Unknown characters ignored
- [ ] Reduction by 12 verified against approved examples

## زوج
- [ ] Four names accepted
- [ ] Totals verified against approved examples
- [ ] User data isolation verified

## Premium/payment
- [ ] No Premium without active subscription
- [ ] Browser cannot mark payment as paid
- [ ] Webhook signature verified
- [ ] Merchant secret never reaches browser

## Production
- [ ] HTTPS
- [ ] PostgreSQL backups
- [ ] Rate limiting
- [ ] Security headers
- [ ] No passwords/secrets in logs
