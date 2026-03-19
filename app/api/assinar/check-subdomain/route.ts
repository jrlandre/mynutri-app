import { NextRequest, NextResponse } from "next/server"
import { adminClient } from "@/lib/supabase/admin"

const SUBDOMAIN_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/

export async function GET(request: NextRequest): Promise<NextResponse> {
  const subdomain = request.nextUrl.searchParams.get("subdomain") ?? ""

  if (!SUBDOMAIN_REGEX.test(subdomain)) {
    return NextResponse.json(
      { available: false, error: "Formato inválido. Use apenas letras minúsculas, números e hífen (3–30 caracteres)." },
      { status: 400 }
    )
  }

  const { data, error } = await adminClient
    .from("experts")
    .select("id")
    .eq("subdomain", subdomain)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ available: false, error: "Erro ao verificar disponibilidade." }, { status: 500 })
  }

  return NextResponse.json({ available: data === null })
}
