import { Router } from 'express';
import * as mapController from './map.controller.js';

const router = Router();

router.get('/autocomplete', mapController.autocompleteAddress);
router.get('/reverse', mapController.reverseGeocode);
router.get('/ip-location', mapController.getIpLocation);

export default router;
