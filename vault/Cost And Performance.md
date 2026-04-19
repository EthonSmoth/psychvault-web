# Cost And Performance

## Goal

Make anonymous traffic cheap and reserve dynamic compute for account, entitlement, moderation, and money flows.

## Current Direction

- cache-first public resource and store browse
- cache-first public detail pages with lean serialized payloads
- store viewer state moved server-side so the page does not flash logged-out follow controls first
- navbar and resource viewer surfaces use loading skeletons instead of incorrect logged-out UI while session/viewer state resolves
- denormalized public file-state for cheaper card and browse queries
- image uploads are optimized before storage for non-main image assets
- signed private download delivery instead of streaming files through app code
- public detail and browse APIs are rate-limited to reduce scraping and cost abuse

## Dynamic Surfaces That Should Stay Dynamic

- auth and signup/login/verification
- checkout and webhook fulfilment
- protected downloads and entitlement checks
- creator dashboard
- admin dashboard
- uploads
- messaging
- user-specific viewer state

## Ongoing Follow-Ups

- continue reducing duplicated work between metadata and page-content queries
- consider moving resource viewer state server-side too if it becomes a real hotspot
- keep session/nav reads lean and avoid unnecessary Prisma lookups
- consider moving shared rate limiting to Redis/Upstash if traffic grows beyond what the main database should absorb
- keep image optimization reliable so oversized uploads do not inflate storage and bandwidth
- maintain CSS utility class extraction to keep HTML markup lean across pages
