# Roadmap

## Near-Term

- decide whether Apple OAuth is worth the setup cost
- add Cloudflare Turnstile only if signup abuse becomes meaningful
- continue public performance and caching refinement
- keep README, env docs, and vault notes aligned with the actual production app
- tighten Supabase operational documentation and storage hygiene

## Medium-Term

- move shared rate limiting to Redis/Upstash if traffic grows
- improve analytics instrumentation around marketplace actions
- expand creator payout and operations tooling
- revisit richer search if the catalog grows large enough
- consider a stronger server-side session/refresh model if account risk increases

## Guardrails

- no rebuilds unless a system is clearly blocking progress
- preserve SEO and public route stability
- prefer small, reversible, production-safe changes
- keep security work practical and aligned with real risk
