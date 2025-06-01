import nodemailer from 'nodemailer'
import { render } from '@react-email/render'
import { VerificationEmail } from '@/emails/verification-email'
import { NewGrantsEmail } from '@/emails/new-grants-notification'

// Create reusable transporter
const createTransporter = (): any => {
  // For development, use console logging
  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
    return {
      sendMail: async (options: any) => {
        console.log('📧 Email would be sent:', {
          to: options.to,
          subject: options.subject,
          preview: options.text?.substring(0, 100) + '...',
        })
        return { messageId: 'dev-' + Date.now() }
      }
    }
  }

  // For production, use SMTP
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  })
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  verificationToken: string
) {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify?token=${verificationToken}`
  
  const emailHtml = await render(
    VerificationEmail({ name, verificationUrl })
  )

  const transporter = createTransporter()

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"BDNS Web" <noreply@bdnsweb.es>',
      to,
      subject: 'Verifica tu cuenta en BDNS Web',
      html: emailHtml,
      text: `Hola ${name}, verifica tu cuenta visitando: ${verificationUrl}`,
    })

    console.log('Verification email sent:', (info as any).messageId)
    return { success: true, messageId: (info as any).messageId }
  } catch (error) {
    console.error('Error sending verification email:', error)
    return { success: false, error }
  }
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetToken: string
) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`
  
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Restablecer contraseña</h2>
      <p>Hola ${name},</p>
      <p>Has solicitado restablecer tu contraseña en BDNS Web.</p>
      <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 5px;">
        Restablecer contraseña
      </a>
      <p>O copia y pega este enlace en tu navegador:</p>
      <p>${resetUrl}</p>
      <p>Este enlace expirará en 1 hora.</p>
      <p>Si no has solicitado este cambio, puedes ignorar este email.</p>
    </div>
  `

  const transporter = createTransporter()

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"BDNS Web" <noreply@bdnsweb.es>',
      to,
      subject: 'Restablecer contraseña - BDNS Web',
      html: emailHtml,
      text: `Hola ${name}, restablece tu contraseña visitando: ${resetUrl}`,
    })

    return { success: true, messageId: (info as any).messageId }
  } catch (error) {
    console.error('Error sending password reset email:', error)
    return { success: false, error }
  }
}

export async function sendNewGrantsNotification(
  to: string,
  name: string,
  grants: Array<{
    id: number
    titulo: string
    organoConvocante: string
    presupuestoTotal: number
    fechaFinSolicitud?: string
  }>
) {
  const unsubscribeUrl = `${process.env.NEXTAUTH_URL}/settings/notifications`
  
  const emailHtml = await render(
    NewGrantsEmail({ name, grants, unsubscribeUrl })
  )

  const transporter = createTransporter()

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"BDNS Web" <noreply@bdnsweb.es>',
      to,
      subject: `${grants.length} nueva${grants.length !== 1 ? 's' : ''} convocatoria${grants.length !== 1 ? 's' : ''} disponible${grants.length !== 1 ? 's' : ''}`,
      html: emailHtml,
      text: `Hola ${name}, hay ${grants.length} nueva${grants.length !== 1 ? 's' : ''} convocatoria${grants.length !== 1 ? 's' : ''} disponible${grants.length !== 1 ? 's' : ''} en BDNS Web.`,
    })

    return { success: true, messageId: (info as any).messageId }
  } catch (error) {
    console.error('Error sending new grants notification:', error)
    return { success: false, error }
  }
}

export async function sendDeadlineReminder(
  to: string,
  name: string,
  grant: {
    id: number
    titulo: string
    organoConvocante: string
    fechaFinSolicitud: string
  },
  daysRemaining: number
) {
  const grantUrl = `${process.env.NEXTAUTH_URL}/convocatoria/${grant.id}`
  
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>⏰ Recordatorio: Convocatoria próxima a cerrar</h2>
      <p>Hola ${name},</p>
      <p>Te recordamos que la siguiente convocatoria cierra en <strong>${daysRemaining} día${daysRemaining !== 1 ? 's' : ''}</strong>:</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${grant.titulo}</h3>
        <p><strong>Organismo:</strong> ${grant.organoConvocante}</p>
        <p><strong>Fecha límite:</strong> ${new Date(grant.fechaFinSolicitud).toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}</p>
      </div>
      <a href="${grantUrl}" style="display: inline-block; padding: 10px 20px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 5px;">
        Ver convocatoria
      </a>
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Recibes este recordatorio porque tienes esta convocatoria en tu lista de seguimiento.
      </p>
    </div>
  `

  const transporter = createTransporter()

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"BDNS Web" <noreply@bdnsweb.es>',
      to,
      subject: `⏰ Recordatorio: "${grant.titulo}" cierra en ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''}`,
      html: emailHtml,
      text: `Hola ${name}, la convocatoria "${grant.titulo}" cierra en ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''}. Visita: ${grantUrl}`,
    })

    return { success: true, messageId: (info as any).messageId }
  } catch (error) {
    console.error('Error sending deadline reminder:', error)
    return { success: false, error }
  }
}

