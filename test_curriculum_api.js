const fetch = require('node-fetch');

// Test the curriculum API
async function testCurriculumAPI() {
  console.log('Testing Curriculum API...\n');
  
  // Test L4 REVISED file
  try {
    const response = await fetch('http://localhost:4002/patterns/level_4_advanced_expressions/lv4_stage_system_REVISED.json');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ L4 REVISED file loaded successfully');
      console.log(`   - Total stages: ${data.total_stages}`);
      console.log(`   - Total phases: ${data.total_phases}`);
      console.log(`   - Title: ${data.title}`);
      
      // Check if bridge stages exist
      const bridgeStages = data.stages?.filter(s => s.stage_id?.includes('-A'));
      console.log(`   - Bridge stages: ${bridgeStages?.length || 0}`);
      
      return true;
    } else {
      console.log('❌ Failed to load L4 REVISED file:', response.statusText);
      return false;
    }
  } catch (error) {
    console.log('❌ Error loading L4 REVISED file:', error.message);
    return false;
  }
}

testCurriculumAPI().then(success => {
  console.log(`\nTest result: ${success ? 'PASSED' : 'FAILED'}`);
});