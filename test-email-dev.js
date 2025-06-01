// Test email functionality in development mode
// Run with: node test-email-dev.js

async function testEmailChange() {
  console.log('🧪 Testing email change API...\n');

  // Test 1: Request email change
  console.log('1️⃣ Requesting email change...');
  const requestResponse = await fetch('http://localhost:3001/api/profile/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Note: In real usage, this would include authentication cookies
    },
    body: JSON.stringify({
      newEmail: 'newemail@example.com'
    })
  });

  const requestData = await requestResponse.json();
  console.log('Response:', requestResponse.status, requestData);

  // Test 2: Check email configuration
  console.log('\n2️⃣ Email configuration:');
  console.log('SMTP_HOST:', process.env.SMTP_HOST || 'Not configured (using console logging)');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'development');

  console.log('\n✅ In development mode, emails are logged to the console.');
  console.log('📧 Check the Docker logs to see email output:');
  console.log('   docker-compose logs -f web-dev | grep "📧"');
}

testEmailChange().catch(console.error);