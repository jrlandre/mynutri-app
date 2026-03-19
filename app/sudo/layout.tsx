import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReactNode } from 'react'

export default async function SudoLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Verifica se o usuário atual é admin na tabela experts
  const { data: profile } = await supabase
    .from('experts')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (!profile?.is_admin) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900">
      <header className="bg-black text-white p-4">
        <div className="max-w-5xl mx-auto font-bold tracking-tight">
          ⚡ Sudo Panel (God Mode)
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-4 py-8">
        {children}
      </main>
    </div>
  )
}