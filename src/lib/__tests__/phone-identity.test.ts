import { describe, expect, it } from "vitest";
import {
  emailToPhone,
  formatPhone,
  isValidPin,
  normalizePhone,
  phoneToEmail,
  pinToPassword
} from "@/lib/phone-identity";

describe("normalizePhone", () => {
  it("treats a bare 10-digit Indian mobile as +91", () => {
    expect(normalizePhone("9688227039")).toBe("+919688227039");
    expect(normalizePhone("96882 27039")).toBe("+919688227039");
    expect(normalizePhone("  96882-27039 ")).toBe("+919688227039");
  });

  it("accepts a leading 0, 91 or +91", () => {
    expect(normalizePhone("09688227039")).toBe("+919688227039");
    expect(normalizePhone("919688227039")).toBe("+919688227039");
    expect(normalizePhone("+91 96882 27039")).toBe("+919688227039");
    expect(normalizePhone("0091 96882 27039")).toBe("+919688227039");
  });

  it("rejects Indian numbers that cannot be mobiles", () => {
    expect(normalizePhone("5688227039")).toBeNull();
    expect(normalizePhone("968822703")).toBeNull();
    expect(normalizePhone("96882270390")).toBeNull();
    expect(normalizePhone("+915688227039")).toBeNull();
  });

  it("accepts other countries only with an explicit +code", () => {
    expect(normalizePhone("+14155550123")).toBe("+14155550123");
    expect(normalizePhone("+44 7911 123456")).toBe("+447911123456");
    expect(normalizePhone("4155550123")).toBeNull();
  });

  it("rejects empty and non-numeric input", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("abc")).toBeNull();
  });
});

describe("synthetic identity", () => {
  it("round-trips the phone through the Firebase email", () => {
    const email = phoneToEmail("+919688227039");
    expect(email).toBe("919688227039@phone.fitsplit.app");
    expect(emailToPhone(email)).toBe("+919688227039");
  });

  it("does not treat a real email as a phone identity", () => {
    expect(emailToPhone("someone@example.com")).toBeNull();
    expect(emailToPhone(undefined)).toBeNull();
  });

  it("derives a Firebase-acceptable password (6+ chars) from the PIN", () => {
    expect(pinToPassword("1234")).toBe("fs-pin-1234");
    expect(pinToPassword("1234").length).toBeGreaterThanOrEqual(6);
  });

  it("formats Indian numbers for display", () => {
    expect(formatPhone("+919688227039")).toBe("+91 96882 27039");
    expect(formatPhone("+14155550123")).toBe("+14155550123");
  });
});

describe("isValidPin", () => {
  it("accepts exactly four digits", () => {
    expect(isValidPin("1234")).toBe(true);
    expect(isValidPin("0000")).toBe(true);
  });
  it("rejects anything else", () => {
    for (const bad of ["", "123", "12345", "12a4", " 123", "１２３４"]) expect(isValidPin(bad)).toBe(false);
  });
});
