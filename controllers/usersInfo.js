const { StatusCodes } = require('http-status-codes');
const pool = require('../db/connect');

const getAllUsers = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT id, fullname, email, role, created_at FROM "user" ORDER BY created_at DESC');
    const users = result.rows;
    res.status(StatusCodes.OK).json(users);
  } catch (error) {
    next(error);
  }
};

const getSingleUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query('SELECT id, fullname, email, role FROM "user" WHERE userid = $1', [id]);
    const user = result.rows[0];

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: `No user with id: ${id}` });
    }

    res.status(StatusCodes.OK).json( user );
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM "user" WHERE id = $1 RETURNING *', [id]);
    const deletedUser = result.rows[0];

    if (!deletedUser) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: `No user with id: ${id}` });
    }

    res.status(StatusCodes.OK).json({ message: `User with id: ${id} deleted successfully` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getSingleUser,
  deleteUser,
};
