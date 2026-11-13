# FitSplit Privacy Notice

**Version {{VERSION}} · Last updated {{LAST_UPDATED}}**

This notice explains what personal data FitSplit collects when you use our free workout app, why we collect it, who processes it, how long we keep it, and the rights you have. It is written to meet India's Digital Personal Data Protection Act, 2023 ("DPDP Act") and the rules made under it, and follows GDPR-style good practice. You can ask for this notice in English or in any language listed in the Eighth Schedule to the Constitution of India (write to the contact in section 12).

## 1. Who we are

FitSplit is operated by {{OPERATOR_NAME}} ({{OPERATOR_LEGAL_FORM}}), registered at {{OPERATOR_ADDRESS}} ("FitSplit", "we", "us"). For the personal data described here we decide the purpose and means of processing, so we are the **Data Fiduciary** under the DPDP Act (and the "controller" in GDPR terms).

FitSplit is a free app for following workout plans and keeping a training log. There are no payments, no gyms, no trainers and no advertising on FitSplit. Every account belongs to one individual who uses the app for themselves.

## 2. What data we collect

| Category | What it includes | Where it comes from |
|---|---|---|
| Account | Name, mobile number, 4-digit PIN (stored only as a salted hash by Firebase Authentication; we never see or store it in readable form), account creation time. The number is used only to identify your account when you sign in: we do not send it SMS, call it or share it | You, at signup |
| Consent record | Which Terms and Privacy Notice versions you accepted and when, your age group (18 or older, or under 18), your optional-diagnostics choice, and for under-18 users a guardian email and the time guardian consent was declared | You, at signup |
| Profile | Optional: date of birth, age, gender, height, weight, fitness goals, macro targets, profile photo | You, in Settings and Profile |
| Health notes | Optional: injury notes and medical notes you choose to type into your profile | You, in Profile |
| Training data | Programs you follow, exercises you swap, sets, reps and weights, completed workout days and sessions, stretch and cardio entries | You, as you log |
| Body and nutrition data | Body-weight entries, daily macros, meals you log | You, as you log |
| Profile photo | A cropped image you upload as your avatar | You |
| Technical data | IP address, browser and device type, pages requested and timestamps in server logs; error details if something breaks | Your browser and our servers |

We do not collect your precise location, contacts, advertising identifiers or payment details, and we do not collect biometric data. Please do not enter other people's personal data, or information you do not want stored, in free-text fields. Injury and medical notes are entirely optional; the app works without them.

## 3. Why we use your data, and our basis

Under the DPDP Act we rely on your **consent** (section 6), which you give by ticking the box at signup, and on the narrow "certain legitimate uses" the Act allows. The right-hand column also gives the closest GDPR-style basis.

| Purpose | Data used | Basis |
|---|---|---|
| Create and secure your account, sign you in, keep you signed in | Account, session cookie, technical data | Consent; necessary to provide the service |
| Provide the app: plans, logging, progress charts, macro tracking, data export | Profile, training, body and nutrition data | Consent; necessary to provide the service |
| Personalise targets you set yourself (for example macro targets, units) | Profile, body data | Consent |
| Keep the service secure and prevent abuse (rate limiting, fraud and misuse checks) | IP address, request logs, account data | Consent; our legitimate interest in security |
| Fix bugs and keep the app reliable (server-side error reports) | Technical data | Our legitimate interest in running a reliable service |
| Browser error diagnostics and masked session replays | Technical data, masked page content | Your separate, optional consent only (section 6) |
| Meet legal obligations and respond to lawful requests | Whatever the law requires | Legal obligation / legitimate use under DPDP Act s.7 |
| Handle your rights requests and grievances | Account data, request details | Legal obligation; consent |

We do not use your data for advertising, marketing profiles, or automated decisions that significantly affect you. We do not sell your data.

## 4. Health and fitness information

Body weight, nutrition and workout data describe your health and fitness. We treat them with the same care as any sensitive data: they are visible only to you inside your account, are not shared with other users, and are not used for anything other than running your own account. FitSplit does not give medical advice (see the Health and Fitness Disclaimer).

## 5. Children (under 18)

You must be 18 or older to create an account on your own. Under the DPDP Act a person under 18 is a child.

- At signup we ask whether you are 18 or older. If you are under 18, a **parent or legal guardian must consent** by ticking a separate box and giving their email address. We record that declaration, the guardian's email and the time, on the account.
- We may email the guardian to confirm, and we may suspend or delete an account if consent cannot be confirmed or the guardian withdraws it.
- For under-18 accounts we do **not** carry out tracking, behavioural monitoring or targeted advertising, and we turn the optional diagnostics in section 6 off and do not offer it.
- A guardian can ask us to access, correct, export or delete a child's data, or withdraw consent, using the contact in section 12.
- If you believe a child has signed up without guardian consent, tell us and we will delete the account.

