"use client";

import { createContext, useContext } from "react";
import type { FormActionState } from "@/types/action-state";

export const FormActionContext = createContext<FormActionState | null>(null);

function useFormActionState() {
  return useContext(FormActionContext);
}

export function FieldError({ name }: { name: string }) {
  const state = useFormActionState();
  if (!state || !state.fieldErrors || !state.fieldErrors[name]) return null;
  
  return (
    <div className="field-errors">
      {state.fieldErrors[name]?.map((error, idx) => (
        <span key={idx} className="field-error-text" role="alert">{error}</span>
      ))}
    </div>
  );
}
