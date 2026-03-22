import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (adminClient as any).rpc('check_user_has_password', { p_email: user.email })

  const providers = (user.app_metadata?.providers ?? []) as string[]
  const hasGoogleLinked = providers.includes('google')

  return NextResponse.json({ hasPassword: data === true, hasGoogleLinked })
}
