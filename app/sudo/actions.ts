'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: profile } = await supabase
    .from('experts')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (!profile?.is_admin) throw new Error('Acesso negado: Requer privilégios Sudo')
}

export async function toggleExpertStatus(expertId: string, newStatus: boolean) {
  await checkAdmin()
  await adminClient.from('experts').update({ active: newStatus }).eq('id', expertId)
  revalidatePath('/sudo')
}

export async function changeExpertPlan(expertId: string, newPlan: 'standard' | 'enterprise') {
  await checkAdmin()
  await adminClient.from('experts').update({ plan: newPlan }).eq('id', expertId)
  revalidatePath('/sudo')
}
