import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface VerificationEmailProps {
  name: string
  verificationUrl: string
}

export function VerificationEmail({ name, verificationUrl }: VerificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verifica tu cuenta en BDNS Web</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Bienvenido a BDNS Web</Heading>
          
          <Text style={text}>
            Hola {name},
          </Text>
          
          <Text style={text}>
            Gracias por registrarte en BDNS Web. Para completar tu registro y activar tu cuenta,
            por favor verifica tu dirección de email haciendo clic en el siguiente botón:
          </Text>
          
          <Section style={buttonContainer}>
            <Button style={button} href={verificationUrl}>
              Verificar mi email
            </Button>
          </Section>
          
          <Text style={text}>
            O copia y pega este enlace en tu navegador:
          </Text>
          
          <Link href={verificationUrl} style={link}>
            {verificationUrl}
          </Link>
          
          <Text style={text}>
            Este enlace expirará en 24 horas. Si no has solicitado esta verificación,
            puedes ignorar este email.
          </Text>
          
          <Text style={footer}>
            Saludos,<br />
            El equipo de BDNS Web
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '24px',
  margin: '16px 0',
  padding: '0 48px',
}

const text = {
  color: '#555',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
  padding: '0 48px',
}

const buttonContainer = {
  padding: '0 48px',
  margin: '32px 0',
}

const button = {
  backgroundColor: '#1e40af',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
}

const link = {
  color: '#1e40af',
  fontSize: '14px',
  padding: '0 48px',
}

const footer = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '32px 0 0 0',
  padding: '0 48px',
}