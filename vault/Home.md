# PsychVault Vault

This folder is the tracked project knowledge base for the current codebase.

## Start Here

- [[Architecture]]
- [[Auth And Account Security]]
- [[Cost And Performance]]
- [[Deployment And Infra]]
- [[OAuth And Captcha Research]]
- [[Product Model]]
- [[Roadmap]]

## Purpose

Use this vault as the fast-context layer for the live app:

- what the product does now
- how the production stack is wired
- where trust, moderation, auth, and storage decisions currently sit
- what is already shipped versus still on the roadmap

## Current Product Summary

PsychVault currently includes:

- public SEO-oriented resource and store browsing
- creator storefronts, creator dashboards, sales, payouts, and analytics
- free and paid digital downloads with protected library access
- reviews, follows, messaging, and reporting
- creator trust scoring plus admin moderation and audit workflows

## Current Technical Direction

- keep anonymous traffic cache-first where possible
- reserve dynamic compute for auth, viewer state, uploads, downloads, messaging, moderation, checkout, and webhooks
- keep the security model server-enforced even when UI state is optimized for speed
- keep storage split between public preview assets and private downloadable assets
- keep docs aligned with shipped behavior, not speculative architecture

## Obsidian Note

- Track the Markdown docs in `vault/`
- Ignore local Obsidian app state in `vault/.obsidian/`
- Do not rely on renaming the folder to `.vault` as a Git strategy; the ignore rule is what matters
