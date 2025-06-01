// Test email sending with configured SMTP

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('🧪 Testing email configuration...\n');
  
  // Show configuration (hiding password)
  console.log('📧 Email Configuration:');
  console.log('  Host:', process.env.SMTP_HOST);
  console.log('  Port:', process.env.SMTP_PORT);
  console.log('  User:', process.env.SMTP_USER);
  console.log('  From:', process.env.SMTP_FROM);
  console.log('  Password:', '****' + process.env.SMTP_PASSWORD?.slice(-4));
  console.log('');

  // Create transporter
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  try {
    // Verify connection
    console.log('🔌 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');

    // Send test email
    console.log('📨 Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"BDNS Web" <no-reply@eype.es>',
      to: 'p.ramirez@eype.es', // Sending to your eype.es address
      subject: '✅ BDNS Web - Email Configuration Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>¡Email configurado correctamente! 🎉</h2>
          <p>Hola Pablo,</p>
          <p>Este es un email de prueba desde el sistema BDNS Web.</p>
          <p>La configuración de email está funcionando correctamente:</p>
          <ul>
            <li>✅ Conexión SMTP establecida</li>
            <li>✅ Autenticación exitosa</li>
            <li>✅ Envío de emails activo</li>
          </ul>
          <p>Ahora puedes usar las siguientes funciones:</p>
          <ul>
            <li>Cambio de email con verificación</li>
            <li>Recuperación de contraseña</li>
            <li>Notificaciones de subvenciones</li>
            <li>Verificación de cuenta</li>
          </ul>
          <hr style="margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">
            Este email fue enviado desde BDNS Web usando Gmail SMTP.
          </p>
        </div>
      `,
      text: 'Email configurado correctamente! La configuración de BDNS Web está funcionando.',
    });

    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('\n🎉 Email system is ready to use!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nPossible issues:');
    console.error('- Check if the app password is correct');
    console.error('- Ensure 2FA is enabled on your Google account');
    console.error('- Try regenerating the app password');
  }
}

testEmail();