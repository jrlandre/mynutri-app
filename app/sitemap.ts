import type { MetadataRoute } from 'next'
import { adminClient } from '@/lib/supabase/admin'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://mynutri.pro'

  const { data: experts } = await adminClient
    .from('experts')
    .select('subdomain')
    .eq('active', true)
    .eq('listed', true)

  const expertUrls: MetadataRoute.Sitemap = (experts ?? []).map(e => ({
    url: `${base}/experts/${e.subdomain}`,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [
    { url: `${base}/`,           changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/descubra`,   changeFrequency: 'monthly', priority: 1.0 },
    { url: `${base}/experts`,    changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/assinar`,    changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/termos`,     changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/privacidade`, changeFrequency: 'monthly', priority: 0.5 },
    ...expertUrls,
  ]
}
