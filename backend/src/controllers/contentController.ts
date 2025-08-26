import { Request, Response } from 'express';
const contentService = require('../services/contentService');

export const getLevel = async (req: Request, res: Response): Promise<void> => {
  try {
    const level = await contentService.getLevel(req.params.levelId);
    if (level) {
      res.json({ success: true, data: level });
      return;
    }
    res.status(404).json({ success: false, message: 'Level not found' });
  } catch (e) {
    console.error('Error getLevel:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};