const pool = require('../db/connect');
const { StatusCodes } = require('http-status-codes');
const cloudinary = require('cloudinary').v2;

const createEmployee = async (req, res, next) => {
    try {
        if (!req.files || !req.files.media) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Please upload an image' });
        }

        const { personalId, firstName, lastName, email, phoneNumber, hireDate, department, level, address, isActive } = req.body;

        console.log(req.body);
        if (!personalId || !firstName || !lastName || !email || !phoneNumber || !hireDate || !department || !level || !address || isActive === undefined) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'All fields are required' });
        }

        const isActiveBoolean = isActive === 'true';
        const fullName = `${firstName} ${lastName}`;

        const result = await pool.query('SELECT * FROM "employee" WHERE email = $1', [email]);
        if (result.rows.length > 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Email already exists' });
        }

        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { resource_type: 'auto', folder: 'Employee Picture' },
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result.secure_url);
                    }
                }
            );
            stream.end(req.files.media.data);
        });

        const newEmployee = await pool.query(
            'INSERT INTO employee (personal_id, first_name, last_name, full_name, email, phone_number, hire_date, department, level, address, image, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
            [personalId, firstName, lastName, fullName, email, phoneNumber, hireDate, department, level, address, uploadResult, isActiveBoolean]
        );

        res.status(StatusCodes.CREATED).json(newEmployee.rows[0]);
    } catch (error) {
        next(error);
    }
};
const updateEmployee = async (req, res, next) => {
    const { id } = req.params;
    const { personalId, firstName, lastName, email, phoneNumber, hireDate, department, level, address, isActive } = req.body;
    let { image } = req.body;

    try {
        const { rows: existing } = await pool.query('SELECT * FROM employee WHERE id = $1', [id]);
        if (existing.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: "Employee not found." });
        }

        if (email && email !== existing[0].email) {
            const { rows: emailExists } = await pool.query('SELECT * FROM employee WHERE email = $1 AND id != $2', [email, id]);
            if (emailExists.length > 0) {
                return res.status(StatusCodes.CONFLICT).json({ message: "Email is already in use by another employee." });
            }
        }

        if (req.files && req.files.media) {
            try {
                const uploadResult = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { resource_type: 'auto', folder: 'Employee Picture' },
                        (error, result) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(result.secure_url);
                            }
                        }
                    );
                    stream.end(req.files.media.data);
                });
                image = uploadResult;
            } catch (error) {
                return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Failed to upload new image' });
            }
        } else {
            image = existing[0].image;
        }

        const updatedPersonalId = personalId || existing[0].personal_id;
        const updatedFirstName = firstName || existing[0].first_name;
        const updatedLastName = lastName || existing[0].last_name;
        const updatedFullName = `${updatedFirstName} ${updatedLastName}`;
        const updatedEmail = email || existing[0].email;
        const updatedPhoneNumber = phoneNumber || existing[0].phone_number;
        const updatedHireDate = hireDate || existing[0].hire_date;
        const updatedPosition = level || existing[0].level;
        const updatedJobType = department || existing[0].department;
        const updatedAddress = address || existing[0].address;
        const updatedIsActive = (typeof isActive !== 'undefined') ? (isActive === 'true') : existing[0].is_active;

        const { rows: updatedEmployee } = await pool.query(
            'UPDATE employee SET personal_id = $1, first_name = $2, last_name = $3, full_name = $4, email = $5, phone_number = $6, hire_date = $7, department= $8, level= $9, address = $10, image = $11, is_active = $12 WHERE id = $13 RETURNING *',
            [updatedPersonalId, updatedFirstName, updatedLastName, updatedFullName, updatedEmail, updatedPhoneNumber, updatedHireDate, updatedJobType, updatedPosition, updatedAddress, image, updatedIsActive, id]
        );

        res.status(StatusCodes.OK).json(updatedEmployee[0]);
    } catch (error) {
        next(error);
    }
};


