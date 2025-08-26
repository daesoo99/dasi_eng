import { Router } from 'express';
import * as ctrl from '../controllers/contentController';

const router = Router();

router.get('/level/:levelId', ctrl.getLevel);

export default router;