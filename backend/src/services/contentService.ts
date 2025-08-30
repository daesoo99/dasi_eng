const { db } = require('../config/firebase');
const cache = require('../utils/cache');

interface LevelData {
  id: string;
  title: string;
  description?: string;
  [key: string]: any;
}

interface PatternData {
  id: string;
  level: string;
  content: any;
  [key: string]: any;
}

const levelsCollection = db.collection('levels');
const patternsCollection = db.collection('patterns');
const wordBankCollection = db.collection('wordBank');

/**
 * 특정 레벨의 정보를 가져옵니다.
 */
const getLevel = async (levelId: string): Promise<LevelData | null> => {
    const key = `level:${levelId}`;
    const hit = cache.get(key);
    if (hit) {
        console.log(`🚀 Cache hit: ${key}`);
        return hit;
    }

    try {
        const doc = await levelsCollection.doc(levelId).get();
        if (doc.exists) {
            const data = { id: doc.id, ...doc.data() } as LevelData;
            cache.set(key, data);
            return data;
        }
        return null;
    } catch (error) {
        console.error('Error fetching level:', error);
        return null;
    }
};

/**
 * 패턴 데이터를 가져옵니다.
 */
const getPatterns = async (levelId: string): Promise<PatternData[]> => {
    const key = `patterns:${levelId}`;
    const hit = cache.get(key);
    if (hit) {
        console.log(`🚀 Cache hit: ${key}`);
        return hit;
    }

    try {
        const snapshot = await patternsCollection
            .where('level', '==', levelId)
            .get();
            
        const patterns = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        })) as PatternData[];
        
        cache.set(key, patterns);
        return patterns;
    } catch (error) {
        console.error('Error fetching patterns:', error);
        return [];
    }
};

export {
    getLevel,
    getPatterns,
    levelsCollection,
    patternsCollection,
    wordBankCollection
};