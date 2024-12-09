const pool = require('../db/connect');
const { StatusCodes } = require('http-status-codes');
const cloudinary = require('cloudinary').v2;

const extractPublicId = (url) => {
  const regex = /\/v\d+\/([^\/]+)\/([^\/]+)\.[^\/]+$/;
  const match = url.match(regex);
  if (match) {
      return `${match[1]}/${match[2]}`;
  }
  return null;
};

const postBlog = async (req, res, next) => {
  try {
    const userId = req.user && req.user.userId;
    console.log(userId);
    const { rows: users } = await pool.query('SELECT * FROM "user" WHERE id = $1', [userId]);
    const user = users[0];

    if (!user) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'User not found' });
    }

    if (!req.files || !req.files.media) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'No media file uploaded' });
    }

    const { title, content_type, matadiscription, description, read_time } = req.body;

    if (!title || !content_type || !matadiscription || !description || !read_time) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Please provide all required fields' });
    }

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto', folder: 'panacea', tags: [user.id, user.fullname] },
        (error, result) => {
          if (error) reject(error);
          else resolve(result.secure_url);
        }
      );
      stream.end(req.files.media.data);
    });

    const images = uploadResult;

    const { rows: newBlog } = await pool.query(
      `INSERT INTO content (type, matadiscription, title, description, images, user_id, read_time) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        content_type,
        matadiscription,
        title,
        description,
        images,
        userId,
        read_time
      ]
    );

    const blogWithUser = {
      ...newBlog[0],
      user_fullname: user.fullname
    };

    res.status(StatusCodes.CREATED).json({ blog: blogWithUser });
  } catch (error) {
    next(error);
  }
};

const updateBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user && req.user.userId;

    const { rows: users } = await pool.query('SELECT * FROM "user" WHERE id = $1', [userId]);
    const user = users[0];

    if (!user) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'User not found' });
    }
    const { rows: blogs } = await pool.query('SELECT * FROM content WHERE id = $1', [id]);
    const blog = blogs[0];

    if (!blog) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Blog post not found' });
    }

    if (blog.user_id !== userId && userId !== process.env.USER_ID) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'You are not authorized to update this blog post' });
    }

    let images = blog.images;
    if (req.files && req.files.media) {
      const oldImageUrl = images;
      if (oldImageUrl) {
        const publicId = extractPublicId(oldImageUrl);
        await cloudinary.uploader.destroy(publicId);
      }

      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'auto', folder: 'panacea', tags: [user.userid, user.fullname] },
          (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
          }
        );
        stream.end(req.files.media.data);
      });
      images = uploadResult;
    }

    const { title, content_type, matadiscription, description, read_time } = req.body;
    const updatedBlog = await pool.query(
      `UPDATE content 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           images = COALESCE($3, images),
           type = COALESCE($4, type),
           matadiscription = COALESCE($5, matadiscription),
           read_time = COALESCE($6, read_time)
       WHERE id = $7 
       RETURNING *`,
      [
        title || blog.title,
        description || blog.description,
        images,
        content_type || blog.type,
        matadiscription || blog.matadiscription,
        read_time || blog.read_time,
        id
      ]
    );

    const updatedBlogWithUser = {
      ...updatedBlog.rows[0],
      user_fullname: user.fullname
    };

    res.status(StatusCodes.OK).json({ blog: updatedBlogWithUser });
  } catch (error) {
    next(error);
  }
};

const deleteBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user && req.user.userId;

    const { rows: users } = await pool.query('SELECT * FROM "user" WHERE id = $1', [userId]);
    const user = users[0];

    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'User not found' });
    }

    const { rows: blogs } = await pool.query('SELECT * FROM content WHERE id = $1', [id]);
    const blog = blogs[0];

    if (!blog) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Blog post not found' });
    }
    if (blog.user_id !== userId && user.role !== 'admin') {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'You are not authorized to delete this blog post' });
    }
    if (blog.images) {
      const imageUrl = blog.images;
      const publicId = extractPublicId(imageUrl);
      await cloudinary.uploader.destroy(publicId);
    }
    await pool.query('DELETE FROM content WHERE id = $1', [id]);

    res.status(StatusCodes.OK).json(
      { message: `Blog post deleted successfully` }
    );
  } catch (error) {
    next(error);
  }
};

const getAllBlogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const offset = (pageNumber - 1) * limitNumber;

    const { rows: totalCount } = await pool.query('SELECT COUNT(*) FROM content');
    const totalBlogs = parseInt(totalCount[0].count, 10);

    const totalPages = Math.ceil(totalBlogs / limitNumber);
    const { rows: blogs } = await pool.query(`
      SELECT content.*, "user"."fullname" AS user_name 
      FROM content 
      JOIN "user" ON content.user_id = "user".id
      ORDER BY content.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limitNumber, offset]);

    res.status(StatusCodes.OK).json({
      blogs,
      totalBlogs,
      blogsPerPage: limitNumber,
      currentPage: pageNumber,
      totalPages, 
    });
  } catch (error) {
    next(error);
  }
};


