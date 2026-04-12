# PsychVault Vault

This folder is intended to be opened directly as an Obsidian vault.

## Start Here

- [[Architecture]]
- [[Auth And Account Security]]
- [[Cost And Performance]]
- [[Deployment And Infra]]
- [[OAuth And Captcha Research]]
- [[Product Model]]
- [[Roadmap]]

## Purpose

This vault is the quick-context layer for the current codebase:

- what the app does
- how the production stack is wired
- what security and performance decisions are already in place
- what still remains on the roadmap

## Current Product Summary

PsychVault is a marketplace for psychology and clinician resources with:

- public SEO-oriented resource and store browsing
- creator storefronts and creator dashboards
- free and paid digital downloads
- buyer library, reviews, follows, and messaging
- moderation, reporting, and admin publishing workflows

## Current Technical Direction

- keep anonymous traffic cached/static where possible
- reserve dynamic compute for auth, checkout, dashboards, uploads, downloads, moderation, and webhooks
- prefer incremental production-safe refactors over rewrites
- keep storage split between public preview assets and private downloadable assets
- keep docs aligned with the actual shipped code, not planned work
