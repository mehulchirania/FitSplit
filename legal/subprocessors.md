# FitSplit Subprocessor List

Last updated: July 5, 2026

This list identifies third-party service providers that may process personal data for FitSplit.

## Current subprocessors

| Subprocessor | Service | Data processed | Location / transfer notes |
|---|---|---|---|
| Google Firebase / Google Cloud | Hosting, Cloud Firestore, Firebase Authentication, Cloud Functions, Cloud Storage, Cloud Messaging, app infrastructure, logs, security, and diagnostics | Account data, authentication data, gym records, member records, workout/progress data, attendance/location records, media uploads, notifications, technical logs | FitSplit is configured around Google services with primary regional operations in `asia-south1` where applicable. Google may process data globally for support, security, reliability, and service operations under its data-processing terms. |

## Optional or environment-dependent providers

| Provider | Service | Notes |
|---|---|---|
| Error monitoring provider | Error and diagnostic monitoring | The current app documents possible diagnostic/error monitoring. Add the exact provider before launch if enabled. |
| Email provider | Transactional/support email | Add the exact provider before launch if FitSplit sends email outside Firebase/Google infrastructure. |
| Payment provider | Online payments | FitSplit does not currently process card payments inside the app. Add provider details before enabling in-app payment processing. |
| Analytics provider | Product analytics | No advertising or marketing analytics provider is listed for the current app. Add provider details and update the Cookie Policy before enabling non-essential analytics. |

## Changes

FitSplit may update this list when adding or replacing subprocessors. For material changes affecting gym-customer data, FitSplit will provide notice through the Service, email, contract notice, or another reasonable channel.

Gym customers should review this list before enabling FitSplit for member data.

