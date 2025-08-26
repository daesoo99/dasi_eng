import { Router } from 'express';
import * as ctrl from '../controllers/userController';

const router = Router();

router.get('/:userId', ctrl.getUser);

export default router;