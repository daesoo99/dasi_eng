
const { db } = require('../config/firebase');
const { updateUser, getUser } = require('./userService');

const expLogsCollection = db.collection('expLogs');

/**
 * 경험치를 추가하고 사용자 레벨을 업데이트합니다.
 * @param {string} userId - 사용자 ID
 * @param {number} amount - 추가할 경험치 양
 * @param {string} type - 경험치 획득 유형 (예: 'stage_clear', 'review_success', 'streak_bonus')
 * @returns {Promise<void>}
 */
const addExp = async (userId, amount, type) => {
    const user = await getUser(userId);
    if (!user) {
        console.error(`User ${userId} not found.`);
        return;
    }

    const newExp = (user.exp || 0) + amount;
    let newLevel = user.level || 1;

    // 레벨업 조건 확인 (임계치는 예시)
    const levelThresholds = { 1: 100, 2: 250, 3: 450, 4: 700, 5: 1000 }; // 예시 임계치
    while (newLevel < Object.keys(levelThresholds).length && newExp >= levelThresholds[newLevel]) {
        newLevel++;
        console.log(`User ${userId} leveled up to ${newLevel}!`);
    }

    await updateUser(userId, { exp: newExp, level: newLevel });

    // 경험치 로그 기록
    await expLogsCollection.add({
        userId,
        amount,
        type,
        timestamp: new Date(),
    });
};

/**
 * 연속 학습 스트릭을 업데이트합니다.
 * @param {string} userId - 사용자 ID
 * @returns {Promise<void>}
 */
const updateStreak = async (userId) => {
    const user = await getUser(userId);
    if (!user) {
        console.error(`User ${userId} not found.`);
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
    let newStreak = user.streak || 0;

    if (lastLogin) {
        lastLogin.setHours(0, 0, 0, 0);
        const diffTime = Math.abs(today.getTime() - lastLogin.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            newStreak++;
            await addExp(userId, 3, 'streak_bonus'); // 연속 학습 보너스
        } else if (diffDays > 1) {
            newStreak = 1; // 스트릭 초기화
        }
    } else {
        newStreak = 1; // 첫 로그인
    }

    await updateUser(userId, { streak: newStreak, lastLogin: today.toISOString().split('T')[0] });
};

module.exports = {
    addExp,
    updateStreak,
};
