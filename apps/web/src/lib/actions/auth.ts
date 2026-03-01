"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    redirect("/es/login?error=" + encodeURIComponent(error.message));
  }

  const redirectTo = formData.get("redirect") as string;
  redirect(redirectTo || "/es");
}

export async function signup(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signUp(data);

  if (error) {
    redirect("/es/login?error=" + encodeURIComponent(error.message));
  }

  redirect("/es");
}

export async function setPassword(
  formData: FormData,
): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  return null;
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/es/login");
}
