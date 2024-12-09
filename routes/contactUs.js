const express = require('express');
const rateLimiter = require('express-rate-limit');
const csrf = require('csurf');
const {
  contactus,
  getAllContactForms,
  getSingleContactForm,
  deleteContactForm,
} = require('../controllers/contactForm');
const { authenticateUser, authorizePermissions } = require('../middleware/authentication');

const router = express.Router();

const generalLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    msg: 'Too many requests from this IP, please try again after 15 minutes',
  },
});

const strictLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    msg: 'Too many requests from this IP, please try again after 15 minutes',
  },
});

router.post('/', strictLimiter,  contactus);
router.get('/', authenticateUser, authorizePermissions('admin'), generalLimiter,  getAllContactForms);
router.get('/:id', authenticateUser, authorizePermissions('admin'), generalLimiter,  getSingleContactForm);
router.delete('/:id', authenticateUser, authorizePermissions('admin'), generalLimiter, deleteContactForm);

module.exports = router;
