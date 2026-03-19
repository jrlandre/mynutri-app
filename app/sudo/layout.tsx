import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronLeft, ShieldCheck } from 'lucide-react'

export default async function SudoLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: profile } = await adminClient
    .from('experts')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) {
    redirect('/')
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <span className="text-sm font-semibold flex items-center gap-1.5">
            <ShieldCheck size={15} /> Sudo
          </span>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 pb-12">
        {children}
      </main>
    </div>
  )
}
