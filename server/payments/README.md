# Payment provider adapter

Merchant credentials belong ONLY on the server:
- PAYMENT_PROVIDER
- MERCHANT_CODE
- MERCHANT_PUBLIC_KEY
- MERCHANT_SECRET_KEY
- PAYMENT_WEBHOOK_SECRET

Never put secret keys in public HTML, browser JavaScript, screenshots, or GitHub.

For real payments, the selected provider's checkout and webhook must be implemented.
Premium must only become active after server-side payment verification.
