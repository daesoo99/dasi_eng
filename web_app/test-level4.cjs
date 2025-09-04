// Test Level 4 Service parsing and generation
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Level 4 Service logic...');

// Read the roadmap file
const roadmapPath = path.join(__dirname, 'public/docs/curriculum/master_roadmap_lv4~6_ver0.md');
const content = fs.readFileSync(roadmapPath, 'utf-8');

// Parse stages
const lines = content.split('\n');
const stages = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.startsWith('Stage ') && line.includes(':')) {
    // Extract stage number and title
    const match = line.match(/Stage (\d+): (.+)/);
    if (match) {
      const stageNumber = parseInt(match[1]);
      const title = match[2];
      
      // Look for examples in the next few lines
      const examples = [];
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const nextLine = lines[j].trim();
        if (nextLine.includes('예)') || nextLine.includes('예시)')) {
          // Extract examples
          const exampleMatches = nextLine.match(/"([^"]+)"/g);
          if (exampleMatches) {
            exampleMatches.forEach(example => {
              examples.push(example.replace(/"/g, ''));
            });
          }
        }
        if (nextLine.startsWith('Stage ')) break; // Stop at next stage
      }
      
      stages.push({
        stageNumber,
        title,
        examples: examples.slice(0, 3) // Take first 3 examples
      });
    }
  }
}

console.log(`📊 Found ${stages.length} stages for Level 4:`);
stages.slice(0, 5).forEach(stage => {
  console.log(`   Stage ${stage.stageNumber}: ${stage.title}`);
  stage.examples.forEach(example => {
    console.log(`     - "${example}"`);
  });
});

// Test sentence generation logic
console.log('\n🎯 Testing sentence generation...');

function generateSentenceVariations(baseExample) {
  const variations = [];
  
  // Add the original example
  variations.push({
    pattern: 'future_perfect',
    korean: '미래완료 예문',
    english: baseExample,
    level: 4,
    stage: 1
  });
  
  // Generate variations (simplified for testing)
  const subjects = ['I', 'We', 'You', 'They'];
  subjects.forEach(subject => {
    if (!baseExample.toLowerCase().startsWith(subject.toLowerCase())) {
      const modifiedExample = baseExample.replace(/^[A-Z][a-z]*/, subject);
      variations.push({
        pattern: 'future_perfect_variation',
        korean: '미래완료 변형',
        english: modifiedExample,
        level: 4,
        stage: 1
      });
    }
  });
  
  return variations.slice(0, 104); // Cap at 104 as required
}

// Test with first stage
if (stages.length > 0) {
  const firstStage = stages[0];
  console.log(`Testing with Stage ${firstStage.stageNumber}: ${firstStage.title}`);
  
  if (firstStage.examples.length > 0) {
    const sentences = generateSentenceVariations(firstStage.examples[0]);
    console.log(`Generated ${sentences.length} sentences:`);
    sentences.slice(0, 3).forEach((sentence, i) => {
      console.log(`   ${i + 1}. ${sentence.english}`);
    });
  }
}

console.log('\n✅ Level 4 Service test complete');