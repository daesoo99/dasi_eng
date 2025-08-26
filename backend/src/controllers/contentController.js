const contentService = require('../services/contentService');

exports.getLevel = async (req, res) => {
  try {
    const level = await contentService.getLevel(req.params.levelId);
    if (level) return res.json({ success: true, data: level });
    res.status(404).json({ success: false, message: 'Level not found' });
  } catch (e) {
    console.error('Error getLevel:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};