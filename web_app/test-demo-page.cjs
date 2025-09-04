// Test if the curriculum demo page is accessible
const http = require('http');

console.log('🧪 Testing CurriculumDemo page accessibility...');

const options = {
  hostname: 'localhost',
  port: 3500,
  path: '/curriculum-demo',
  method: 'GET',
  headers: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  }
};

const req = http.request(options, (res) => {
  console.log(`📊 Status: ${res.statusCode}`);
  console.log(`📋 Headers:`, Object.keys(res.headers));
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`📄 Response length: ${data.length} characters`);
    
    if (res.statusCode === 200) {
      if (data.includes('새로운 커리큘럼 아키텍처 데모')) {
        console.log('✅ CurriculumDemo component loaded successfully!');
      } else if (data.includes('<!DOCTYPE html>')) {
        console.log('✅ HTML page loaded, React components should render');
      } else {
        console.log('⚠️  Unexpected response content');
      }
    } else {
      console.log(`❌ HTTP Error: ${res.statusCode}`);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Request failed:', err.message);
  if (err.code === 'ECONNREFUSED') {
    console.log('💡 Make sure the dev server is running on port 3500');
  }
});

req.setTimeout(5000, () => {
  console.log('⏰ Request timed out');
  req.destroy();
});

req.end();

console.log('🚀 Sending request to http://localhost:3500/curriculum-demo');