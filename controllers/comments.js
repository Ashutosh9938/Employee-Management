const pool = require('../db/connect');
const { StatusCodes } = require('http-status-codes');

const postComment = async (req, res, next) => {
  try {
    const { content_id, comment, name, email, website, parent_comment_id = null } = req.body;

    if (!content_id || !comment || !name || !email) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Please provide all required fields: content_id, comment, name, email' });
    }

    const { rows: newComment } = await pool.query(`
      INSERT INTO comments (content_id, comment, name, email, website, parent_comment_id, created_at) 
      VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *
    `, [content_id, comment, name, email, website, parent_comment_id]);

    res.status(StatusCodes.CREATED).json({ comment: newComment[0] });
  } catch (error) {
    next(error);
  }
};

const confirmComment = async (req, res, next) => {
  try {
    const userId = req.user && req.user.userId;
    console.log(userId);
    if (userId !== process.env.USER_ID) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: 'Admin privileges required' });
    }

    const { comment_id } = req.params;

    const { rows: updatedComment } = await pool.query(`
      UPDATE comments SET is_confirmed = TRUE
      WHERE id = $1 RETURNING *
    `, [comment_id]);

    if (!updatedComment[0]) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Comment not found' });
    }

    res.status(StatusCodes.OK).json({ message: 'Comment confirmed', comment: updatedComment[0] });
  } catch (error) {
    next(error);
  }
};
const getAllCommentsWithContentTitle = async (req, res, next) => {
  try {
    const { rows: commentsWithTitle } = await pool.query(`
      SELECT comments.*, content.title AS content_title
      FROM comments
      JOIN content ON comments.content_id = content.id
      ORDER BY comments.created_at DESC
    `);

    res.status(StatusCodes.OK).json({ comments: commentsWithTitle });
  } catch (error) {
    next(error);
  }
};


const requestEditComment = async (req, res, next) => {
  try {
    const { comment_id } = req.params;
    const { newComment } = req.body;
    const userId = req.user && req.user.userId;

    const { rows: comments } = await pool.query('SELECT * FROM comments WHERE id = $1', [comment_id]);
    const comment = comments[0];

    if (!comment) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Comment not found' });
    }

    if (comment.user_id !== userId) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: 'You do not have permission to edit this comment' });
    }

    const { rows: updatedComment } = await pool.query(`
      UPDATE comments SET comment = $1, is_confirmed = FALSE
      WHERE id = $2 RETURNING *
    `, [newComment, comment_id]);

    res.status(StatusCodes.OK).json({ message: 'Edit request submitted and awaiting admin confirmation', comment: updatedComment[0] });
  } catch (error) {
    next(error);
  }
};
const requestDeleteComment = async (req, res, next) => {
  try {
    const { comment_id } = req.params;
    const userId = req.user && req.user.userId;

    const { rows: comments } = await pool.query('SELECT * FROM comments WHERE id = $1', [comment_id]);
    const comment = comments[0];

    if (!comment) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Comment not found' });
    }

    if (comment.user_id !== userId) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: 'You do not have permission to delete this comment' });
    }

    const { rows: deletedComment } = await pool.query(`
      UPDATE comments SET is_confirmed = FALSE, comment = '[deleted]'
      WHERE id = $1 RETURNING *
    `, [comment_id]);

    res.status(StatusCodes.OK).json({ message: 'Delete request submitted and awaiting admin confirmation', comment: deletedComment[0] });
  } catch (error) {
    next(error);
  }
};


const fetchNestedComments = async (content_id) => {
  const { rows: comments } = await pool.query(`
    SELECT * FROM comments
    WHERE content_id = $1
    ORDER BY created_at ASC
  `, [content_id]);

  const buildCommentTree = (comments, parentId = null) => {
    return comments
      .filter(comment => comment.parent_comment_id === parentId)
      .map(comment => ({
        ...comment,
        replies: buildCommentTree(comments, comment.id)
      }));
  };

  return buildCommentTree(comments);
};

const getComments = async (req, res, next) => {
  try {
    const { content_id } = req.query;

    if (!content_id) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Please provide a content_id to retrieve comments' });
    }

    const nestedComments = await fetchNestedComments(content_id);

    res.status(StatusCodes.OK).json({ comments: nestedComments });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  postComment,
  confirmComment,
  getAllCommentsWithContentTitle,
  getComments,
  requestEditComment,
  requestDeleteComment

};
