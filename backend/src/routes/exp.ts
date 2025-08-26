import { Router } from 'express';
import * as ctrl from '../controllers/expController';

const router = Router();

router.post('/add', ctrl.addExp);

export default router;