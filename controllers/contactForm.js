const { StatusCodes } = require('http-status-codes');
const pool = require('../db/connect');
const { autoRespondToEmail, logUserToExcel } = require('../utils/sendEmail');

const phoneNumberRegex = /^(98|97)\d{8}$/;

const contactus = async (req, res) => {
  const { email, name, phonenumber, title, message } = req.body;

  if (!name) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Name is required' });
  }
  if (!email) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Email is required' });
  }
  if (!title) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Title is required' });
  }
  if (!message) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Message is required' });
  }

  // Validate phone number only if it is provided
  if (phonenumber && !phoneNumberRegex.test(phonenumber)) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Phone number is invalid' });
  }

  const duplicateCheckQuery = `
    SELECT COUNT(*)
    FROM "contactForm"
    WHERE email = $1 AND title = $2 AND message = $3
  `;
  const duplicateCheckResult = await pool.query(duplicateCheckQuery, [email, title, message]);

  if (parseInt(duplicateCheckResult.rows[0].count) > 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'You have already submitted this title and message content.' });
  }

  const date24HoursAgo = new Date();
  date24HoursAgo.setHours(date24HoursAgo.getHours() - 24);

  const checkUsageQuery = `
    SELECT COUNT(*) 
    FROM "contactForm"
    WHERE email = $1 AND phonenumber = $2 AND created_at > $3
  `;
  
  const usageResult = await pool.query(checkUsageQuery, [email, phonenumber || null, date24HoursAgo]);

  if (parseInt(usageResult.rows[0].count) >= 5) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'You have reached the daily limit for submissions with this email and phone number for a day.' });
  }

  const insertQuery = `
    INSERT INTO "contactForm" (fullname, email, phonenumber, title, message, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *
  `;
  const insertResult = await pool.query(insertQuery, [name, email, phonenumber || null, title, message]);

  const user = insertResult.rows[0];

  try {
    await autoRespondToEmail(message, email);
    logUserToExcel(email, message);
    res.status(StatusCodes.CREATED).json({ user, message: 'Emails sent successfully!' });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Error processing request.' });
  }
};

const getAllContactForms = async (req, res) => {
  try {
    const query = `SELECT * FROM "contactForm" ORDER BY created_at DESC`;
    const result = await pool.query(query);
    res.status(StatusCodes.OK).json( result.rows );
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Error fetching contact forms.' });
  }
};

const getSingleContactForm = async (req, res) => {
  const { id } = req.params;

  try {
    const query = `SELECT * FROM "contactForm" WHERE id = $1`;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: `No contact form found with ID ${id}` });
    }

    res.status(StatusCodes.OK).json( result.rows[0] );
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Error fetching contact form.' });
  }
};

const deleteContactForm = async (req, res) => {
  const { id } = req.params;

  try {
    const query = `DELETE FROM "contactForm" WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: `No contact form found with ID ${id}` });
    }

    res.status(StatusCodes.OK).json({ message: `Contact form with ID ${id} deleted successfully.` });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Error deleting contact form.' });
  }
};

module.exports = {
  contactus,
  getAllContactForms,
  getSingleContactForm,
  deleteContactForm,
};
