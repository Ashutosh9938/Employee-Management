const express = require('express');
const router = express.Router();

const rateLimiter = require('express-rate-limit'); // Ensure this package is installed
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
const { authenticateUser, authorizePermissions } = require('../middleware/authentication');
const {
  createCourse,
  getAllCourses,
  getSingleCourse,
  deleteCourse,
  updateCourse,
  getAllUniqueTitles
} = require('../controllers/course');

const {
  Enroll,
  getAllEnrollees,
  getSingleEnrollee,
  deleteEnrollee,
} = require('../controllers/enroll');

// Course Routes
router.post('/courses',strictLimiter,authenticateUser, authorizePermissions('admin'), createCourse);
router.get('/courses',generalLimiter,getAllCourses);
router.get('/courses/titles',generalLimiter,getAllUniqueTitles);
router.get('/courses/:id',generalLimiter, getSingleCourse);
router.patch('/courses/:id', authenticateUser, authorizePermissions('admin'),updateCourse);
router.delete('/courses/:id',strictLimiter,authenticateUser, authorizePermissions('admin'), deleteCourse);

// Enroll Routes
router.get('/enroll',generalLimiter,authenticateUser, authorizePermissions('admin'), getAllEnrollees);
router.get('/enroll/:id', generalLimiter,authenticateUser, authorizePermissions('admin'),getSingleEnrollee);
router.delete('/enroll/:id',strictLimiter,authenticateUser, authorizePermissions('admin'), deleteEnrollee);
router.post('/enroll', strictLimiter,Enroll);

module.exports = router;
