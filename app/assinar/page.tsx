import AssinarClient from "./AssinarClient"

export const metadata = {
  title: "Assine o MyNutri",
  description: "Crie seu espaço personalizado e comece a atender seus pacientes com IA.",
}

export default function AssinarPage() {
  const appDomain = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "")
  return <AssinarClient appDomain={appDomain} />
}
