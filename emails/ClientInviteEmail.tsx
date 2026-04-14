import {
  Html, Head, Body, Container, Section,
  Heading, Text, Button, Hr, Preview,
} from '@react-email/components'

interface Props {
  expertName: string
  inviteUrl: string
  locale?: 'pt' | 'en'
}

const copy = {
  pt: {
    lang: 'pt-BR',
    preview: (name: string) => `${name} te convidou para o MyNutri`,
    heading: 'Você foi convidado!',
    body1: (name: string) => `te convidou para usar o MyNutri — seu assistente de saúde com inteligência artificial.`,
    body2: (name: string) => `Como cliente de ${name}, você terá acesso ilimitado ao MyNutri como parte do seu acompanhamento.`,
    cta: 'Aceitar convite',
    copy_label: 'Ou copie e cole este link no seu navegador:',
    footer: 'MyNutri · Este convite é pessoal e intransferível.',
  },
  en: {
    lang: 'en',
    preview: (name: string) => `${name} invited you to MyNutri`,
    heading: "You've been invited!",
    body1: (name: string) => `invited you to use MyNutri — your AI-powered health assistant.`,
    body2: (name: string) => `As a client of ${name}, you'll have unlimited access to MyNutri as part of your care.`,
    cta: 'Accept invite',
    copy_label: 'Or copy and paste this link into your browser:',
    footer: 'MyNutri · This invite is personal and non-transferable.',
  },
} as const

export default function ClientInviteEmail({ expertName, inviteUrl, locale = 'pt' }: Props) {
  const c = copy[locale] ?? copy.pt

  return (
    <Html lang={c.lang}>
      <Head>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}</style>
      </Head>
      <Preview>{c.preview(expertName)}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>MyNutri</Text>
          </Section>
          <Section style={accentLine}>&nbsp;</Section>

          <Section style={content}>
            <Heading style={h1}>{c.heading}</Heading>
            <Text style={text}>
              <strong>{expertName}</strong> {c.body1(expertName)}
            </Text>
            <Text style={text}>
              {c.body2(expertName)}
            </Text>

            <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
              <Button href={inviteUrl} style={button}>
                {c.cta}
              </Button>
            </Section>

            <Text style={small}>
              {c.copy_label}
            </Text>
            <Text style={link}>{inviteUrl}</Text>
          </Section>

          <Hr style={hr} />

          <Section>
            <Text style={footer}>
              {c.footer}
            </Text>
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
  backgroundColor: '#4b8555',
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

const content = {
  padding: '32px 32px 24px',
}

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
  margin: '0 0 12px',
}

const button = {
  backgroundColor: '#4b8555',
  borderRadius: '10px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block' as const,
}

const small = {
  color: '#8b8680',
  fontSize: '12px',
  margin: '0 0 4px',
}

const link = {
  color: '#4b8555',
  fontSize: '12px',
  wordBreak: 'break-all' as const,
  margin: '0',
}

const hr = {
  borderColor: '#e4dfd7',
  margin: '0',
}

const footer = {
  color: '#8b8680',
  fontSize: '12px',
  textAlign: 'center' as const,
  padding: '16px 32px',
  margin: '0',
}
