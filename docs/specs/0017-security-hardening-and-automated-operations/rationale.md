# Rationale: Security Hardening and Automated Operations

## Why in memory sliding window rate limiting?

In multi branch enterprise applications, public facing endpoints like biometric log ingestion and login attempts are vulnerable to distributed attacks. An in memory token bucket sliding window provides sub millisecond enforcement without requiring an external Redis infrastructure dependency for initial deployments, while cleanly abstracting the storage layer for horizontal clustering if needed later.

## Why global HTTP security headers?

Configuring security headers at the framework level in `next.config.ts` ensures that all server rendered pages, client side route transitions, and API endpoints consistently transmit defense in depth protections against clickjacking, cross site scripting, and MIME sniffing.

## Cryptographic backup verification

Backups store SHA256 checksums alongside file size and timestamp to guarantee tamper evident verification before any restoration process.
