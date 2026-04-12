# Roadmap

## Near-Term

- add Google OAuth
- decide whether Apple OAuth is worth the setup cost
- add Cloudflare Turnstile on signup
- continue public performance tuning
- tighten public/internal docs

## Medium-Term

- move shared rate limiting to Redis/Upstash if traffic grows
- improve analytics instrumentation around marketplace actions
- expand creator payout and operations tooling
- add richer search if the catalog grows large enough

## Guardrails

- no rebuilds unless a system is clearly blocking progress
- preserve SEO and public route stability
- prefer small, reversible, production-safe changes