// const getSingleBlog = async (req, res, next) => {
//   try {
//     const { id } = req.params;

//     await pool.query(`UPDATE content SET views = views + 1 WHERE id = $1`, [id]);

//     const { rows: blogs } = await pool.query(`
//       SELECT content.*, "user"."fullname" AS user_name 
//       FROM content 
//       JOIN "user" ON content.user_id = "user".id 
//       WHERE content.id = $1
//     `, [id]);

//     const blog = blogs[0];

//     if (!blog) {
//       return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Blog post not found' });
//     }

//     const { rows: comments } = await pool.query(`
//       SELECT * FROM comments 
//       WHERE content_id = $1 AND is_confirmed = TRUE
//       ORDER BY created_at ASC
//     `, [id]);

//     const buildCommentTree = (comments, parentId = null) => {
//       return comments
//         .filter(comment => comment.parent_comment_id === parentId)
//         .map(comment => ({
//           ...comment,
//           replies: buildCommentTree(comments, comment.id)
//         }));
//     };

//     const nestedComments = buildCommentTree(comments);

//     res.status(StatusCodes.OK).json({
//       blog: {
//         ...blog,
//         comments: nestedComments
//       }
//     });
//   } catch (error) {
//     next(error);
//   }
// };

const getSingleBlog = async (req, res, next) => {
  try {
    const { id } = req.params;

    console.log(id);

    await pool.query(`UPDATE content SET views = views + 1 WHERE id = $1`, [id]);

    const { rows: blogs } = await pool.query(`
      SELECT content.*, "user"."fullname" AS user_name 
      FROM content 
      JOIN "user" ON content.user_id = "user".id 
      WHERE content.id = $1
    `, [id]);

    const blog = blogs[0];

    if (!blog) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Blog post not found' });
    }

    res.status(StatusCodes.OK).json({ blog });
  } catch (error) {
    next(error);
  }
};


const getTopViewedBlog = async (req, res, next) => {
  try {
    const { rows: blogs } = await pool.query(`
      SELECT content.*, "user"."fullname" AS user_name 
      FROM content 
      JOIN "user" ON content.user_id = "user".id
      ORDER BY content.views DESC
      LIMIT 10
    `);

    if (!blogs.length) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'No blog posts found' });
    }

    res.status(StatusCodes.OK).json({ blogs });
  } catch (error) {
    next(error);
  }
};

const searchBlogsByTitle = async (req, res, next) => {
  try {
    const { title } = req.query;

    if (!title) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Please provide a title to search' });
    }

    const { rows: blogs } = await pool.query(`
      SELECT content.*, "user"."fullname" AS user_name 
      FROM content 
      JOIN "user" ON content.user_id = "user".id 
      WHERE content.title ILIKE $1
      ORDER BY content.created_at DESC
    `, [`%${title}%`]);

    if (!blogs.length) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'No blogs found with the specified title' });
    }

    res.status(StatusCodes.OK).json({ blogs });
  } catch (error) {
    next(error);
  }
};

const searchBlogsByContentType = async (req, res, next) => {
  try {
    const { content_type } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    if (!content_type) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Please provide a content type to search' });
    }

    const { rows: totalCountResult } = await pool.query(`
      SELECT COUNT(*) FROM content WHERE type = $1
    `, [content_type]);
    const totalBlogs = parseInt(totalCountResult[0].count, 10);
    const totalPages = Math.ceil(totalBlogs / limit);

    const { rows: blogs } = await pool.query(`
      SELECT content.*, "user"."fullname" AS user_name 
      FROM content 
      JOIN "user" ON content.user_id = "user".id 
      WHERE content.type = $1
      ORDER BY content.created_at DESC
      LIMIT $2 OFFSET $3
    `, [content_type, limit, offset]);

    if (!blogs.length) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'No blogs found with the specified content type' });
    }

    res.status(StatusCodes.OK).json({
      blogs,
      totalBlogs,
      blogsPerPage: limit,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  extractPublicId,
  postBlog,
  updateBlog,
  deleteBlog,
  getAllBlogs,
  getSingleBlog,
  getTopViewedBlog,
  searchBlogsByTitle,
  searchBlogsByContentType
};
