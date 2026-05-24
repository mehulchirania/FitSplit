import { z } from "zod";
import type { FormActionState } from "@/types/action-state";

export const ZodHelpers = {
  phone: z.string().regex(/^(\+91)?[6-9]\d{9}$/, "Mobile number is invalid."),
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 numeric digits."),
  username: z.string().regex(/^[a-z0-9._-]{3,32}$/, "Username must be 3-32 characters using letters, numbers, dots, underscores, or hyphens."),
  emailOrEmpty: z.string().email("Email is invalid.").or(z.literal("")),
  emailRequired: z.string().email("Email is invalid."),
  textRequired: (label: string) => z.string().trim().min(1, `${label} is required.`)
};

export function parseActionData<T extends z.ZodTypeAny>(
  formData: FormData,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; state: FormActionState } {
  const data = Object.fromEntries(formData.entries());
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    state: {
      status: "error",
      message: "Please fix the errors in the form.",
      fieldErrors: result.error.flatten().fieldErrors
    }
  };
}
