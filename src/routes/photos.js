const express = require('express');
const auth = require('../middleware/auth');
const ctrl = require('../controllers/photosController');
const router = express.Router();
router.use(auth);
router.get('/', ctrl.getPhotos);
router.post('/', ctrl.addPhoto);
router.delete('/:id', ctrl.deletePhoto);
module.exports = router;
