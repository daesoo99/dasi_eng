const { fcm } = require('../config/firebase');

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * 사용자에게 푸시 알림을 전송합니다.
 */
const sendNotification = async (token: string, payload: NotificationPayload): Promise<NotificationResult> => {
    try {
        const message = {
            notification: {
                title: payload.title,
                body: payload.body,
            },
            data: payload.data || {},
            token: token
        };

        const response = await fcm.send(message);
        console.log('✅ Notification sent:', response);
        
        return {
            success: true,
            messageId: response
        };
    } catch (error) {
        console.error('❌ Notification failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};

/**
 * 다중 사용자에게 알림 전송
 */
const sendMulticastNotification = async (tokens: string[], payload: NotificationPayload): Promise<NotificationResult[]> => {
    const results: NotificationResult[] = [];
    
    for (const token of tokens) {
        const result = await sendNotification(token, payload);
        results.push(result);
    }
    
    return results;
};

export { sendNotification, sendMulticastNotification };
export type { NotificationPayload, NotificationResult };