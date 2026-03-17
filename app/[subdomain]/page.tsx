import { adminClient } from "@/lib/supabase/admin"
import HomeClient from "@/components/HomeClient"

export default async function SubdomainPage({
  params,
}: {
  params: Promise<{ subdomain: string }>
}) {
  const { subdomain } = await params

  const { data } = await adminClient
    .from("nutritionists")
    .select("id")
    .eq("subdomain", subdomain)
    .eq("active", true)
    .maybeSingle()

  if (!data) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Nutricionista não encontrada.</p>
      </main>
    )
  }

  return <HomeClient tenantSubdomain={subdomain} />
}
