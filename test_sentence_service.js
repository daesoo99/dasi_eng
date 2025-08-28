// Test script for sentence service functionality

async function testSentenceService() {
  const testCases = [
    { level: 4, stageId: 'Lv4-A1-S01', expectedPath: '/patterns/level_4_situational/Lv4-A1-S01_bank.json' },
    { level: 2, stageId: 'Lv2-P1-S01', expectedPath: '/patterns/banks/level_2/Lv2-P1-S01_bank.json' },
    { level: 3, stageId: 'Lv3-P1-S01', expectedPath: '/patterns/banks/level_3/Lv3-P1-S01_bank.json' },
  ];

  console.log('🧪 Testing sentence service data sources...\n');

  for (const testCase of testCases) {
    console.log(`\n🔍 Testing: Level ${testCase.level}, Stage ${testCase.stageId}`);
    console.log(`Expected path: ${testCase.expectedPath}`);
    
    try {
      // Test direct file access
      const response = await fetch(`http://localhost:3501${testCase.expectedPath}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ File found: ${data.sentences ? data.sentences.length : 0} sentences`);
        console.log(`   Stage ID: ${data.stage_id || 'N/A'}`);
        console.log(`   Title: ${data.title || 'N/A'}`);
        console.log(`   Status: ${data.status || 'N/A'}`);
        
        if (data.sentences && data.sentences.length > 0) {
          const sample = data.sentences[0];
          console.log(`   Sample sentence: "${sample.kr}" -> "${sample.en}"`);
        }
      } else {
        console.log(`❌ File not found: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ Error accessing file: ${error.message}`);
    }
  }

  console.log('\n🎯 Test completed!');
}

// Run the test
testSentenceService().catch(console.error);