const express = require('express');
const rateLimiter = require('express-rate-limit');

const router = express.Router();
const {  postComment,  confirmComment,getAllCommentsWithContentTitle,
  getComments}=require('../controllers/comments');


  router.post('/', postComment);
  router.patch('/:comment_id', confirmComment);
  router.get('/', getAllCommentsWithContentTitle);

module.exports = router;

