#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('../data/classified_sentences.json', 'utf8'));
const samples = data.validSentences.slice(0, 15);

console.log("📋 Sample classified sentences:");
samples.forEach((s, i) => {
    console.log(`${i+1}. Level ${s.level}: "${s.english}"`);
    if (s.classification.detectedGrammar.length > 0) {
        console.log(`   Grammar: ${s.classification.detectedGrammar.map(g => g.name).join(', ')}`);
    }
    console.log(`   Complexity: ${s.classification.complexity_score}`);
    console.log('');
});

console.log("\n📊 Level distribution in first 100 sentences:");
const levelCounts = {};
data.validSentences.slice(0, 100).forEach(s => {
    levelCounts[s.level] = (levelCounts[s.level] || 0) + 1;
});
console.log(levelCounts);