import {
  Html, Head, Body, Container, Section,
  Heading, Text, Button, Hr, Preview,
} from '@react-email/components'

interface Props {
  name: string
  daysRemaining: number
  panelUrl: string
  subscribeUrl: string
  locale?: 'pt' | 'en'
}

const copy = {
  pt: {
    lang: 'pt-BR',
    preview: (days: number) => `Seu trial do MyNutri expira em ${days} dias`,
    heading: (firstName: string) => `Olá, ${firstName}!`,
    body: (days: number) =>
      `Seu período de teste gratuito expira em ${days} ${days === 1 ? 'dia' : 'dias'}. Assine agora para continuar atendendo seus clientes com IA personalizada.`,
    benefits: 'Com o MyNutri, você continua oferecendo respostas 24h com o seu protocolo — sem precisar estar disponível o tempo todo.',
    cta: 'Assinar agora',
    secondary: 'Acessar meu painel',
    footer: 'MyNutri · Dúvidas? Responda este email.',
  },
  en: {
    lang: 'en',
    preview: (days: number) => `Your MyNutri trial expires in ${days} days`,
    heading: (firstName: string) => `Hi, ${firstName}!`,
    body: (days: number) =>
      `Your free trial expires in ${days} ${days === 1 ? 'day' : 'days'}. Subscribe now to keep offering 24/7 AI-powered support to your clients.`,
    benefits: 'With MyNutri, you keep delivering answers around the clock using your protocol — without being available all the time.',
    cta: 'Subscribe now',
    secondary: 'Go to my panel',
    footer: 'MyNutri · Questions? Reply to this email.',
  },
}

export default function TrialEndingEmail({ name, daysRemaining, panelUrl, subscribeUrl, locale = 'pt' }: Props) {
  const firstName = name.split(' ')[0]
  const c = copy[locale] ?? copy.pt

  return (
    <Html lang={c.lang}>
      <Head>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}</style>
      </Head>
      <Preview>{c.preview(daysRemaining)}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>MyNutri</Text>
          </Section>
          <Section style={accentLine}>&nbsp;</Section>

          <Section style={content}>
            <Heading style={h1}>{c.heading(firstName)}</Heading>
            <Text style={text}>{c.body(daysRemaining)}</Text>
            <Text style={text}>{c.benefits}</Text>

            <Section style={{ textAlign: 'center' as const, margin: '32px 0 16px' }}>
              <Button href={subscribeUrl} style={button}>
                {c.cta}
              </Button>
            </Section>

            <Section style={{ textAlign: 'center' as const }}>
              <Button href={panelUrl} style={secondaryButton}>
                {c.secondary}
              </Button>
            </Section>
          </Section>

          <Hr style={hr} />

          <Section>
            <Text style={footer}>{c.footer}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const body = {
  backgroundColor: '#faf8f3',
  fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  margin: '0',
  padding: '40px 0',
}
const container = {
  backgroundColor: '#fffef8',
  borderRadius: '12px',
  maxWidth: '520px',
  margin: '0 auto',
  overflow: 'hidden' as const,
  border: '1px solid #e4dfd7',
}
const header = {
  backgroundColor: '#fffef8',
  padding: '24px 32px',
  borderBottom: '1px solid #e4dfd7',
}
const accentLine = {
  backgroundColor: '#e88c3a',
  height: '3px',
  fontSize: '0',
  lineHeight: '0',
}
const logo = {
  color: '#2a2420',
  fontSize: '18px',
  fontWeight: '800',
  margin: '0',
  letterSpacing: '-0.02em',
}
const content = { padding: '32px 32px 24px' }
const h1 = {
  color: '#2a2420',
  fontSize: '22px',
  fontWeight: '700',
  margin: '0 0 16px',
  letterSpacing: '-0.02em',
}
const text = {
  color: '#2a2420',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const button = {
  backgroundColor: '#e88c3a',
  borderRadius: '10px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block' as const,
}
const secondaryButton = {
  backgroundColor: 'transparent',
  borderRadius: '10px',
  color: '#8b8680',
  fontSize: '13px',
  fontWeight: '500',
  padding: '8px 20px',
  textDecoration: 'none',
  display: 'inline-block' as const,
  border: '1px solid #e4dfd7',
}
const hr = { borderColor: '#e4dfd7', margin: '0' }
const footer = {
  color: '#8b8680',
  fontSize: '12px',
  textAlign: 'center' as const,
  padding: '16px 32px',
  margin: '0',
}
