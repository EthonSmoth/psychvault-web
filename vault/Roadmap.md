# Roadmap

## Near-Term

- keep public request cost low while preserving strong SEO
- continue tightening viewer-state performance on resource pages and session-dependent UI
- keep README, vault notes, and infra docs aligned with the shipped app
- decide whether Apple OAuth is worth the setup cost
- add Cloudflare Turnstile only if signup abuse becomes meaningful

## Medium-Term

- move shared rate limiting to Redis/Upstash if traffic grows
- improve analytics instrumentation around marketplace actions
- expand creator payout and operations tooling
- revisit richer search if the catalog grows large enough
- consider a stronger server-side session and revocation model if account risk increases

## Guardrails

- no rebuilds unless a system is clearly blocking progress
- preserve SEO and public route stability
- prefer small, reversible, production-safe changes
- keep security work practical and aligned with real risk
- keep docs and operational notes honest about what is already live
