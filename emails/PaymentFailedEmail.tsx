import {
  Html, Head, Body, Container, Section,
  Heading, Text, Button, Hr, Preview,
} from '@react-email/components'

interface Props {
  name: string
  billingUrl: string
  locale?: 'pt' | 'en'
}

const copy = {
  pt: {
    lang: 'pt-BR',
    preview: 'Problema com seu pagamento no MyNutri',
    heading: (firstName: string) => `Olá, ${firstName}!`,
    body: 'Identificamos um problema ao processar o pagamento da sua assinatura MyNutri.',
    action: 'Para continuar usando sua conta sem interrupções, atualize seu método de pagamento:',
    cta: 'Atualizar forma de pagamento',
    retry: 'Tentaremos processar o pagamento novamente em breve.',
    footer: 'MyNutri · Dúvidas? Responda este email.',
  },
  en: {
    lang: 'en',
    preview: 'Issue with your MyNutri payment',
    heading: (firstName: string) => `Hi, ${firstName}!`,
    body: 'We noticed an issue processing your MyNutri subscription payment.',
    action: 'To keep your account running without interruption, please update your payment method:',
    cta: 'Update payment method',
    retry: 'We will retry the payment again shortly.',
    footer: 'MyNutri · Questions? Reply to this email.',
  },
}

export default function PaymentFailedEmail({ name, billingUrl, locale = 'pt' }: Props) {
  const firstName = name.split(' ')[0]
  const c = copy[locale] ?? copy.pt

  return (
    <Html lang={c.lang}>
      <Head>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}</style>
      </Head>
      <Preview>{c.preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>MyNutri</Text>
          </Section>
          <Section style={accentLine}>&nbsp;</Section>

          <Section style={content}>
            <Heading style={h1}>{c.heading(firstName)}</Heading>
            <Text style={text}>{c.body}</Text>
            <Text style={text}>{c.action}</Text>

            <Section style={{ textAlign: 'center' as const, margin: '32px 0 16px' }}>
              <Button href={billingUrl} style={button}>
                {c.cta}
              </Button>
            </Section>

            <Text style={{ ...text, color: '#8b8680', fontSize: '13px' }}>{c.retry}</Text>
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
  backgroundColor: '#e84040',
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
  backgroundColor: '#e84040',
  borderRadius: '10px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block' as const,
}
const hr = { borderColor: '#e4dfd7', margin: '0' }
const footer = {
  color: '#8b8680',
  fontSize: '12px',
  textAlign: 'center' as const,
  padding: '16px 32px',
  margin: '0',
}
