import {
  Html, Head, Body, Container, Section,
  Heading, Text, Button, Hr, Preview,
} from '@react-email/components'

interface Props {
  nutritionistName: string
  inviteUrl: string
}

export default function PatientInviteEmail({ nutritionistName, inviteUrl }: Props) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{nutritionistName} te convidou para o MyNutri</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>MyNutri</Text>
          </Section>

          <Section style={content}>
            <Heading style={h1}>Você foi convidado!</Heading>
            <Text style={text}>
              <strong>{nutritionistName}</strong> te convidou para usar o MyNutri —
              seu assistente de nutrição com inteligência artificial.
            </Text>
            <Text style={text}>
              Como paciente de {nutritionistName}, você terá acesso ilimitado ao MyNutri
              como parte do seu acompanhamento nutricional.
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
  backgroundColor: '#f4f4f5',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  margin: '0',
  padding: '40px 0',
}

const container = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  maxWidth: '520px',
  margin: '0 auto',
  overflow: 'hidden' as const,
}

const header = {
  backgroundColor: '#09090b',
  padding: '24px 32px',
}

const logo = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: '700',
  margin: '0',
  letterSpacing: '-0.02em',
}

const content = {
  padding: '32px 32px 24px',
}

const h1 = {
  color: '#09090b',
  fontSize: '22px',
  fontWeight: '700',
  margin: '0 0 16px',
  letterSpacing: '-0.02em',
}

const text = {
  color: '#52525b',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 12px',
}

const button = {
  backgroundColor: '#16a34a',
  borderRadius: '10px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block' as const,
}

const small = {
  color: '#a1a1aa',
  fontSize: '12px',
  margin: '0 0 4px',
}

const link = {
  color: '#16a34a',
  fontSize: '12px',
  wordBreak: 'break-all' as const,
  margin: '0',
}

const hr = {
  borderColor: '#f4f4f5',
  margin: '0',
}

const footer = {
  color: '#a1a1aa',
  fontSize: '12px',
  textAlign: 'center' as const,
  padding: '16px 32px',
  margin: '0',
}
