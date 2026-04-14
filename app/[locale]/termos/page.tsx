import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { ChevronLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Termos de Uso — MyNutri',
  alternates: { canonical: 'https://mynutri.pro/termos' },
}

export default function TermosPage() {
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
          <h1 className="text-2xl font-extrabold tracking-tight">Termos de Uso</h1>
          <p className="text-sm text-muted-foreground mt-1">Última atualização: abril de 2026</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 text-sm leading-relaxed">

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">1. O serviço</h2>
          <p>
            O MyNutri é uma plataforma de orientação nutricional com inteligência artificial que conecta
            nutricionistas com seus clientes. Dúvidas e solicitações:{' '}
            <a href="mailto:suporte@mynutri.pro" className="text-primary hover:underline">
              suporte@mynutri.pro
            </a>
            .
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">2. Orientação, não diagnóstico</h2>
          <p>
            O MyNutri oferece <strong>orientação nutricional</strong> com base no método do nutricionista
            escolhido. Ele <strong>não substitui consulta médica, diagnóstico clínico ou tratamento de
            saúde</strong>. Em caso de dúvidas sobre condições de saúde específicas, consulte um
            profissional habilitado.
          </p>
          <p>
            As respostas geradas pela inteligência artificial são probabilísticas e <strong>podem conter
            imprecisões</strong>. O usuário é responsável por validar qualquer orientação com seu
            profissional de saúde antes de adotá-la.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">3. Plano e cancelamento</h2>
          <p>
            O nutricionista contrata um plano via Stripe. O cancelamento pode ser feito a qualquer
            momento pelo painel ou pelo suporte. Ao cancelar, o ambiente personalizado é desativado.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">4. Lei aplicável</h2>
          <p>
            Estes termos são regidos pela legislação brasileira. Fica eleito o foro da comarca de
            São Paulo/SP para resolução de conflitos, salvo disposição legal em contrário.
          </p>
        </section>

      </div>

      <div className="pt-4 border-t border-border">
        <Link href="/privacidade" className="text-sm text-primary hover:underline">
          Ver Política de Privacidade →
        </Link>
      </div>
    </main>
  )
}
