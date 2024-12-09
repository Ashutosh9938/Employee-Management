const express = require('express');
const router = express.Router();
const rateLimiter = require('express-rate-limit');

// Define rate limiters
const generalLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    msg: 'Too many requests from this IP, please try again after 15 minutes',
  },
});

const strictLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window
  message: {
    msg: 'Too many requests from this IP, please try again after 15 minutes',
  },
});

const {
  createEmployee,
  updateEmployee,
  getFormerEmployees,
  getEmployee,
  getSingleEmployee,
  deleteEmployee,
  updateEmployeeStatus,
  getActiveEmployees,
  searchEmployeesByName
} = require('../controllers/employee');

const { 
  authenticateUser,
  authorizePermissions 
} = require('../middleware/authentication');

// Apply rate limiters to routes
router.get('/former', generalLimiter, authenticateUser, authorizePermissions('admin'), getFormerEmployees);
router.get('/active', generalLimiter, authenticateUser, authorizePermissions('admin'), getActiveEmployees);
router.get('/', generalLimiter, authenticateUser, authorizePermissions('admin'), getEmployee);
router.get('/search', generalLimiter, authenticateUser, authorizePermissions('admin'), searchEmployeesByName);
router.post('/', strictLimiter, authenticateUser, authorizePermissions('admin'), createEmployee);
router.patch('/:id', strictLimiter, authenticateUser, authorizePermissions('admin'), updateEmployee);
router.delete('/:id', strictLimiter, authenticateUser, authorizePermissions('admin'), deleteEmployee);
router.patch('/:id/status', strictLimiter, authenticateUser, authorizePermissions('admin'), updateEmployeeStatus);
router.get('/:id', generalLimiter, authenticateUser, authorizePermissions('admin'), getSingleEmployee); 

module.exports = router;
