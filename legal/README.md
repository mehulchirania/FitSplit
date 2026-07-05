# FitSplit Legal Document Pack

Last updated: July 6, 2026

This folder contains the launch legal documents for FitSplit. FitSplit is owned and operated by [Blume Labs](https://blumelabs.in/). These documents are drafted for a fitness and gym-management SaaS operated from India, with gym owners/trainers managing member data, Firebase/Google Cloud infrastructure, health and fitness logs, geofenced attendance, web push notifications, and member-facing self-service privacy flows.

Important: this pack is a product-ready legal draft, not legal advice. Before launch, have counsel confirm the final operator details, governing-law clause, consumer-law position, data-transfer posture, and any gym-specific contracting terms.

## Public documents

- [Terms of Service](./terms-of-service.md)
- [Privacy Policy](./privacy-policy.md)
- [Cookie Policy](./cookie-policy.md)
- [Acceptable Use Policy](./acceptable-use-policy.md)
- [Health and Fitness Disclaimer](./health-and-fitness-disclaimer.md)
- [Refund and Cancellation Policy](./refund-and-cancellation-policy.md)
- [Data Rights and Grievance Notice](./data-rights-and-grievance-notice.md)
- [Consent Notice](./consent-notice.md)
- [Subprocessor List](./subprocessors.md)

## B2B / gym-customer documents

- [Gym Data Processing Addendum](./gym-data-processing-addendum.md)

## Launch placeholders to fill

Replace these placeholders before publishing or signing:

- `[REGISTERED ADDRESS]`
- `[GRIEVANCE OFFICER NAME]`
- `[GRIEVANCE OFFICER POSTAL ADDRESS]`
- `[CITY, STATE, INDIA]`
- `[BUSINESS REGISTRATION / GST DETAILS, IF APPLICABLE]`
- `[SUPPORT RESPONSE HOURS]`

Confirm whether Blume Labs is a proprietorship, partnership, company, LLP, or another registered legal form before signing B2B agreements.

## Publishing map

Recommended public URLs:

- `/terms` -> Terms of Service
- `/privacy` -> Privacy Policy
- `/cookies` -> Cookie Policy
- `/acceptable-use` -> Acceptable Use Policy
- `/health-disclaimer` -> Health and Fitness Disclaimer
- `/refunds` -> Refund and Cancellation Policy
- `/data-rights` -> Data Rights and Grievance Notice
- consent gate / onboarding modals -> Consent Notice
- `/subprocessors` -> Subprocessor List

The existing app already has `/terms` and `/privacy` pages. Keep those pages in sync with these Markdown source documents before launch.

## Consent checklist

For first login or account creation, collect consent to:

- Terms of Service
- Privacy Policy
- Processing of health and fitness data, including injury notes, body metrics, training logs, nutrition/macros, and coach notes
- Geolocation processing for attendance, where enabled
- Push notifications, only when the user opts in at browser/device level

For gym owners, also accept:

- Gym Data Processing Addendum
- Acceptable Use Policy
- Subprocessor List

## Compliance notes

The pack is aligned to the app behavior documented in `README.md`, `docs/02_DATA_DICTIONARY.md`, `docs/04_DATA_ACCESS_CATALOG.md`, and `docs/08_BUSINESS_RULES.md`.

Primary legal topics covered:

- India notice, consent, grievance, and sensitive-data expectations
- GDPR/UK GDPR transparency, special category health-data consent, data subject rights, and controller/processor allocation
- CCPA/CPRA consumer rights and no-sale/no-sharing disclosure
- Cookie transparency for strictly necessary auth/session cookies and optional push tokens
- Fitness and medical-risk disclaimers
- Gym-owner processor terms for member data
