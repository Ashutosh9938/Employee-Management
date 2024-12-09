const bcrypt = require('bcrypt');
const { StatusCodes } = require('http-status-codes');
const { attachCookiesToResponse, createTokenUser } = require('../utils');
const pool = require('../db/connect');

const register = async (req, res) => {
  try {
    const { email, name, password, role } = req.body;

    if (!name) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: 'Name is required' });
      return;
    }

    const result = await pool.query('SELECT * FROM "user" WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: 'Email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const insertResult = await pool.query(
      'INSERT INTO "user" (fullname, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, hashedPassword, role]
    );

    const user = insertResult.rows[0];
    const tokenUser = createTokenUser(user);
    // attachCookiesToResponse({ res, user: tokenUser });

    res.status(StatusCodes.CREATED).json({ user: tokenUser });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Something went wrong' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: 'Please provide email and password' });
      return;
    }

    const result = await pool.query('SELECT * FROM "user" WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Invalid Credentials' });
      return;
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Invalid Credentials' });
      return;
    }

    const tokenUser = createTokenUser(user);
    attachCookiesToResponse({ res, user: tokenUser });
    const { userid, fullname, email: userEmail, role } = user;
    res.status(StatusCodes.OK).json({ user: { userid, fullname, email: userEmail, role } });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Something went wrong' });
  }
};

const logout = async (req, res) => {
  try {
    res.cookie('token', 'logout', {
      httpOnly: true,
      expires: new Date(Date.now() + 1000),
    });
    res.status(StatusCodes.OK).json({ msg: 'User logged out!' });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Something went wrong' });
  }
};

module.exports = {
  register,
  login,
  logout,
};
