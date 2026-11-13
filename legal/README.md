# FitSplit legal documents

Source Markdown for the public legal pages. Rendered by `src/components/legal-document-page.tsx`.

- Contact details, dates and versions live in ONE file: `src/lib/legal-config.ts`. Markdown uses `{{TOKENS}}` (for example `{{CONTACT_EMAIL}}`, `{{VERSION}}`, `{{LAST_UPDATED}}`); an unknown token fails the build.
- Anything in `[SQUARE BRACKETS]` in that file is a placeholder to replace before launch.
- When a document changes materially, bump its entry in `LEGAL_VERSIONS` and `LEGAL_LAST_UPDATED`. The Terms and Privacy versions are stored on each user's profile (`consent`) at signup.

Pages: terms, privacy (Privacy Notice), cookies, acceptable-use, health-disclaimer, data-rights, consent-notice, subprocessors.

These are drafts, not reviewed by counsel.
