import { getTranslations } from 'next-intl/server'
import { adminClient } from '@/lib/supabase/admin'
import ConviteClient from './ConviteClient'

interface Props {
  params: Promise<{ locale: string; token: string }>
}

export default async function ConvitePage({ params }: Props) {
  const { locale, token } = await params
  const t = await getTranslations({ locale, namespace: 'Convite' })

  const { data: client } = await adminClient
    .from('clients')
    .select('id, email, activated_at, expert_id, token_expires_at')
    .eq('magic_link_token', token)
    .maybeSingle()

  if (!client) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-6">
        <div className="text-center flex flex-col gap-2">
          <p className="text-lg font-semibold">{t('invalid_title')}</p>
          <p className="text-sm text-muted-foreground">{t('invalid_desc')}</p>
        </div>
      </main>
    )
  }

  if (client.token_expires_at && new Date(client.token_expires_at as string) < new Date()) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-6">
        <div className="text-center flex flex-col gap-2">
          <p className="text-lg font-semibold">{t('expired_title')}</p>
          <p className="text-sm text-muted-foreground">{t('expired_desc')}</p>
        </div>
      </main>
    )
  }

  if (client.activated_at) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-6">
        <div className="text-center flex flex-col gap-2">
          <p className="text-lg font-semibold">{t('used_title')}</p>
          <p className="text-sm text-muted-foreground">{t('used_desc')}</p>
        </div>
      </main>
    )
  }

  const { data: expert } = await adminClient
    .from('experts')
    .select('name')
    .eq('id', client.expert_id ?? '')
    .maybeSingle()

  return (
    <ConviteClient
      token={token}
      email={client.email ?? ''}
      expertName={expert?.name ?? 'seu Expert'}
    />
  )
}
