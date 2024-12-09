const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { StatusCodes } = require('http-status-codes');
const { sendResetPasswordEmail } = require('../utils/sendEmail');
const pool = require('../db/connect');

const createHash = (string) => {
  return crypto.createHash('sha256').update(string).digest('hex');
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Please provide a valid email' });
  }

  const userResult = await pool.query('SELECT * FROM "user" WHERE email = $1', [email]);
  const user = userResult.rows[0];

  if (user) {
    const passwordToken = crypto.randomBytes(70).toString('hex');
    const hashedToken = createHash(passwordToken);

    const origin = process.env.HOST_URL || 'http://localhost:3000';

    await sendResetPasswordEmail({
      name: user.fullname,
      email: user.email,
      token: passwordToken,
      origin,
    });

    const tenMinutes = 1000 * 60 * 10;
    const passwordTokenExpirationDate = Date.now() + tenMinutes;

    try {
      const updateResult = await pool.query(
        'UPDATE "user" SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3 RETURNING *',
        [hashedToken, passwordTokenExpirationDate, user.id]
      );
      console.log('Update Result:', updateResult.rows); // Confirm the result of the update

      if (updateResult.rows.length === 0) {
        console.log('Update failed: No rows affected');
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  }

  res.status(StatusCodes.OK).json({ msg: 'Please check your email for the reset password link' });
};

const resetPassword = async (req, res) => {
  const { token, email, password } = req.body;
  if (!token || !email || !password) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Please provide all values' });
  }

  const userResult = await pool.query('SELECT * FROM "user" WHERE email = $1', [email]);
  const user = userResult.rows[0];

  if (user) {
    const currentDate = Date.now();
    const hashedToken = createHash(token);
    const isTokenValid = user.reset_password_token === hashedToken;
    const isTokenExpired = user.reset_password_expires <= currentDate;

    if (isTokenValid && !isTokenExpired) {
      const hashedPassword = await bcrypt.hash(password, 10);

      await pool.query(
        'UPDATE "user" SET password = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2',
        [hashedPassword, user.id]
      );

      return res.status(StatusCodes.OK).json({ msg: 'Password has been reset' });
    } else {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid or expired token' });
    }
  } else {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid credentials' });
  }
};

module.exports = {
  forgotPassword,
  resetPassword,
};
