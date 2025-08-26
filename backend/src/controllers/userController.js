const userService = require('../services/userService');

exports.getUser = async (req, res) => {
  try {
    const user = await userService.getUser(req.params.userId);
    if (user) return res.json({ success: true, data: user });
    res.status(404).json({ success: false, message: 'User not found' });
  } catch (e) {
    console.error('Error getUser:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};