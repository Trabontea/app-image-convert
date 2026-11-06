/**
 * Routes for image conversion. A route only wires a URL to its middleware
 * and controller; it contains no logic of its own.
 */
import { Router } from 'express';
import { uploadImages } from '../middlewares/upload.js';
import { convert } from '../controllers/convertController.js';

const router = Router();

// POST /api/convert — first parse the uploaded files, then convert them.
router.post('/convert', uploadImages, convert);

export default router;
