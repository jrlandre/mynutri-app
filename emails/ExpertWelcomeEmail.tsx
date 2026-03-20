import {
  Html, Head, Body, Container, Section,
  Heading, Text, Button, Hr, Preview,
} from '@react-email/components'

interface Props {
  name: string
  panelUrl: string
}

export default function ExpertWelcomeEmail({ name, panelUrl }: Props) {
  const firstName = name.split(' ')[0]

  return (
    <Html lang="pt-BR">
      <Head>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}</style>
      </Head>
      <Preview>Boas-vindas ao MyNutri, {firstName}! Seu painel está pronto.</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>MyNutri</Text>
          </Section>
          <Section style={accentLine}>&nbsp;</Section>

          <Section style={content}>
            <Heading style={h1}>Boas-vindas, {firstName}!</Heading>
            <Text style={text}>
              Sua conta MyNutri está configurada. A partir de agora, seus clientes têm acesso
              a um assistente de saúde com IA personalizado para o seu acompanhamento.
            </Text>

            <Section style={card}>
              <Text style={cardLabel}>Seu painel</Text>
              <Text style={cardUrl}>{panelUrl}</Text>
            </Section>

            <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
              <Button href={panelUrl} style={button}>
                Acessar meu painel
              </Button>
            </Section>

            <Text style={note}>
              Você também deve ter recebido um email separado para definir sua senha —
              é necessário para acessar o painel pela primeira vez.
            </Text>
          </Section>

          <Hr style={hr} />

          <Section>
            <Text style={footer}>
              MyNutri · Dúvidas? Responda este email.
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
  margin: '0 0 16px',
}

const card = {
  backgroundColor: '#e8f2e6',
  borderRadius: '10px',
  padding: '16px 20px',
  margin: '8px 0',
}

const cardLabel = {
  color: '#8b8680',
  fontSize: '11px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  margin: '0 0 4px',
}

const cardUrl = {
  color: '#4b8555',
  fontSize: '14px',
  fontWeight: '500',
  wordBreak: 'break-all' as const,
  margin: '0',
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

const note = {
  color: '#8b8680',
  fontSize: '13px',
  lineHeight: '1.5',
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
