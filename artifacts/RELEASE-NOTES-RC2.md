# Release Notes - v0.4.0-rc.2

## Summary
Release Candidate 2 - Next.js 15 modernization with RFC 9457 Problem+JSON conformance

## Key Changes
- ✅ Full Problem+JSON (RFC 9457) compliance on all API routes
- ✅ Branch protection with required CI checks
- ✅ OpenAPI 3.1 + JSON Schema 2020-12 alignment
- ✅ Comprehensive QA guards and validation

## Commits since RC1
- ci: add required status checks for RC2 readiness (f3d5294)
- Fix additional TypeScript errors in test files (ec046f4)
- Fix TypeScript errors in test files (5fd73a2)
- ci: Add GitHub Actions workflow for CI/CD (38af0c9)
- temp: Remove workflows for initial push (182dc25)
- feat: Upgrade to Next.js 15.4.6 with React 19.1.1 and add homepage (9d9af81)

## Statistics
49 files changed, 1817 insertions(+), 605 deletions(-)

## Artifacts
- security-headers.json - Security header requirements
- schemas-snapshot.json - Schema version tracking
- openapi-hash.txt - API specification hash

## Branch Protection
Required checks: tests, schemas, contracts, qa-guards

Generated: 2025-08-10T15:19:44.317Z