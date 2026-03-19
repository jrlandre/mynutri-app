import { adminClient } from '@/lib/supabase/admin'
import ConviteClient from './ConviteClient'

interface Props {
  params: Promise<{ token: string }>
}

export default async function ConvitePage({ params }: Props) {
  const { token } = await params

  const { data: client } = await adminClient
    .from('clients')
    .select('id, email, activated_at, expert_id')
    .eq('magic_link_token', token)
    .maybeSingle()

  if (!client) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-6">
        <div className="text-center flex flex-col gap-2">
          <p className="text-lg font-semibold">Convite inválido</p>
          <p className="text-sm text-muted-foreground">Este link não existe ou já expirou.</p>
        </div>
      </main>
    )
  }

  if (client.activated_at) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-6">
        <div className="text-center flex flex-col gap-2">
          <p className="text-lg font-semibold">Convite já utilizado</p>
          <p className="text-sm text-muted-foreground">Sua conta já está ativa.</p>
        </div>
      </main>
    )
  }

  const { data: expert } = await adminClient
    .from('experts')
    .select('name')
    .eq('id', client.expert_id)
    .maybeSingle()

  return (
    <ConviteClient
      token={token}
      email={client.email ?? ''}
      expertName={expert?.name ?? 'seu Expert'}
    />
  )
}
