import { Router } from 'express';
import { login, organizacionLogin } from '../controllers/auth.controller.js';

const router = Router();

router.get('/organizacion', organizacionLogin);
router.post('/login', login);

export default router;
