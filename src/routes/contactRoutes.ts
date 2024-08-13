import express from 'express';
import * as contactController from '../controllers/contactController';

const router = express.Router();

router.get('/contacts', contactController.getContacts);
router.delete('/contacts', contactController.deleteContacts);
router.post('/contact', contactController.createContact);
router.post('/identify', contactController.identifyContact);

export default router;
