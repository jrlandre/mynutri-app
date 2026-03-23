import { createClient } from "@/lib/supabase/server"
import AssinarClient from "./AssinarClient"

export const metadata = {
  title: "Assine o MyNutri",
  description: "Crie seu espaço personalizado e comece a atender seus pacientes com IA.",
}

export default async function AssinarPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "")
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { ref } = await searchParams
  return <AssinarClient appDomain={appDomain} defaultEmail={user?.email ?? ""} defaultRef={ref ?? ""} />
}