## 6. Optional consent: browser diagnostics

Separately from the checkbox that accepts the Terms and this notice, we offer one optional choice: allowing our error-monitoring tool (Sentry) to run in your browser and collect error details, performance samples, and occasional session replays in which all text is masked and images and media are blocked. It is **off by default**, you can use all of FitSplit without it, and you can turn it on or off at any time on the Data Rights page. Your choice is saved on your account and on the device you used. Without it, nothing is sent to Sentry from your browser. (Errors raised on our servers are still reported to Sentry without your profile content; this is limited to technical data.)

## 7. Who processes your data

We share personal data only with service providers that process it on our behalf and under their data-protection terms. We do not sell it or share it for advertising.

| Processor | What for | Data |
|---|---|---|
| Google LLC (Firebase Authentication, Cloud Firestore, Cloud Storage, App Hosting and Google Cloud logging) | Hosting the app, storing your account and data, signing you in, storing your profile photo, server logs | All data in section 2 |
| Functional Software, Inc. (Sentry) | Error monitoring | Technical data; if you opted in, browser diagnostics and masked replays |

The up-to-date list is on the Subprocessors page. If you watch an exercise tutorial, the video is loaded from YouTube, which then receives your IP address and may set its own cookies; see the Cookie Policy. We may disclose data to a court, regulator or law-enforcement body where the law requires it.

## 8. Transfers outside India

Your data is stored in Google Cloud in {{DATA_LOCATION}}. Google may also process data in other countries to run, secure and support its services, and Sentry processes error data outside India. The DPDP Act allows transfers to other countries except those the Government of India restricts by notification. We choose processors that commit to contractual security and confidentiality protections, and we will not transfer data to a restricted country.

## 9. How long we keep data

| Data | Retention |
|---|---|
| Account, profile, training, body and nutrition data, profile photo | For as long as your account exists. When you delete your account in Settings, all of it is erased from our live systems immediately, together with your sign-in identity |
| Consent record | Kept with your account and deleted with it. If you are asked to prove consent, we may keep a minimal record (user ID, versions, timestamps) for as long as the law requires |
| Server logs and security logs | A limited period set by Google Cloud (we aim to keep them for no more than one year), then deleted automatically |
| Error reports and replays in Sentry | A limited period set in our Sentry project (we aim for 90 days or less), then deleted automatically |
| Backups and copies | Residual copies in Google's systems are overwritten on its standard cycle after deletion |

We do not currently delete inactive accounts automatically.

## 10. Security

- All traffic is encrypted with HTTPS and we send HSTS so browsers only connect securely.
- The sign-in session cookie is HttpOnly, Secure and SameSite, and sessions end after 2 hours (or 14 days if you chose "remember me").
- Your PIN is handled by Firebase Authentication, which stores only hashes. Wrong PIN guesses are counted per mobile number, and the number is locked for a short time after repeated misses.
- Each account's data is stored under its own user ID and the database is deny-by-default: other users cannot read it.
- We apply security headers (including a Content-Security-Policy), validate and length-limit everything you submit, and rate-limit sign-up and sign-in.

No system is perfectly secure. If a personal data breach affects you, we will notify you and the Data Protection Board of India as the DPDP Act requires.

## 11. Your rights

You can:

- access a summary of your data and a full copy (Settings, "Download my data");
- correct or update your data (Settings and Profile, or ask us);
- erase your account and data (Settings, "Delete my account");
- withdraw consent at any time (the optional diagnostics choice on the Data Rights page; deleting your account withdraws everything). Withdrawal does not affect processing already done, and we cannot provide the service without the data needed for it;
- raise a grievance and get a response (section 12);
- nominate another person to exercise your rights if you die or become incapacitated.

Step-by-step instructions are on the Data Rights page. Exercising these rights is free.

## 12. Grievance Officer and data protection contact

| | |
|---|---|
| Name | {{CONTACT_NAME}} |
| Designation | {{CONTACT_DESIGNATION}} |
| Email | {{CONTACT_EMAIL}} |
| Postal address | {{CONTACT_ADDRESS}} |

We acknowledge requests within {{ACK_DAYS}} days and aim to respond within {{RESPONSE_DAYS}} days; in any case we will respond within the time the DPDP Rules allow.

## 13. Complaints to the Board

If we have not resolved your grievance, you may complain to the Data Protection Board of India. Please use our grievance process first, as the DPDP Act expects.

## 14. Changes to this notice

We version this notice (see the top of the page). When we change it in a way that matters, we will tell you in the app and ask for your consent again where the law requires. The versions you accepted are kept on your account.
