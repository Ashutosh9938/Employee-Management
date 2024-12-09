const pool = require("../db/connect");
const { StatusCodes } = require("http-status-codes");
const cloudinary = require("cloudinary").v2;
const { extractPublicId } = require('./content');

const createCourse = async (req, res, next) => {
  try {
    const { title, description, short_description, price, duration, discount_percent = 0 } = req.body;
    
    if (!title || !description || !short_description || !duration || !price) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "All fields are required" });
    }

    // Convert price to a number and set discount_percent to 0 if it's null or undefined
    const priceNumber = parseFloat(price);
    const discountPercentNumber = discount_percent ? parseFloat(discount_percent) : 0;
    const new_price = priceNumber - (priceNumber * discountPercentNumber / 100);

    if (!req.files || !req.files.media) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Please upload an image" });
    }

    const mediaFile = req.files.media;

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "auto", folder: "course_images" },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result.secure_url); 
          }
        }
      );
      stream.end(mediaFile.data); 
    });

    const result = await pool.query(
      `INSERT INTO course (title, description, image, short_description, price, duration, discount_percent, new_price, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
      [title, description, uploadResult, short_description, priceNumber, duration, discountPercentNumber, new_price]
    );

    res.status(StatusCodes.CREATED).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    next(err);
  }
};


const getAllCourses = async (req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM course ORDER BY created_at DESC");
    res.status(StatusCodes.OK).json(result.rows);
  } catch (err) {
    console.error(err.message);
    next(err);
  }
};

const getSingleCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM course WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Course not found' });
    }

    res.status(StatusCodes.OK).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    next(err);
  }
};

const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, short_description, price, duration, discount_percent } = req.body;

    const existingCourseResult = await pool.query("SELECT * FROM course WHERE id = $1", [id]);

    if (existingCourseResult.rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Course not found' });
    }

    const existingCourse = existingCourseResult.rows[0];
    
    const updatedPrice = price || existingCourse.price;
    const updatedDiscountPercent = discount_percent !== undefined ? discount_percent : existingCourse.discount_percent;
    const new_price = updatedPrice - (updatedPrice * updatedDiscountPercent / 100);

    let updatedImage = existingCourse.image;

    if (req.files && req.files.media) {
      const publicId = extractPublicId(existingCourse.image);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }

      const mediaFile = req.files.media;
      updatedImage = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "auto", folder: "course_images" },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result.secure_url); 
            }
          }
        );
        stream.end(mediaFile.data);
      });
    }

    const updatedCourse = await pool.query(
      `UPDATE course 
       SET title = $1, description = $2, image = $3, short_description = $4, price = $5, duration = $6, discount_percent = $7, new_price = $8, created_at = NOW()
       WHERE id = $9 RETURNING *`,
      [
        title || existingCourse.title,
        description || existingCourse.description,
        updatedImage,
        short_description || existingCourse.short_description,
        updatedPrice,
        duration || existingCourse.duration,
        updatedDiscountPercent,
        new_price,
        id
      ]
    );

    res.status(StatusCodes.OK).json(updatedCourse.rows[0]);
  } catch (err) {
    console.error(err.message);
    next(err);
  }
};

const deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingCourseResult = await pool.query("SELECT * FROM course WHERE id = $1", [id]);
    
    if (existingCourseResult.rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Course not found' });
    }

    const existingCourse = existingCourseResult.rows[0];

    const publicId = extractPublicId(existingCourse.image);
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }

    await pool.query("DELETE FROM course WHERE id = $1", [id]);

    res.status(StatusCodes.OK).json({ message: 'Course deleted successfully' });
  } catch (err) {
    console.error(err.message);
    next(err);
  }
};

const getAllUniqueTitles = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT title FROM course ORDER BY title ASC`
    );

    const titles = result.rows.map((row) => row.title);

    res.status(StatusCodes.OK).json(titles);
  } catch (err) {
    console.error(err.message);
    next(err);
  }
};

module.exports = { createCourse, getAllCourses, getSingleCourse, updateCourse, deleteCourse, getAllUniqueTitles };
