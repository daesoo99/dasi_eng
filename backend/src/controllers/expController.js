const expService = require('../services/expService');

exports.addExp = async (req, res) => {
  try {
    const { userId, amount, type } = req.body;
    if (!userId || !amount || !type) {
      return res.status(400).json({ success: false, message: 'userId, amount, type required' });
    }
    await expService.addExp(userId, amount, type);
    res.json({ success: true, message: 'EXP added' });
  } catch (e) {
    console.error('Error addExp:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};