export async function sendEmailChangeVerification(
  currentEmail: string,
  newEmail: string,
  name: string,
  verificationCode: string
) {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff !important; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3); text-decoration: none; font-family: Arial, Helvetica, sans-serif;"><font color="#ffffff"><span style="color: #ffffff !important;">BDNS Web</span></font></h1>
                  <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">Verificación de cambio de email</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    Hola <strong>${name}</strong>,
                  </p>
                  
                  <p style="margin: 0 0 30px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    Has solicitado cambiar tu email de:
                  </p>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                    <tr>
                      <td style="background-color: #f9fafb; padding: 15px 20px; border-radius: 8px; border-left: 4px solid #2563eb;">
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">Email actual:</p>
                        <p style="margin: 5px 0 0 0; color: #1f2937; font-size: 16px; font-weight: 600;">${currentEmail}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; text-align: center;">
                        <span style="color: #9ca3af; font-size: 20px;">↓</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="background-color: #f0fdf4; padding: 15px 20px; border-radius: 8px; border-left: 4px solid #10b981;">
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">Nuevo email:</p>
                        <p style="margin: 5px 0 0 0; color: #1f2937; font-size: 16px; font-weight: 600;">${newEmail}</p>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    Para confirmar este cambio, introduce el siguiente código de verificación:
                  </p>
                  
                  <!-- Verification Code -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                    <tr>
                      <td align="center" style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 30px; border-radius: 12px; border: 2px dashed #3b82f6;">
                        <p style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                          Código de verificación
                        </p>
                        <h2 style="margin: 0; color: #1e3a8a; font-size: 48px; font-weight: 700; letter-spacing: 8px;">
                          ${verificationCode}
                        </h2>
                        <p style="margin: 10px 0 0 0; color: #64748b; font-size: 14px;">
                          Válido por 30 minutos
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Warning -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
                    <tr>
                      <td style="background-color: #fef2f2; padding: 15px 20px; border-radius: 8px; border-left: 4px solid #ef4444;">
                        <p style="margin: 0; color: #dc2626; font-size: 14px; font-weight: 600;">
                          ⚠️ Importante
                        </p>
                        <p style="margin: 5px 0 0 0; color: #7f1d1d; font-size: 14px; line-height: 1.5;">
                          Si no has solicitado este cambio, ignora este mensaje y tu email no será modificado.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                    Este email fue enviado desde BDNS Web
                  </p>
                  <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                    © 2025 BDNS Web. Todos los derechos reservados.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  const transporter = createTransporter()

  try {
    // Send to current email
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"BDNS Web" <noreply@bdnsweb.es>',
      to: currentEmail,
      subject: 'Verificación de cambio de email - BDNS Web',
      html: emailHtml,
      text: `Hola ${name}, tu código de verificación es: ${verificationCode}`,
    })

    // Also send notification to new email
    const newEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Confirmación de nuevo email</h2>
        <p>Hola ${name},</p>
        <p>Se ha solicitado usar este email (<strong>${newEmail}</strong>) para tu cuenta en BDNS Web.</p>
        <p>El código de verificación ha sido enviado a tu email actual: <strong>${currentEmail}</strong></p>
        <p>Una vez verificado, podrás acceder con este nuevo email.</p>
        <p style="color: #dc2626; font-weight: bold;">⚠️ Si no has solicitado este cambio, ignora este mensaje.</p>
      </div>
    `

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"BDNS Web" <noreply@bdnsweb.es>',
      to: newEmail,
      subject: 'Confirmación de nuevo email - BDNS Web',
      html: newEmailHtml,
      text: `Hola ${name}, se ha solicitado usar este email para tu cuenta en BDNS Web.`,
    })

    return { success: true }
  } catch (error) {
    console.error('Error sending email change verification:', error)
    return { success: false, error }
  }
}

export async function send2FACode(
  to: string,
  name: string,
  verificationCode: string
) {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff !important; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3); text-decoration: none; font-family: Arial, Helvetica, sans-serif;"><font color="#ffffff"><span style="color: #ffffff !important;">BDNS Web</span></font></h1>
                  <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">Código de verificación 2FA</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    Hola <strong>${name}</strong>,
                  </p>
                  
                  <p style="margin: 0 0 30px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    Has intentado iniciar sesión en tu cuenta de BDNS Web. Para completar el proceso de autenticación, introduce el siguiente código de verificación:
                  </p>
                  
                  <!-- Verification Code -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                    <tr>
                      <td align="center" style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 30px; border-radius: 12px; border: 2px dashed #3b82f6;">
                        <p style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                          Código de verificación 2FA
                        </p>
                        <h2 style="margin: 0; color: #1e3a8a; font-size: 48px; font-weight: 700; letter-spacing: 8px;">
                          ${verificationCode}
                        </h2>
                        <p style="margin: 10px 0 0 0; color: #64748b; font-size: 14px;">
                          Válido por 10 minutos
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Warning -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
                    <tr>
                      <td style="background-color: #fef2f2; padding: 15px 20px; border-radius: 8px; border-left: 4px solid #ef4444;">
                        <p style="margin: 0; color: #dc2626; font-size: 14px; font-weight: 600;">
                          🔒 Seguridad
                        </p>
                        <p style="margin: 5px 0 0 0; color: #7f1d1d; font-size: 14px; line-height: 1.5;">
                          Si no has sido tú quien ha intentado iniciar sesión, tu cuenta puede estar comprometida. Cambia tu contraseña inmediatamente.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                    Este email fue enviado desde BDNS Web
                  </p>
                  <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                    © 2025 BDNS Web. Todos los derechos reservados.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  const transporter = createTransporter()

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"BDNS Web" <noreply@bdnsweb.es>',
      to,
      subject: 'Código de verificación 2FA - BDNS Web',
      html: emailHtml,
      text: `Hola ${name}, tu código de verificación 2FA es: ${verificationCode}`,
    })

    return { success: true, messageId: (info as any).messageId }
  } catch (error) {
    console.error('Error sending 2FA code:', error)
    return { success: false, error }
  }
}