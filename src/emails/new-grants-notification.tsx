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

interface Grant {
  id: number
  titulo: string
  organoConvocante: string
  presupuestoTotal: number
  fechaFinSolicitud?: string
}

interface NewGrantsEmailProps {
  name: string
  grants: Grant[]
  unsubscribeUrl: string
}

export function NewGrantsEmail({ name, grants, unsubscribeUrl }: NewGrantsEmailProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <Html>
      <Head />
      <Preview>Nuevas convocatorias disponibles en BDNS Web</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Nuevas convocatorias para ti</Heading>
          
          <Text style={text}>
            Hola {name},
          </Text>
          
          <Text style={text}>
            Hemos encontrado {grants.length} nueva{grants.length !== 1 ? 's' : ''} convocatoria{grants.length !== 1 ? 's' : ''} 
            que podrían interesarte:
          </Text>
          
          {grants.map((grant) => (
            <Section key={grant.id} style={grantCard}>
              <Text style={grantTitle}>{grant.titulo}</Text>
              <Text style={grantInfo}>
                <strong>Organismo:</strong> {grant.organoConvocante}<br />
                <strong>Presupuesto:</strong> {formatCurrency(grant.presupuestoTotal)}
                {grant.fechaFinSolicitud && (
                  <>
                    <br />
                    <strong>Fecha límite:</strong> {formatDate(grant.fechaFinSolicitud)}
                  </>
                )}
              </Text>
              <Button 
                style={grantButton} 
                href={`${process.env.NEXT_PUBLIC_API_URL}/convocatoria/${grant.id}`}
              >
                Ver convocatoria
              </Button>
            </Section>
          ))}
          
          <Section style={buttonContainer}>
            <Button 
              style={button} 
              href={`${process.env.NEXT_PUBLIC_API_URL}/?tab=search`}
            >
              Ver todas las convocatorias
            </Button>
          </Section>
          
          <Text style={footer}>
            Recibes este email porque tienes activadas las notificaciones de nuevas convocatorias.<br />
            <Link href={unsubscribeUrl} style={unsubscribeLink}>
              Cancelar suscripción
            </Link>
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

const grantCard = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  margin: '16px 48px',
  padding: '20px',
}

const grantTitle = {
  color: '#333',
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '24px',
  margin: '0 0 12px 0',
}

const grantInfo = {
  color: '#555',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 16px 0',
}

const grantButton = {
  backgroundColor: '#fff',
  border: '1px solid #1e40af',
  borderRadius: '5px',
  color: '#1e40af',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '8px 16px',
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

const footer = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '32px 0 0 0',
  padding: '0 48px',
}

const unsubscribeLink = {
  color: '#666',
  textDecoration: 'underline',
}