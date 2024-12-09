const express = require('express');
const router = express.Router();
const rateLimiter = require('express-rate-limit'); // Ensure this package is installed

// Import your rate limiters
const generalLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    msg: 'Too many requests from this IP, please try again after 15 minutes',
  },
});

const strictLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    msg: 'Too many requests from this IP, please try again after 15 minutes',
  },
});

const { 
  createTestimonial, 
  deleteTestimonial,
  updateTestimonial,
  getTestimonials,
  getSingleTestimonial
} = require('../controllers/testimonial');

const { 
  authenticateUser,
  authorizePermissions 
} = require('../middleware/authentication');

// Route definitions
router.post('/', strictLimiter, authenticateUser, authorizePermissions('admin'), createTestimonial);
router.patch('/:id', strictLimiter, authenticateUser, authorizePermissions('admin'), updateTestimonial);
router.delete('/:id', strictLimiter, authenticateUser, authorizePermissions('admin'), deleteTestimonial);
router.get('/:id', generalLimiter, authenticateUser, authorizePermissions('admin'), getSingleTestimonial);  // FIX: Use the correct middleware
router.get('/', generalLimiter, getTestimonials);

module.exports = router;
