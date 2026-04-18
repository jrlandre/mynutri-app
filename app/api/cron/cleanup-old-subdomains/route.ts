import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = process.env.VERCEL_API_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  if (!token || !projectId) {
    return NextResponse.json({ error: 'Vercel API not configured' }, { status: 500 })
  }

  // Find experts whose subdomain changed > 30 days ago and still have a previous_subdomain
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: experts, error } = await adminClient
    .from('experts')
    .select('id, previous_subdomain')
    .not('previous_subdomain', 'is', null)
    .lte('last_subdomain_change_at', cutoff)

  if (error) {
    logger.error('cron/cleanup-old-subdomains', 'Erro ao buscar experts', { error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!experts?.length) {
    return NextResponse.json({ removed: 0 })
  }

  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '')
  let removed = 0
  let failed = 0

  for (const expert of experts) {
    const oldSubdomain = expert.previous_subdomain as string
    const fqdn = `${oldSubdomain}.${appDomain}`

    try {
      const res = await fetch(`https://api.vercel.com/v10/projects/${projectId}/domains/${fqdn}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok || res.status === 404) {
        await adminClient
          .from('experts')
          .update({ previous_subdomain: null })
          .eq('id', expert.id)

        removed++
        logger.info('cron/cleanup-old-subdomains', 'Domínio antigo removido', { fqdn, expertId: expert.id })
      } else {
        failed++
        logger.warn('cron/cleanup-old-subdomains', 'Falha ao remover domínio', { fqdn, status: res.status })
      }
    } catch (err) {
      failed++
      logger.error('cron/cleanup-old-subdomains', 'Erro ao remover domínio', { error: err, fqdn })
    }
  }

  return NextResponse.json({ removed, failed })
}
