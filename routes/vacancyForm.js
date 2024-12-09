const express = require('express');
const router = express.Router();
const rateLimiter = require('express-rate-limit'); // Ensure this package is installed
const {vacancyForm, getVacancyForm,getVacancySortedForm,getSingleVacancyForm ,deleteVacancyForm, getAllDepartment} = require('../controllers/vacancyForm');

const { authenticateUser, authorizePermissions } = require('../middleware/authentication');


const generalLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, 
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


//vacancyForm
router.get('/',generalLimiter, getVacancyForm);
router.get('/department',generalLimiter, getAllDepartment);
router.get('/search',generalLimiter,authenticateUser,authorizePermissions('admin'),getVacancySortedForm );
router.get('/:id',generalLimiter,authenticateUser,authorizePermissions('admin'), getSingleVacancyForm);
router.post('/',strictLimiter , vacancyForm);
router.delete('/:id',strictLimiter ,authenticateUser,authorizePermissions('admin'), deleteVacancyForm);

module.exports = router;