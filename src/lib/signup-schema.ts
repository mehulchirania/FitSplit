import { z } from "zod";

/** Length limits shared by the form (maxLength) and the server action. */
export const SIGNUP_LIMITS = { name: 80, email: 254, password: 128, passwordMin: 8 } as const;

const checked = (v: unknown) => v === "on" || v === "true";

/**
 * Server-side validation of the signup form. The consent checkboxes are enforced
 * here (not just in the browser): a request without them is rejected.
 */
export const SignupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your name.").max(SIGNUP_LIMITS.name, "Name is too long."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(SIGNUP_LIMITS.email, "Email is too long.")
      .email("Enter a valid email address."),
    password: z
      .string()
      .min(SIGNUP_LIMITS.passwordMin, "Password must be at least 8 characters.")
      .max(SIGNUP_LIMITS.password, "Password is too long."),
    termsAccepted: z.any().refine(checked, "You must agree to the Terms and the Privacy Notice to create an account."),
    ageGroup: z.enum(["adult", "minor"], "Tell us whether you are 18 or older."),
    guardianConsent: z.any().optional(),
    guardianEmail: z.string().trim().toLowerCase().max(SIGNUP_LIMITS.email).optional(),
    diagnosticsConsent: z.any().optional()
  })
  .superRefine((data, ctx) => {
    if (data.ageGroup !== "minor") return;
    if (!checked(data.guardianConsent)) {
      ctx.addIssue({ code: "custom", path: ["guardianConsent"], message: "A parent or guardian must consent for users under 18." });
    }
    const guardian = data.guardianEmail ?? "";
    if (!z.string().email().safeParse(guardian).success) {
      ctx.addIssue({ code: "custom", path: ["guardianEmail"], message: "Enter your parent or guardian's email address." });
    } else if (guardian === data.email) {
      ctx.addIssue({ code: "custom", path: ["guardianEmail"], message: "The guardian's email must be different from yours." });
    }
  });

export type SignupInput = z.infer<typeof SignupSchema>;

export function parseSignup(formData: FormData): { ok: true; data: SignupInput } | { ok: false; message: string } {
  const result = SignupSchema.safeParse(Object.fromEntries(formData.entries()));
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, message: result.error.issues[0]?.message ?? "Check the form and try again." };
}

export const diagnosticsGranted = (v: unknown) => checked(v);
