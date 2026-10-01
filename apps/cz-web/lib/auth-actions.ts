// SPDX-License-Identifier: MPL-2.0
"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { habitatClient, habitatSiteUrl } from "./supabase";
import { isFounderCredential } from "./founder-credential";

export async function requestFounderLink(formData: FormData) {
  const email = z.string().trim().email().safeParse(formData.get("email"));
  const allowlisted = process.env.CZ_FOUNDER_EMAIL?.trim();
  if (!email.success || !isFounderCredential(email.data, allowlisted))
    redirect("/login?result=sent");
  if (!allowlisted) redirect("/login?result=sent");

  const client = await habitatClient();
  if (!client) redirect("/login?result=unavailable");

  const { error } = await client.auth.signInWithOtp({
    email: allowlisted,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: new URL("/auth/callback", habitatSiteUrl()).toString(),
    },
  });
  void error;
  redirect("/login?result=sent");
}

export async function signOutFounder() {
  const client = await habitatClient();
  if (client) await client.auth.signOut();
  redirect("/login");
}
