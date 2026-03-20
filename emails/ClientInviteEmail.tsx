import {
  Html, Head, Body, Container, Section,
  Heading, Text, Button, Hr, Preview,
} from '@react-email/components'

interface Props {
  expertName: string
  inviteUrl: string
}

export default function ClientInviteEmail({ expertName, inviteUrl }: Props) {
  return (
    <Html lang="pt-BR">
      <Head>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}</style>
      </Head>
      <Preview>{expertName} te convidou para o MyNutri</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>MyNutri</Text>
          </Section>
          <Section style={accentLine}>&nbsp;</Section>

          <Section style={content}>
            <Heading style={h1}>Você foi convidado!</Heading>
            <Text style={text}>
              <strong>{expertName}</strong> te convidou para usar o MyNutri —
              seu assistente de saúde com inteligência artificial.
            </Text>
            <Text style={text}>
              Como cliente de {expertName}, você terá acesso ilimitado ao MyNutri
              como parte do seu acompanhamento.
            </Text>

            <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
              <Button href={inviteUrl} style={button}>
                Aceitar convite
              </Button>
            </Section>

            <Text style={small}>
              Ou copie e cole este link no seu navegador:
            </Text>
            <Text style={link}>{inviteUrl}</Text>
          </Section>

          <Hr style={hr} />

          <Section>
            <Text style={footer}>
              MyNutri · Este convite é pessoal e intransferível.
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
