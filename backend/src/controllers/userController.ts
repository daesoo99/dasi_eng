import { Request, Response } from 'express';
const userService = require('../services/userService');

export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await userService.getUser(req.params.userId);
    if (user) {
      res.json({ success: true, data: user });
      return;
    }
    res.status(404).json({ success: false, message: 'User not found' });
  } catch (e) {
    console.error('Error getUser:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};