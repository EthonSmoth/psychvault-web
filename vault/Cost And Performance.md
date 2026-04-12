# Cost And Performance

## Goal

Make anonymous traffic cheap and reserve dynamic compute for account and money flows.

## Current Direction

- cached public resource and store browse
- denormalized public file-state for cheaper cards
- static-safe public shell
- signed storage downloads
- trimmed public query payloads
- sitemap and metadata cleanup

## Dynamic Surfaces That Should Stay Dynamic

- auth
- signup/login/verification
- checkout
- protected downloads
- creator dashboard
- admin dashboard
- uploads
- webhooks

## Ongoing Follow-Ups

- keep public browse APIs paginated and capped
- keep metadata generation from duplicating DB work
- avoid session and user lookups on anonymous page renders
- monitor nav/session and viewer APIs for unnecessary database touches
