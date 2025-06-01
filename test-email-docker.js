const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('🧪 Testing email from Docker container...\n');
  
  // Configuration from environment
  const config = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'p.ramirez@malaga2025.org',
      pass: 'awwo wxzm xzsz aeix',
    },
  };

  console.log('📧 Creating transporter...');
  const transporter = nodemailer.createTransporter(config);

  try {
    console.log('🔌 Verifying connection...');
    await transporter.verify();
    console.log('✅ Connection successful!\n');

    console.log('📨 Sending test email...');
    const info = await transporter.sendMail({
      from: '"BDNS Web" <no-reply@eype.es>',
      to: 'p.ramirez@eype.es',
      subject: '✅ BDNS Web - Sistema de Email Configurado',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>¡Sistema de email configurado! 🎉</h2>
          <p>Hola Pablo,</p>
          <p>El sistema de email de BDNS Web está funcionando correctamente.</p>
          <p><strong>Funciones habilitadas:</strong></p>
          <ul>
            <li>✅ Cambio de email con verificación</li>
            <li>✅ Recuperación de contraseña</li>
            <li>✅ Notificaciones de subvenciones</li>
            <li>✅ Verificación de cuenta</li>
          </ul>
          <p>Ya puedes usar la función de cambio de email en tu perfil.</p>
        </div>
      `,
    });

    console.log('✅ Email sent!');
    console.log('📧 Message ID:', info.messageId);
    console.log('\n🎉 Email system is working!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testEmail();