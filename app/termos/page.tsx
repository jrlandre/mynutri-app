import type { Metadata } from 'next'
import Link from 'next/link'
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
          <p className="text-sm text-muted-foreground mt-1">Última atualização: março de 2026</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 text-sm leading-relaxed">

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">1. Quem somos</h2>
          <p>
            O MyNutri é uma plataforma de orientação nutricional com inteligência artificial,
            operada por pessoa física com CNPJ em processo de abertura. Dúvidas e solicitações:
            <a href="mailto:suporte@mynutri.pro" className="text-primary hover:underline ml-1">
              suporte@mynutri.pro
            </a>
            .
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">2. O que é o serviço</h2>
          <p>
            O MyNutri conecta experts com seus
            clientes finais. O expert configura uma IA com seu método, linguagem e foco — e seus
            clientes usam essa IA para tirar dúvidas e obter orientações personalizadas.
          </p>
          <p>
            O serviço funciona via subdomínio exclusivo do expert (ex:{' '}
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
              seunome.mynutri.pro
            </span>
            ) e também pelo aplicativo principal em{' '}
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">mynutri.pro</span>.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">3. Requisito de idade</h2>
          <p>
            O uso do MyNutri é restrito a pessoas com <strong>18 anos ou mais</strong>. Ao criar
            uma conta, você confirma que atende a esse requisito.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">4. Orientação, não diagnóstico</h2>
          <p>
            O MyNutri oferece <strong>orientação nutricional geral</strong> com base no método do
            expert escolhido. Ele <strong>não substitui consulta médica, diagnóstico clínico ou
            tratamento de saúde</strong>. Em caso de dúvidas sobre condições de saúde específicas,
            consulte um profissional habilitado.
          </p>
          <p>
            As respostas geradas pela inteligência artificial são probabilísticas e <strong>podem
            conter imprecisões</strong>. O usuário é responsável por validar qualquer orientação
            com seu profissional de saúde antes de adotá-la.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">5. Responsabilidades do expert</h2>
          <p>
            O expert é responsável por configurar corretamente a IA com informações precisas e
            adequadas ao seu método. Ele também é responsável por convidar apenas clientes que
            concordam com estes termos e que estejam aptos a usar o serviço.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">6. Planos e cancelamento</h2>
          <p>
            O expert contrata um plano mensal ou anual via Stripe. O cancelamento pode ser feito
            a qualquer momento pelo painel ou pelo suporte.
          </p>
          <p>
            Ao cancelar, o ambiente personalizado do expert é desativado e o subdomínio sai do ar.
            Os clientes vinculados serão notificados e poderão continuar usando o MyNutri pelo plano
            gratuito (3 orientações por dia), sem as configurações do expert.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-base">7. Foro e lei aplicável</h2>
          <p>
            Estes termos são regidos pela legislação brasileira. Fica eleito o foro da cidade de
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
