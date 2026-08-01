# 04 · Testing & Credentials Runbook

`Last Updated: 2026-08-02 · Multi-Tenant Test Credentials`

---

## 1. Multi-Tenant Test Credentials Table

All staff accounts use password **`password`**. All member accounts use PIN **`1234`** (Auth password: `pin-1234`).

### 🏋️ Primary Gym 1: Sri Shakthi Hanuman Gym (`shg`) — Bengaluru

| Role | Name | Username | Password / PIN | Details |
|---|---|---|---|---|
| **Member (Primary)** | **Mehul Chirania** | **`mehul`** | **`1234`** | Active 1-Year VIP Membership, PPL ×2 Split |
| **Owner** | Santosh SHG | `santosh-shg` | `password` | Gym Owner |
| **Trainer** | Ravi Kumar | `shg-trainer-1` | `password` | Personal Trainer |
| **Trainer** | Priya Nair | `shg-trainer-2` | `password` | Personal Trainer |
| **Trainer** | Vikram Seth | `shg-trainer-3` | `password` | Personal Trainer |
| **Member** | Aarav Sharma | `aarav` | `1234` | Member |
| **Member** | Meera Iyer | `meera` | `1234` | Member |
| **Member** | Kabir Khan | `kabir` | `1234` | Member |
| **Member** | Nisha Rao | `nisha` | `1234` | Member |

---

### 🏋️ Gym 2: IronCore Fitness (`ironcore-blr`) — Bengaluru

| Role | Name | Username | Password / PIN |
|---|---|---|---|
| **Owner** | Arvind Rajagopal | `ironcore-owner-1` | `password` |
| **Trainer** | Meghana Suresh | `ironcore-trainer-1` | `password` |
| **Trainer** | Karthik Raja | `ironcore-trainer-2` | `password` |
| **Trainer** | Ananya Roy | `ironcore-trainer-3` | `password` |
| **Member** | Vikram Rao | `vikram.icf` | `1234` |

---

### 🏋️ Gym 3: Pulse Fitness Studio (`pulse-hyd`) — Hyderabad

| Role | Name | Username | Password / PIN |
|---|---|---|---|
| **Owner** | Rehana Fatima | `pulse-owner-1` | `password` |
| **Trainer** | Sandeep Kaushik | `pulse-trainer-1` | `password` |
| **Trainer** | Farhan Ali | `pulse-trainer-2` | `password` |
| **Trainer** | Kavya Sharma | `kavya.pulse@fitsplit.app` | `password` |
| **Member** | Rakesh Pillai | `rakesh.pfs` | `1234` |

---

### 🏋️ Gym 4: Titan Fitness Club (`titan-gym`) — Mumbai

| Role | Name | Username | Password / PIN |
|---|---|---|---|
| **Owner** | Alok Nath | `titan-owner-1` | `password` |
| **Trainer** | Rohan Mehta | `titan-trainer-1` | `password` |
| **Trainer** | Simran Kaur | `titan-trainer-2` | `password` |
| **Trainer** | Aditya Verma | `aditya.titan@fitsplit.app` | `password` |
| **Member** | Alisha Fernandes | `alisha.tfc` | `1234` |

---

## 2. Seeding & Inspection Commands

To reset and seed all 4 gyms with complete owner, trainer, and member data:
```bash
node scripts/seed-clean-gyms.mjs
```

To inspect live Firestore data across all tenant collections:
```bash
node scripts/inspect-firestore-live.mjs
```

---

## 3. Automated Test Suite Execution

Run unit tests (Vitest):
```bash
npm test
```

Run TypeScript compilation check:
```bash
npm run typecheck
```
