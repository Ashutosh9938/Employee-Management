const express = require('express');
const rateLimiter = require('express-rate-limit');
const router = express.Router();

const {
  postBlog,
  updateBlog,
  deleteBlog,
  getAllBlogs,
  getSingleBlog,
  getTopViewedBlog,
  searchBlogsByTitle ,
  searchBlogsByContentType
} = require('../controllers/content');

const { authenticateUser, authorizePermissions } = require('../middleware/authentication');

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

router.get('/topViewed', generalLimiter, getTopViewedBlog);
router.get('/', generalLimiter, getAllBlogs);
router.get('/type', generalLimiter, searchBlogsByContentType);
router.get('/search', generalLimiter, searchBlogsByTitle);
router.get('/:id', generalLimiter, getSingleBlog);

router.post('/', authenticateUser, authorizePermissions('admin', 'contentWriter'), strictLimiter, postBlog);
router.patch('/:id', authenticateUser, authorizePermissions('admin', 'contentWriter'), strictLimiter, updateBlog);
router.delete('/:id', authenticateUser, authorizePermissions('admin', 'contentWriter'), strictLimiter, deleteBlog);

module.exports = router;
