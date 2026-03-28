import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Política de Privacidade — MyNutri',
}

export default function PrivacidadePage() {
  return (
    <main className="min-h-dvh max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft size={16} /> Voltar
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Política de Privacidade</h1>
          <p className="text-sm text-muted-foreground mt-1">Última atualização: março de 2026</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 text-sm leading-relaxed">

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">1. Quais dados coletamos</h2>
          <p>Coletamos apenas o necessário para operar o serviço:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1 text-muted-foreground">
            <li><span className="text-foreground font-medium">E-mail</span> — usado para autenticação e comunicações do serviço</li>
            <li><span className="text-foreground font-medium">Histórico de conversas</span> — mensagens trocadas com a IA</li>
            <li><span className="text-foreground font-medium">Análises</span> — resultados das orientações geradas pela IA</li>
          </ul>
          <p className="text-muted-foreground">
            Histórico e análises são considerados <strong className="text-foreground">dados sensíveis</strong> conforme a LGPD (Lei 13.709/2018),
            pois podem conter informações sobre saúde e alimentação.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">2. Como usamos os dados</h2>
          <p>
            Os dados coletados são usados exclusivamente para operar o MyNutri: autenticar usuários,
            manter o histórico de conversas e melhorar a qualidade do serviço. <strong>Não vendemos,
            alugamos nem compartilhamos seus dados com terceiros</strong> para fins comerciais.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">3. Propriedade dos dados</h2>
          <p>
            Os dados do cliente final (histórico de conversas, análises) <strong>pertencem ao
            próprio cliente</strong>, não ao expert que o convidou. O expert tem acesso apenas às
            informações necessárias para gerenciar seus convites (e-mail e status de ativação).
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">4. Direito de exclusão</h2>
          <p>
            Você pode solicitar a exclusão dos seus dados a qualquer momento enviando um e-mail
            para{' '}
            <a href="mailto:suporte@mynutri.pro" className="text-primary hover:underline">
              suporte@mynutri.pro
            </a>
            . Excluiremos seus dados em até <strong>30 dias</strong> após a confirmação da
            solicitação.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">5. Retenção de dados</h2>
          <p>
            Seus dados são mantidos enquanto sua conta estiver ativa. Após o cancelamento ou
            exclusão da conta, os dados são removidos em até 30 dias, salvo obrigação legal de
            retenção.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">6. Segurança</h2>
          <p>
            Os dados são armazenados na Supabase, infraestrutura de banco de dados Postgres com
            criptografia em trânsito (TLS) e em repouso. O acesso é restrito por autenticação e
            regras de segurança em nível de linha (Row Level Security).
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">7. Cookies</h2>
          <p>
            Usamos apenas cookies de sessão necessários para a autenticação via Supabase. Não
            utilizamos cookies de rastreamento de terceiros ou publicidade.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">8. Contato</h2>
          <p>
            Para dúvidas sobre privacidade ou para exercer seus direitos como titular de dados
            (acesso, correção, exclusão, portabilidade), entre em contato:
          </p>
          <a href="mailto:suporte@mynutri.pro" className="text-primary hover:underline font-medium">
            suporte@mynutri.pro
          </a>
        </section>

      </div>

      <div className="pt-4 border-t border-border">
        <Link href="/termos" className="text-sm text-primary hover:underline">
          Ver Termos de Uso →
        </Link>
      </div>
    </main>
  )
}
