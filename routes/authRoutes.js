const express = require('express');
const rateLimiter = require('express-rate-limit');
const {
  register,
  login,
  logout,
} = require('../controllers/authController');
const {
  getAllUsers,
  getSingleUser,
  deleteUser,
} = require('../controllers/usersInfo');
const { forgotPassword, resetPassword } = require('../controllers/userContoller');
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



router.post('/register', strictLimiter, register);
router.post('/login', strictLimiter, login);
router.post('/logout',  logout);
router.post('/forgot-password', strictLimiter,  forgotPassword);
router.post('/reset-password', strictLimiter, resetPassword);

router.get('/users', authenticateUser, authorizePermissions('admin'), generalLimiter,  getAllUsers);
router.get('/users/:id', authenticateUser, authorizePermissions('admin'), generalLimiter, getSingleUser);
router.delete('/users/:id', authenticateUser, authorizePermissions('admin'), generalLimiter,  deleteUser);

module.exports = router;
