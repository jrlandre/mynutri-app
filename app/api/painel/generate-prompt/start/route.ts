import { NextRequest } from 'next/server'
import { requireExpert, isResponse } from '@/lib/painel/guard'
import { adminClient } from '@/lib/supabase/admin'

export const maxDuration = 60
export const runtime = 'nodejs'

const ALLOWED_EXT = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.mp3', '.wav', '.mp4', '.txt', '.md'])

export async function POST(request: NextRequest) {
  const guard = await requireExpert()
  if (isResponse(guard)) return guard as unknown as Response

  const { expert } = guard
  const expertId = expert.id

  let paths: unknown[], fileSizes: unknown[]
  try {
    const body = await request.json()
    paths = body.paths
    fileSizes = body.fileSizes
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  if (
    !Array.isArray(paths) || !Array.isArray(fileSizes) ||
    paths.length === 0 || paths.length > 10 || paths.length !== fileSizes.length ||
    !paths.every((p: unknown) =>
      typeof p === 'string' &&
      p.startsWith(`${expertId}/`) &&
      !p.includes('..') &&
      ALLOWED_EXT.has(p.substring(p.lastIndexOf('.')).toLowerCase())
    ) ||
    fileSizes.some((s: unknown) => typeof s !== 'number' || s <= 0) ||
    (fileSizes as number[]).reduce((a, b) => a + b, 0) > 15 * 1024 * 1024
  ) {
    return Response.json({ error: 'invalid_files' }, { status: 400 })
  }

  const { data: rawResult, error } = await adminClient.rpc('try_start_prompt_job', {
    p_expert_id: expertId,
    p_paths: paths as string[],
  })

  const result = rawResult as { granted: boolean; job_id: string; uses_remaining: number } | null
  if (error || !result?.granted) {
    return Response.json({ error: 'limit_reached' }, { status: 429 })
  }

  return Response.json({ job_id: result.job_id, uses_remaining: result.uses_remaining })
}
