# 0017. Security Hardening and Automated Operations

**Date**: 2026-10-03
**Status**: Completed

## Summary

This specification defines the Security Hardening and Automated Operations module. It equips the ERP with comprehensive enterprise security defenses, including sliding window rate limiting on sensitive public endpoints, strict Content Security Policy and HTTP security headers, and automated database backup routines with SHA256 integrity checksums.

## Requirements

- **AC-1**: Public endpoints such as authentication and attendance ingestion enforce configurable rate limits, returning 429 Too Many Requests when request limits are exceeded.
- **AC-2**: Next.js HTTP responses send strict security headers including Content Security Policy, X-Content-Type-Options nosniff, X-Frame-Options DENY, and Strict-Transport-Security.
- **AC-3**: System provides automated and manual database backup routines, producing immutable snapshot metadata with cryptographic SHA256 checksums and file sizes.
- **AC-4**: Administrators can view security audit posture and trigger on demand database backup routines at `/admin/security`.

## Decision

Rate limiting is implemented using an efficient in memory token window algorithm with sliding expiration. HTTP security headers are enforced globally via `next.config.ts`. Database backup snapshots are tracked in a dedicated `DatabaseBackup` model with company scoping.

## Build plan

- [x] Step 1: Add `DatabaseBackup` model to Prisma schema and sync database.
- [x] Step 2: Configure enterprise HTTP security headers in `next.config.ts`.
- [x] Step 3: Implement rate limiting engine in `src/lib/rate-limiter.ts`.
- [x] Step 4: Implement backup actions in `src/actions/backup-actions.ts`.
- [x] Step 5: Build administrative security and backup manager UI at `/admin/security`.
- [x] Step 6: Author integration test suite in `src/__tests__/security.test.ts`.

## Consequences

**Positive**:

- Shields ERP against denial of service and credential brute force attacks.
- Enforces strict web browser protection against clickjacking, cross site scripting, and MIME sniffing.
- Provides verifiable disaster recovery snapshots with cryptographic checksum integrity.
