const fs = require('fs');
const path = require('path');
const pool = require('../db/connect');
const { StatusCodes } = require('http-status-codes');
const { sendCourseEmail, logUserToExcel } = require('../utils/sendEmail');
const xlsx = require('xlsx');
const cloudinary = require('cloudinary').v2;

const Enroll = async (req, res) => {
  try {
    
    if (!req.files || !req.files.media) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'No media file uploaded' });
    }
    
    const { fullName, email, contactNumber, interestedCourse, message } = req.body;
    
    if (!fullName || !email || !contactNumber || !interestedCourse) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'All fields are required' });
    }

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'auto', folder: 'panacea' },
          (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
          }
      );
      stream.end(req.files.media.data);
    });
  
    const image = uploadResult; 

    const existingEnroll = await pool.query('SELECT * FROM enroll WHERE email = $1', [email]);

    if (existingEnroll.rows.length > 0) {
      return res.status(StatusCodes.CONFLICT).json({ message: 'You are already enrolled' });
    }

    const newEnroll = await pool.query(
      `INSERT INTO enroll (full_name, email, contactnumber, interested_course, your_message, receipt, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
      [fullName, email, contactNumber, interestedCourse, message || null, image]
    );

    logUserToExcel({
      fullName,
      email,
      contactNumber,
      interestedCourse,
      message,
      createdAt: new Date().toISOString(),
    });

    await sendCourseEmail(email, interestedCourse);

    res.status(StatusCodes.CREATED).json(newEnroll.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Something went wrong' });
  }
};


const getAllEnrollees = async (req, res) => {
  try {
    const { search } = req.query;

    let query;
    let values = [];

    if (!search) {
      query = `
        SELECT * FROM enroll
        ORDER BY created_at DESC
      `;
    } else {
      const searchTerm = `%${search}%`;

      query = `
        SELECT * FROM enroll
        WHERE (full_name ILIKE $1 OR email ILIKE $1 OR interested_course::text ILIKE $1)
        ORDER BY created_at DESC
      `;

      values = [searchTerm];
    }

    const result = await pool.query(query, values);

 
    if (result.rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'No enrollees found for the given search term' });
    }

    res.status(StatusCodes.OK).json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Something went wrong' });
  }
};



const getSingleEnrollee = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM enroll WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Enrollee not found' });
    }

    res.status(StatusCodes.OK).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Something went wrong' });
  }
};

const deleteEnrollee = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM enroll WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Enrollee not found' });
    }

    removeFromExcel(result.rows[0].email);

    res.status(StatusCodes.OK).json({ message: 'Enrollee deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Something went wrong' });
  }
};

const removeFromExcel = (email) => {
  const filePath = path.join(__dirname, '../enrollers.xlsx');

  if (fs.existsSync(filePath)) {
    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets['Enrollers'];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    const updatedData = jsonData.filter((entry) => entry.email !== email);

    const newWorksheet = xlsx.utils.json_to_sheet(updatedData);
    workbook.Sheets['Enrollers'] = newWorksheet;

    xlsx.writeFile(workbook, filePath);
  }
};

module.exports = {
  Enroll,
  getAllEnrollees,
  getSingleEnrollee,
  deleteEnrollee,
};
