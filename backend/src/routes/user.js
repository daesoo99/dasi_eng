const router = require('express').Router();
const ctrl = require('../controllers/userController');

router.get('/:userId', ctrl.getUser);

module.exports = router;