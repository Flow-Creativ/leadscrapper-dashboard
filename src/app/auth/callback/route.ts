import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const type = searchParams.get("type");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Handle different auth flow types
      if (type === "recovery") {
        // Password reset flow - redirect to reset password page
        return NextResponse.redirect(`${origin}/auth/reset-password`);
      }

      // Email verification or sign in - redirect to next or success page
      if (next === "/auth/verify-success") {
        return NextResponse.redirect(`${origin}/auth/verify-success`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to sign in page with error
  return NextResponse.redirect(`${origin}/auth/signin?error=auth_callback_error`);
}
