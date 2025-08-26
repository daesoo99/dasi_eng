const router = require('express').Router();
const ctrl = require('../controllers/contentController');

router.get('/level/:levelId', ctrl.getLevel);

module.exports = router;