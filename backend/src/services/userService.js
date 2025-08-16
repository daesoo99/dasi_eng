
const { db } = require('../config/firebase');

const usersCollection = db.collection('users');

/**
 * 사용자 정보를 가져옵니다.
 * @param {string} userId - 사용자 ID
 * @returns {Promise<object|null>} 사용자 데이터
 */
const getUser = async (userId) => {
    const userDoc = await usersCollection.doc(userId).get();
    if (!userDoc.exists) {
        console.log('No such user!');
        return null;
    }
    return userDoc.data();
};

/**
 * 사용자 정보를 업데이트합니다.
 * @param {string} userId - 사용자 ID
 * @param {object} data - 업데이트할 데이터
 * @returns {Promise<void>}
 */
const updateUser = async (userId, data) => {
    await usersCollection.doc(userId).update(data);
};

/**
 * 새로운 사용자를 생성합니다.
 * @param {string} userId - 사용자 ID
 * @param {object} initialData - 초기 데이터
 * @returns {Promise<void>}
 */
const createUser = async (userId, initialData) => {
    await usersCollection.doc(userId).set(initialData);
};

module.exports = {
    getUser,
    updateUser,
    createUser,
};
