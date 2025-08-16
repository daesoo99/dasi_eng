
const { fcm } = require('../config/firebase');

/**
 * 사용자에게 푸시 알림을 전송합니다.
 * @param {string} token - 사용자의 FCM 디바이스 토큰
 * @param {object} payload - 알림 페이로드 (title, body 등)
 * @returns {Promise<object>}
 */
const sendNotification = async (token, payload) => {
    const message = {
        notification: {
            title: payload.title,
            body: payload.body,
        },
        token: token,
    };

    try {
        const response = await fcm.send(message);
        console.log('Successfully sent message:', response);
        return response;
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

module.exports = {
    sendNotification,
};
