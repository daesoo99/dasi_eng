
const { db } = require('../config/firebase');

const levelsCollection = db.collection('levels');
const patternsCollection = db.collection('patterns');
const wordBankCollection = db.collection('wordBank');

/**
 * 특정 레벨의 정보를 가져옵니다.
 * @param {string} levelId - 레벨 ID (예: 'lv4')
 * @returns {Promise<object|null>} 레벨 데이터
 */
const getLevel = async (levelId) => {
    const levelDoc = await levelsCollection.doc(levelId).get();
    if (!levelDoc.exists) {
        console.log(`No such level: ${levelId}`);
        return null;
    }
    return levelDoc.data();
};

/**
 * 특정 패턴의 정보를 가져옵니다.
 * @param {string} patternId - 패턴 ID (예: 'p101')
 * @returns {Promise<object|null>} 패턴 데이터
 */
const getPattern = async (patternId) => {
    const patternDoc = await patternsCollection.doc(patternId).get();
    if (!patternDoc.exists) {
        console.log(`No such pattern: ${patternId}`);
        return null;
    }
    return patternDoc.data();
};

/**
 * 특정 단어의 정보를 가져옵니다.
 * @param {string} word - 단어 (예: 'sustainable')
 * @returns {Promise<object|null>} 단어 데이터
 */
const getWord = async (word) => {
    const wordDoc = await wordBankCollection.doc(word).get();
    if (!wordDoc.exists) {
        console.log(`No such word: ${word}`);
        return null;
    }
    return wordDoc.data();
};

/**
 * 단어의 잠금 해제 상태를 업데이트합니다.
 * @param {string} word - 단어
 * @param {boolean} unlocked - 잠금 해제 여부
 * @returns {Promise<void>}
 */
const updateWordUnlockedStatus = async (word, unlocked) => {
    await wordBankCollection.doc(word).update({ unlocked });
};

module.exports = {
    getLevel,
    getPattern,
    getWord,
    updateWordUnlockedStatus,
};
