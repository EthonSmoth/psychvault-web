"use server";

import bcrypt from "bcryptjs";
import { signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { sanitizeUserText } from "@/lib/input-safety";

export type SignupFormState = {
  error?: string;
};

export async function signupAction(
  _prevState: SignupFormState,
  formData: FormData
): Promise<SignupFormState> {
  const name = sanitizeUserText(formData.get("name"), { maxLength: 80 });
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!name || !email || !password) {
    return { error: "Please fill in all fields." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  const existingUser = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return { error: "An account with that email already exists." };
  }

  // Create the user in Supabase Auth first to obtain a stable UUID.
  // We disable Supabase's own verification email because the app manages
  // email verification independently via VerificationToken + Resend.
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
  });

  if (authError || !authData.user) {
    if (authError?.message?.toLowerCase().includes("already registered")) {
      return { error: "An account with that email already exists." };
    }
    return { error: "Could not create account. Please try again." };
  }

  const supabaseUserId = authData.user.id;

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await db.user.create({
      data: {
        id: supabaseUserId, // pin Prisma User.id to the Supabase auth UUID
        name,
        email,
        passwordHash,
        role: "BUYER",
      },
    });
  } catch {
    // Roll back: remove the orphaned Supabase auth user if Prisma write fails.
    await supabase.auth.admin.deleteUser(supabaseUserId);
    return { error: "Could not create account. Please try again." };
  }

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/creator",
  });

  return {};
}
