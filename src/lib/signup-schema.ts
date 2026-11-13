import { z } from "zod";
import { isValidPin, normalizePhone, PIN_LENGTH } from "@/lib/phone-identity";

/** Length limits shared by the form (maxLength) and the server action. */
export const SIGNUP_LIMITS = { name: 80, phone: 20, email: 254, pin: PIN_LENGTH } as const;

const checked = (v: unknown) => v === "on" || v === "true";

/**
 * Server-side validation of the signup form. The consent checkboxes are enforced
 * here (not just in the browser): a request without them is rejected.
 *
 * Login identity is a mobile number + 4-digit PIN. `guardianEmail` is NOT a login
 * identity: it is the contact a parent or guardian gives when consenting for a
 * user under 18 (DPDP Act s.9), and is only stored on the consent record.
 */
export const SignupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your name.").max(SIGNUP_LIMITS.name, "Name is too long."),
    phone: z
      .string()
      .trim()
      .max(SIGNUP_LIMITS.phone, "Enter a valid mobile number.")
      .transform((value, ctx) => {
        const normalized = normalizePhone(value);
        if (!normalized) {
          ctx.addIssue({ code: "custom", message: "Enter a valid 10-digit mobile number." });
          return z.NEVER;
        }
        return normalized;
      }),
    pin: z.string().refine(isValidPin, "Your PIN must be exactly 4 digits."),
    confirmPin: z.string(),
    termsAccepted: z.any().refine(checked, "You must agree to the Terms and the Privacy Notice to create an account."),
    ageGroup: z.enum(["adult", "minor"], "Tell us whether you are 18 or older."),
    guardianConsent: z.any().optional(),
    guardianEmail: z.string().trim().toLowerCase().max(SIGNUP_LIMITS.email).optional(),
    diagnosticsConsent: z.any().optional()
  })
  .superRefine((data, ctx) => {
    if (data.pin !== data.confirmPin) {
      ctx.addIssue({ code: "custom", path: ["confirmPin"], message: "The two PINs do not match." });
    }
    if (data.ageGroup !== "minor") return;
    if (!checked(data.guardianConsent)) {
      ctx.addIssue({ code: "custom", path: ["guardianConsent"], message: "A parent or guardian must consent for users under 18." });
    }
    const guardian = data.guardianEmail ?? "";
    if (!z.string().email().safeParse(guardian).success) {
      ctx.addIssue({ code: "custom", path: ["guardianEmail"], message: "Enter your parent or guardian's email address." });
    }
  });

export type SignupInput = z.infer<typeof SignupSchema>;

export function parseSignup(formData: FormData): { ok: true; data: SignupInput } | { ok: false; message: string } {
  const result = SignupSchema.safeParse(Object.fromEntries(formData.entries()));
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, message: result.error.issues[0]?.message ?? "Check the form and try again." };
}

export const diagnosticsGranted = (v: unknown) => checked(v);
