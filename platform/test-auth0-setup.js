// Test script to verify Auth0 setup
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Auth0 Configuration Check:');
console.log('─'.repeat(50));

const requiredVars = [
  'AUTH0_SECRET',
  'AUTH0_BASE_URL', 
  'AUTH0_ISSUER_BASE_URL',
  'AUTH0_CLIENT_ID',
  'AUTH0_CLIENT_SECRET'
];

let allValid = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value && value !== 'TEMP_CLIENT_ID' && value !== 'TEMP_CLIENT_SECRET' ? '✅' : '❌';
  const displayValue = value ? (value.length > 20 ? value.substring(0,20) + '...' : value) : 'MISSING';
  
  console.log(`${status} ${varName}: ${displayValue}`);
  
  if (!value || value.startsWith('TEMP_')) {
    allValid = false;
  }
});

console.log('─'.repeat(50));
console.log(allValid ? '🎉 Auth0 setup is complete!' : '⚠️  Please update TEMP values with real Auth0 credentials');

if (!allValid) {
  console.log('\n📋 Next steps:');
  console.log('1. Create Auth0 application at: https://manage.auth0.com/dashboard/us/dev-5nsd46x216u3wri5/applications');
  console.log('2. Update AUTH0_CLIENT_ID and AUTH0_CLIENT_SECRET in .env.local');
  console.log('3. Run this test again: node test-auth0-setup.js');
}