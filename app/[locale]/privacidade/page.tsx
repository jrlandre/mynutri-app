import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { ChevronLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Política de Privacidade — MyNutri',
  alternates: { canonical: 'https://mynutri.pro/privacidade' },
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
          <p className="text-sm text-muted-foreground mt-1">Última atualização: abril de 2026</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 text-sm leading-relaxed">

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">1. Dados coletados</h2>
          <p>Coletamos apenas o necessário para operar o serviço:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1 text-muted-foreground">
            <li><span className="text-foreground font-medium">E-mail</span> — autenticação e comunicações do serviço</li>
            <li><span className="text-foreground font-medium">Histórico de conversas e análises</span> — mensagens e orientações geradas pela IA</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">2. Como usamos os dados</h2>
          <p>
            Os dados são usados exclusivamente para operar e melhorar o MyNutri. Utilizamos
            subcontratantes técnicos necessários à operação do serviço, que atuam como processadores
            de dados sob nossa instrução. A lista de subcontratantes está disponível mediante
            solicitação via{' '}
            <a href="mailto:suporte@mynutri.pro" className="text-primary hover:underline">
              suporte@mynutri.pro
            </a>
            .
          </p>
          <p>
            <strong>Não vendemos nem compartilhamos</strong> seus dados com terceiros para fins
            comerciais.
          </p>
          <p>
            Nas páginas de marketing, utilizamos ferramentas de análise de campanha para medir a
            eficácia dos anúncios. Essas ferramentas não têm acesso ao seu histórico de conversas.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">3. Propriedade dos dados</h2>
          <p>
            Os dados do cliente final (histórico de conversas, análises) <strong>pertencem ao
            próprio cliente</strong>. O nutricionista tem acesso apenas às informações necessárias
            para gerenciar seus convites (e-mail e status de ativação).
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">4. Seus direitos</h2>
          <p>
            Você pode solicitar acesso, correção, portabilidade ou exclusão dos seus dados a qualquer
            momento pelo e-mail{' '}
            <a href="mailto:suporte@mynutri.pro" className="text-primary hover:underline">
              suporte@mynutri.pro
            </a>
            . Atendemos as solicitações em prazo razoável conforme a LGPD.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">5. Segurança</h2>
          <p>
            Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados contra
            acesso não autorizado, perda ou destruição.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">6. Cookies</h2>
          <p>Utilizamos cookies para três finalidades:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1 text-muted-foreground">
            <li><span className="text-foreground font-medium">Funcionais</span> — manter sua sessão e preferências (necessários para o serviço)</li>
            <li><span className="text-foreground font-medium">Analíticos</span> — métricas de uso do produto, sem dados de saúde</li>
            <li><span className="text-foreground font-medium">Marketing</span> — medição de campanhas publicitárias, presentes apenas nas páginas de marketing</li>
          </ul>
          <p className="text-muted-foreground">
            Você pode desabilitar cookies de terceiros nas configurações do seu navegador.
          </p>
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
