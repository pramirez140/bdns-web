# Email Configuration Guide

## Overview

BDNS Web uses email for:
- Account verification
- Password reset
- Email change verification
- Grant notifications (new grants, deadline reminders)

## Development Mode

By default, when no SMTP configuration is provided, emails are logged to the console:

```
📧 Email would be sent: {
  to: 'user@example.com',
  subject: 'Verify your account',
  preview: 'Email content preview...'
}
```

## Production Configuration

### Option 1: Gmail with App Password (Recommended for small projects)

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the generated password

3. **Configure .env.local**:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password-here
SMTP_FROM="BDNS Web" <noreply@yourdomain.com>
```

### Option 2: SendGrid (Recommended for production)

1. **Create SendGrid account** at https://sendgrid.com/
2. **Generate API Key** in Settings > API Keys
3. **Configure .env.local**:
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM="BDNS Web" <noreply@yourdomain.com>
```

### Option 3: Other SMTP Providers

Configure with your provider's settings:
```bash
SMTP_HOST=your-smtp-host.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASSWORD=your-password
SMTP_FROM="BDNS Web" <noreply@yourdomain.com>
```

## Email Templates

### Available Templates

1. **Verification Email** (`/src/emails/verification-email.tsx`)
   - Sent when user registers
   - Contains verification link

2. **New Grants Email** (`/src/emails/new-grants-notification.tsx`)
   - Sent when new matching grants are found
   - Lists grant details with links

3. **Email Change Verification**
   - 6-digit code sent to current email
   - Notification sent to new email

4. **Password Reset**
   - Reset link valid for 1 hour

5. **Deadline Reminder**
   - Sent X days before grant deadline

## Testing Email Configuration

### 1. Test SMTP Connection

Create a test script:
```javascript
// test-email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

transporter.verify()
  .then(() => console.log('✅ SMTP connection successful'))
  .catch(err => console.error('❌ SMTP connection failed:', err));
```

### 2. Test Email Sending

```javascript
// send-test.js
async function sendTest() {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: 'test@example.com',
      subject: 'Test Email',
      text: 'This is a test email from BDNS Web',
      html: '<p>This is a <b>test email</b> from BDNS Web</p>',
    });
    console.log('✅ Test email sent');
  } catch (error) {
    console.error('❌ Failed to send:', error);
  }
}
```

## Email Change Flow

1. **User requests email change**
   - Enters new email address
   - System validates email not in use

2. **Verification code sent**
   - 6-digit code sent to current email
   - Notification sent to new email
   - Code expires in 30 minutes

3. **User enters code**
   - System verifies code
   - Email updated in database
   - User must log in with new email

## Troubleshooting

### Common Issues

**Gmail: "Less secure app access"**
- Use App Password instead of regular password
- Enable 2FA first

**"Connection timeout"**
- Check firewall/port blocking
- Try port 465 with SMTP_SECURE=true

**"Invalid credentials"**
- Double-check username/password
- For Gmail, ensure using App Password

**"Rate limit exceeded"**
- Implement email queuing
- Use professional service (SendGrid, etc.)

### Debug Mode

Enable email debugging:
```javascript
// In email.ts
const transporter = nodemailer.createTransport({
  // ... config
  debug: true,
  logger: true,
});
```

## Security Best Practices

1. **Never commit SMTP credentials**
   - Use environment variables
   - Add .env.local to .gitignore

2. **Use secure connections**
   - Prefer TLS (port 587) over SSL (port 465)
   - Always use encrypted connections

3. **Implement rate limiting**
   - Prevent email bombing
   - Track sends per user

4. **Validate email addresses**
   - Check format before sending
   - Verify domain exists

5. **Monitor bounces**
   - Clean invalid emails
   - Track delivery rates

## Email Service Comparison

| Service | Free Tier | Reliability | Setup Ease |
|---------|-----------|-------------|------------|
| Gmail | 500/day | Good | Easy |
| SendGrid | 100/day | Excellent | Medium |
| Mailgun | 5,000/month | Excellent | Medium |
| AWS SES | 62,000/month* | Excellent | Hard |
| Resend | 3,000/month | Good | Easy |

*From EC2 instances

## Next Steps

1. Configure SMTP in `.env.local`
2. Test with development mode first
3. Verify emails are being sent
4. Monitor delivery rates
5. Set up email templates customization