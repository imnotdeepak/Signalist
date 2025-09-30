"use server";

import { auth } from "@/lib/better-auth/auth";
import { inngest } from "@/lib/inngest/client";
import { headers } from "next/headers";

export const signUpWithEmail = async ({
  email,
  password,
  fullName,
  country,
  investmentGoals,
  riskTolerance,
  preferredIndustry,
}: SignUpFormData) => {
  try {
    const response = await auth.api.signUpEmail({
      body: { email, password, name: fullName },
    });

    if (response) {
      await inngest.send({
        name: "app/user.created",
        data: {
          email,
          name: fullName,
          country,
          investmentGoals,
          riskTolerance,
          preferredIndustry,
        },
      });
    }

    return { success: true, data: response };
  } catch (e) {
    const errorMessage =
      e instanceof Error &&
      (e.message?.includes("already exists") ||
        e.message?.includes("duplicate"))
        ? "An account with this email already exists"
        : e instanceof Error
        ? e.message
        : "Failed to create an account. Please try again.";
    return { success: false, error: errorMessage };
  }
};

export const signInWithEmail = async ({ email, password }: SignInFormData) => {
  try {
    const response = await auth.api.signInEmail({ body: { email, password } });

    return { success: true, data: response };
  } catch (e) {
    const errorMessage =
      e instanceof Error &&
      (e.message?.includes("Invalid") || e.message?.includes("credentials"))
        ? "Invalid email or password"
        : e instanceof Error
        ? e.message
        : "Failed to sign in. Please try again.";
    return { success: false, error: errorMessage };
  }
};

export const signOut = async () => {
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch {
    return { success: false, error: "Sign out failed" };
  }
};