const getEmployee = async (req, res, next) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const { rows: employees } = await pool.query(
            'SELECT * FROM employee ORDER BY hire_date DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );

        const { rows: total } = await pool.query('SELECT COUNT(*) FROM employee');
        const totalEmployees = parseInt(total[0].count, 10);

        res.status(StatusCodes.OK).json({
            totalEmployees,
            totalPages: Math.ceil(totalEmployees / limit),
            limit,
            currentPage: page,
            employees
        });
    } catch (error) {
        next(error);
    }
};

const getFormerEmployees = async (req, res, next) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const { rows: employees } = await pool.query(
            'SELECT * FROM employee WHERE is_active = false ORDER BY hire_date DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );

        const { rows: total } = await pool.query('SELECT COUNT(*) FROM employee WHERE is_active = false');
        const totalEmployees = parseInt(total[0].count, 10);

        res.status(StatusCodes.OK).json({
            totalEmployees,
            totalPages: Math.ceil(totalEmployees / limit),
            currentPage: page,
            employees
        });
    } catch (error) {
        next(error);
    }
};
const getSingleEmployee = async (req, res, next) => {
    try {
        const { id } = req.params;

        const { rows: employee } = await pool.query(
            'SELECT * FROM employee WHERE id = $1',
            [id]
        );

        if (employee.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: "Employee not found." });
        }

        res.status(StatusCodes.OK).json(employee[0]);
    } catch (error) {
        console.error('Error fetching employee details:', error.message);
        next(error);
    }
};
const deleteEmployee = async (req, res, next) => {
    try {
        const { id } = req.params;

        const { rows: employee } = await pool.query(
            'DELETE FROM employee WHERE id = $1 RETURNING *',
            [id]
        );

        if (employee.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: "Employee not found." });
        }

        res.status(StatusCodes.OK).json({ message: "Employee deleted successfully"});
    } catch (error) {
        console.error('Error deleting employee:', error.message);
        next(error);
    }
};
const updateEmployeeStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        let { is_active } = req.body;

        const isActiveBoolean = is_active === 'true';

        const { rows: existingEmployee } = await pool.query("SELECT * FROM employee WHERE id = $1", [id]);

        if (existingEmployee.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'Employee not found' });
        }

        const { rows: updatedEmployee } = await pool.query(
            `UPDATE employee
            SET is_active = $1
            WHERE id = $2
            RETURNING *`,
            [isActiveBoolean, id]
        );

        res.status(StatusCodes.OK).json(updatedEmployee[0]);
    } catch (error) {
        console.error('Error updating employee status:', error.message);
        next(error);
    }
};

const getActiveEmployees = async (req, res, next) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const { rows: employees } = await pool.query(
            'SELECT * FROM employee WHERE is_active = true ORDER BY hire_date DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );

        const { rows: total } = await pool.query('SELECT COUNT(*) FROM employee WHERE is_active = true');
        const totalEmployees = parseInt(total[0].count, 10);

        res.status(StatusCodes.OK).json({
            totalEmployees,
            totalPages: Math.ceil(totalEmployees / limit),
            currentPage: page,
            employees
        });
    } catch (error) {
        console.error('Error fetching active employees:', error.message);
        next(error);
    }
};

const searchEmployeesByName = async (req, res, next) => {
    try {
        const { name } = req.query;

        if (!name) {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .json({ message: 'Please provide a name to search' });
        }

        const { rows: employees } = await pool.query(
            `SELECT * FROM employee WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR full_name ILIKE $1 ORDER BY hire_date DESC`,
            [`%${name}%`]
        );

        if (employees.length === 0) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: 'No employees found with the specified name' });
        }

        res.status(StatusCodes.OK).json(employees);
    } catch (error) {
        console.error('Error searching employees by name:', error.message);
        next(error);
    }
};



module.exports = {
    createEmployee,
    updateEmployee,
    getEmployee,
    getFormerEmployees,
    getSingleEmployee,
    deleteEmployee,
    updateEmployeeStatus,
    getActiveEmployees,
    searchEmployeesByName
};
