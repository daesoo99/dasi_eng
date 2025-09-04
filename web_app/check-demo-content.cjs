// Check actual content of curriculum demo page
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3500,
  path: '/curriculum-demo',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 Response content:');
    console.log('='.repeat(50));
    console.log(data);
    console.log('='.repeat(50));
    
    // Check for key indicators
    if (data.includes('<!DOCTYPE html>')) {
      console.log('✅ HTML document structure found');
    }
    if (data.includes('curriculum')) {
      console.log('✅ Contains "curriculum" text');  
    }
    if (data.includes('DaSi English')) {
      console.log('✅ App title found');
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Error:', err.message);
});

req.end();