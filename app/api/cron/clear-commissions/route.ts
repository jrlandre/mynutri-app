import { NextResponse } from "next/server"
import { adminClient } from "@/lib/supabase/admin"
import { logger } from "@/lib/logger"

export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization")
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await adminClient
    .from("referrals")
    .update({ status: "cleared" })
    .eq("status", "pending")
    .lte("clears_at", new Date().toISOString())
    .select("id")

  if (error) {
    logger.error('cron/clear-commissions', 'Erro ao limpar comissões', { error })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ cleared: data?.length ?? 0 })
}
