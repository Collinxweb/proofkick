import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/server";
import { hasSupabase } from "../../../lib/supabase/clients";

// OAuth + magic link return. Exchanges ?code for a session cookie.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (hasSupabase() && code) {
    const sb = await supabaseServer();
    await sb.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL("/", url.origin));
}
