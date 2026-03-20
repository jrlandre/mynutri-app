import { NextResponse } from "next/server"
import { adminClient } from "@/lib/supabase/admin"

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  const { data } = await adminClient
    .from("experts")
    .select("referral_code")
    .eq("referral_code", code)
    .eq("is_promoter", true)
    .eq("active", true)
    .maybeSingle()

  const response = NextResponse.redirect(new URL("/", req.url))

  if (data) {
    response.cookies.set("ref_code", code, {
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
      sameSite: "lax",
      httpOnly: false,
    })
  }

  return response
}
