"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginUser(prevState: any, formData: FormData) {
  let usernameOrMobile = (formData.get("username") as string || "").trim();
  const password = formData.get("password") as string;

  const normalizedForPhone = usernameOrMobile.replace(/[\s-]/g, "");
  if (normalizedForPhone.length === 10 && /^\d{10}$/.test(normalizedForPhone)) {
    usernameOrMobile = `+91 ${normalizedForPhone}`;
  } else if (normalizedForPhone.startsWith("+91") && /^\+91\d{10}$/.test(normalizedForPhone)) {
    usernameOrMobile = `+91 ${normalizedForPhone.slice(3)}`;
  }

  if (password !== "password") {
    return { error: "Invalid password. Use 'password'." };
  }

  let role = "member";
  let redirectUrl = "/member";
  let memberId = "";

  if (usernameOrMobile === "admin") {
    role = "admin";
    redirectUrl = "/admin";
  } else if (usernameOrMobile.includes("owner")) {
    role = "owner";
    redirectUrl = "/owner";
  } else if (usernameOrMobile === "mehulchirania" || usernameOrMobile === "+91 9688227039") {
    role = "member";
    redirectUrl = "/member";
    memberId = "member-mehul";
  } else {
    // Default fallback
    memberId = "member-aarav";
  }

  const cookieStore = await cookies();
  cookieStore.set("fitsplit-role", role, { path: "/" });
  cookieStore.set("fitsplit-username", usernameOrMobile, { path: "/" });
  if (memberId) {
    cookieStore.set("fitsplit-member-id", memberId, { path: "/" });
  }

  redirect(redirectUrl);
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete("fitsplit-role");
  cookieStore.delete("fitsplit-username");
  cookieStore.delete("fitsplit-member-id");
  redirect("/");
}

export async function requestPasswordReset(prevState: any, formData: FormData) {
  let usernameOrMobile = (formData.get("username") as string || "").trim();
  
  if (!usernameOrMobile) {
    return { error: "Please enter your username or mobile number to reset password." };
  }

  const normalizedForPhone = usernameOrMobile.replace(/[\s-]/g, "");
  if (normalizedForPhone.length === 10 && /^\d{10}$/.test(normalizedForPhone)) {
    usernameOrMobile = `+91 ${normalizedForPhone}`;
  } else if (normalizedForPhone.startsWith("+91") && /^\+91\d{10}$/.test(normalizedForPhone)) {
    usernameOrMobile = `+91 ${normalizedForPhone.slice(3)}`;
  }

  // Mock sending notification to owner
  console.log(`Sending password reset notification to admin for user: ${usernameOrMobile}`);
  
  return { status: "success", message: `A password reset request has been sent to the gym owner for ${usernameOrMobile}.` };
}
