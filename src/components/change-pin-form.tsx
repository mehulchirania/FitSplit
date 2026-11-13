"use client";

import { useState } from "react";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { PinField } from "@/components/phone-pin-fields";
import { changePin } from "@/lib/auth";

/** Change-PIN form for the full profile page. The PIN boxes are controlled, so the values travel as hidden fields. */
export function ChangePinForm() {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  return (
    <ConfirmActionForm
      action={changePin}
      className="form-panel"
      confirmMessage="This updates your sign-in PIN immediately."
      confirmTitle="Change PIN?"
      pendingLabel="Updating PIN..."
      submitLabel="Change PIN"
    >
      <input type="hidden" name="currentPin" value={currentPin} />
      <input type="hidden" name="newPin" value={newPin} />
      <input type="hidden" name="confirmPin" value={confirmPin} />
      <div className="form-grid">
        <div>
          Current PIN
          <PinField label="Current PIN" value={currentPin} onChange={setCurrentPin} />
        </div>
        <div>
          New PIN
          <PinField label="New PIN" value={newPin} onChange={setNewPin} />
        </div>
        <div>
          Confirm new PIN
          <PinField label="Confirm new PIN" value={confirmPin} onChange={setConfirmPin} />
        </div>
      </div>
    </ConfirmActionForm>
  );
}
