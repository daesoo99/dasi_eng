import { Request, Response } from 'express';
const expService = require('../services/expService');

export const addExp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, amount, type } = req.body;
    if (!userId || !amount || !type) {
      res.status(400).json({ success: false, message: 'userId, amount, type required' });
      return;
    }
    await expService.addExp(userId, amount, type);
    res.json({ success: true, message: 'EXP added' });
  } catch (e) {
    console.error('Error addExp:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};