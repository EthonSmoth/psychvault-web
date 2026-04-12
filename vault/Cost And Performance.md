# Cost And Performance

## Goal

Make anonymous traffic cheap and reserve dynamic compute for account, entitlement, and money flows.

## Current Direction

- cache-first public resource and store browse
- static-safe public shell with viewer-specific state fetched separately
- denormalized public file-state for cheaper card and browse queries
- public detail and browse APIs rate-limited to reduce scraping and cost abuse
- signed private download delivery instead of streaming files through app code
- trimmed public query payloads and leaner public serializers
- sitemap and metadata cleanup for better SEO without extra request cost

## Dynamic Surfaces That Should Stay Dynamic

- auth and signup/login/verification
- checkout and webhook fulfilment
- protected downloads and entitlement checks
- creator dashboard
- admin dashboard
- uploads
- messaging and user-specific viewer state

## Ongoing Follow-Ups

- keep public browse APIs paginated and capped
- continue reducing duplicated data work between metadata and page content
- monitor session/nav and viewer APIs for unnecessary database reads
- consider moving shared rate limiting to Redis/Upstash if traffic grows beyond what the main database should absorb
