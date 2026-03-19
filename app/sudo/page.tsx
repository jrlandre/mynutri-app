import { adminClient } from '@/lib/supabase/admin'
import { toggleProStatus, changeProPlan } from './actions'

export default async function SudoPage() {
  // adminClient ignora RLS para o admin listar tudo livremente
  const { data: pros, error } = await adminClient
    .from('experts')
    .select('id, name, subdomain, plan, active, is_admin, created_at')
    .order('created_at', { ascending: false })

  if (error || !pros) return <div>Erro ao carregar os Experts.</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gestão de Tenants (Experts)</h1>
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900">
            <tr>
              <th className="p-3">Expert (Nome / Subdomínio)</th>
              <th className="p-3">Status</th>
              <th className="p-3">Plano</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {pros.map(pro => (
              <tr key={pro.id} className="border-t border-neutral-100 dark:border-neutral-700">
                <td className="p-3">
                  <div className="font-semibold">{pro.name}</div>
                  <div className="text-xs text-muted-foreground">{pro.subdomain}</div>
                  {pro.is_admin && <span className="bg-yellow-100 text-yellow-800 text-[10px] px-1.5 py-0.5 rounded ml-2">ADMIN</span>}
                </td>
                <td className="p-3">
                  <form action={toggleProStatus.bind(null, pro.id, !pro.active)}>
                    <button 
                      type="submit"
                      className={`px-2 py-1 rounded text-xs font-medium ${pro.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                    >
                      {pro.active ? 'Ativo' : 'Suspenso'}
                    </button>
                  </form>
                </td>
                <td className="p-3">
                  <form action={changeProPlan.bind(null, pro.id, pro.plan === 'standard' ? 'enterprise' : 'standard')}>
                    <button type="submit" className="underline decoration-dotted text-blue-600">
                      {pro.plan}
                    </button>
                  </form>
                </td>
                <td className="p-3">
                  <span className="text-xs text-neutral-400">Edição Rápida</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}