# PsychVault Vault

This folder is intended to be opened directly as an Obsidian vault.

## Start Here

- [[Architecture]]
- [[Auth And Account Security]]
- [[OAuth And Captcha Research]]
- [[Cost And Performance]]
- [[Deployment And Infra]]
- [[Product Model]]
- [[Roadmap]]

## Purpose

This vault is the quick-context layer for the codebase:

- what the app does
- where important systems live
- what decisions were already made
- what should be built next

## Current Product Summary

PsychVault is a marketplace for psychology and clinician resources with:

- public browse and SEO landing pages
- creator storefronts
- paid and free digital downloads
- reviews and follows
- creator messaging
- moderation and reporting

## Current Technical Direction

- keep anonymous traffic cached/static where possible
- reserve dynamic compute for auth, checkout, dashboards, uploads, downloads, and moderation
- prefer small, production-safe refactors over rebuilds
