const { db } = require('../config/firebase');
const { updateUser, getUser } = require('./userService');

interface ExpLog {
  userId: string;
  amount: number;
  type: 'stage_clear' | 'review_success' | 'streak_bonus' | string;
  timestamp: Date;
  [key: string]: any;
}

const expLogsCollection = db.collection('expLogs');

/**
 * 경험치를 추가하고 사용자 레벨을 업데이트합니다.
 */
const addExp = async (userId: string, amount: number, type: string): Promise<void> => {
    try {
        const user: any = await getUser(userId);
        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }

        const newExp = (user.exp || 0) + amount;
        const newLevel = calculateLevel(newExp);
        
        // 경험치 로그 저장
        const expLog: ExpLog = {
            userId,
            amount,
            type,
            timestamp: new Date()
        };
        
        await expLogsCollection.add(expLog);
        
        // 사용자 업데이트
        await updateUser(userId, {
            exp: newExp,
            level: newLevel
        });
        
        console.log(`✅ EXP added: ${userId} +${amount} (${type}) -> Lv.${newLevel}`);
    } catch (error) {
        console.error('Error adding exp:', error);
        throw error;
    }
};

/**
 * 경험치로 레벨 계산
 */
const calculateLevel = (exp: number): number => {
    if (exp < 100) return 1;
    if (exp < 300) return 2;
    if (exp < 600) return 3;
    if (exp < 1000) return 4;
    if (exp < 1500) return 5;
    return Math.floor(exp / 300) + 1; // 레벨 6 이후
};

export { addExp, calculateLevel, expLogsCollection };