const router = require('express').Router();
const ctrl = require('../controllers/expController');

router.post('/add', ctrl.addExp);

module.exports = router;