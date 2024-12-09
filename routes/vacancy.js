const express = require('express');
const router = express.Router();
const rateLimiter = require('express-rate-limit'); // Ensure this package is installed
const { getAllVacancies, getSingleVacancy, createVacancy ,deleteVacancy, updateVacancy,getVacancies ,updateVacancyStatus,getActiveVacancies}= require('../controllers/createVacancy');
const { authenticateUser, authorizePermissions } = require('../middleware/authentication');


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



router.get('/active',generalLimiter, getActiveVacancies);
router.get('/', generalLimiter,getAllVacancies);
router.get('/search',generalLimiter, getVacancies);      
router.get('/get/:id',generalLimiter, getSingleVacancy);
router.post('/create',strictLimiter ,authenticateUser,authorizePermissions('admin'), createVacancy);
router.delete('/delete/:id',strictLimiter ,authenticateUser,authorizePermissions('admin'), deleteVacancy);
router.patch('/update/:id',strictLimiter ,authenticateUser,authorizePermissions('admin'), updateVacancy);
router.patch('/:id/status',strictLimiter ,authenticateUser,authorizePermissions('admin'), updateVacancyStatus);



module.exports = router;