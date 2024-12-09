const pool = require('../db/connect');
const { StatusCodes } = require('http-status-codes');
const dayjs = require('dayjs');


const getVacancies = async (req, res, next) => {
    try {
        const { department, level } = req.query; 
        let query = "SELECT * FROM create_vacancy WHERE 1=1";  
        const values = [];
        let valueIndex = 1;


        if (department) {
            query += ` AND department = $${valueIndex}`;
            values.push(department);
            valueIndex += 1;
        }

        if (level) {
            query += ` AND level = $${valueIndex}`;
            values.push(level);
            valueIndex += 1;
        }

        query += " ORDER BY created_at DESC";

        const result = await pool.query(query, values);
        const currentDate = dayjs();

        const updatedVacancies = await Promise.all(result.rows.map(async (vacancy) => {
            const closingDate = dayjs(vacancy.closing_date);

            if (closingDate.isBefore(currentDate) && vacancy.is_active) {
                await pool.query(
                    `UPDATE create_vacancy SET is_active = $1 WHERE id = $2`,
                    [false, vacancy.id]
                );
                vacancy.is_active = false;  
            }

            return vacancy;
        }));

        res.status(StatusCodes.OK).json(updatedVacancies);
    } catch (err) {
        console.error(err.message);
        next(err);
    }
};



const getAllVacancies = async (req, res, next) => {
    try {
        const result = await pool.query("SELECT * FROM create_vacancy ORDER BY created_at DESC");
        const currentDate = dayjs();

        const updatedVacancies = await Promise.all(result.rows.map(async (vacancy) => {
            const closingDate = dayjs(vacancy.closing_date);

            if (closingDate.isBefore(currentDate) && vacancy.is_active) {
                await pool.query(
                    `UPDATE create_vacancy SET is_active = $1 WHERE id = $2`,
                    [false, vacancy.id]
                );
                vacancy.is_active = false; 
            }

            return vacancy;
        }));

        res.status(StatusCodes.OK).json(updatedVacancies);
    } catch (err) {
        console.error(err.message);
        next(err);
    }
};


const getSingleVacancy = async (req, res, next) => {
    try {
        const { id } = req.params;
        console.log(id);
        const result = await pool.query("SELECT * FROM create_vacancy WHERE id = $1", [id]);

        if (result.rows.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'Vacancy not found' });
        }

        const vacancy = result.rows[0];
        const closingDate = dayjs(vacancy.closing_date);
        const currentDate = dayjs();

        if (closingDate.isBefore(currentDate) && vacancy.is_active) {
            await pool.query(
                `UPDATE create_vacancy SET is_active = $1 WHERE id = $2`,
                [false, vacancy.id]
            );
            vacancy.is_active = false;
        }

        res.status(StatusCodes.OK).json(vacancy);
    } catch (err) {
        console.error(err.message);
        next(err);
    }
};

const createVacancy = async (req, res, next) => {
    try {
        const { title, department, level, description, closing_date, is_active = true } = req.body;

        if (!title || !department || !level || !description || !closing_date) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'All fields are required' });
        }

        const closingDate = dayjs(closing_date);
        const currentDate = dayjs();

        if (!closingDate.isValid() || !closingDate.isAfter(currentDate)) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Closing date Invalid' });
        }

        const newVacancy = await pool.query(
            `INSERT INTO create_vacancy (title, department, level, description, closing_date, is_active)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [title, department, level, description, closingDate.format('YYYY-MM-DD'), is_active]
        );

        res.status(StatusCodes.CREATED).json(newVacancy.rows[0]);
    } catch (err) {
        console.error(err.message);
        next(err);
    }
};

const deleteVacancy = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query("DELETE FROM create_vacancy WHERE id = $1 RETURNING *", [id]);

        if (result.rows.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'Vacancy not found' });
        }

        res.status(StatusCodes.OK).json({ message: 'Vacancy deleted successfully' });
    } catch (err) {
        console.error(err.message);
        next(err);
    }
};
const updateVacancyStatus = async (req, res, next) => {
    try {
        const { id } = req.params;  
        const { is_active } = req.body;  

        if (typeof is_active !== 'boolean') {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid value for is_active. It must be true or false.' });
        }

        const existingVacancyResult = await pool.query("SELECT * FROM create_vacancy WHERE id = $1", [id]);

        if (existingVacancyResult.rows.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'Vacancy not found' });
        }

        const updatedVacancy = await pool.query(
            `UPDATE create_vacancy
            SET is_active = $1
            WHERE id = $2
             RETURNING *`,
            [is_active, id]
        );

        res.status(StatusCodes.OK).json(updatedVacancy.rows[0]);
    } catch (err) {
        console.error('Error updating vacancy status:', err.message);
        next(err);
    }
};

const updateVacancy = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, department, level, description, closing_date, is_active } = req.body;

        const existingVacancyResult = await pool.query("SELECT * FROM create_vacancy WHERE id = $1", [id]);

        if (existingVacancyResult.rows.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'Vacancy not found' });
        }

        const existingVacancy = existingVacancyResult.rows[0];

        if (title === "" || department === "" || level === "" || description === "") {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Required fields cannot be empty or null' });
        }

        const updatedTitle = title !== undefined ? title : existingVacancy.title;
        const updatedDepartment = department !== undefined ? department : existingVacancy.department;
        const updatedLevel = level !== undefined ? level : existingVacancy.level;
        const updatedDescription = description !== undefined ? description : existingVacancy.description;
        const updatedClosingDate = closing_date ? dayjs(closing_date) : dayjs(existingVacancy.closing_date);
        const updatedIsActive = is_active !== undefined ? is_active : existingVacancy.is_active;

        const currentDate = dayjs();
        if (!updatedClosingDate.isValid() || !updatedClosingDate.isAfter(currentDate)) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Closing date must be valid and after the current date' });
        }

        if (
            updatedTitle === existingVacancy.title &&
            updatedDepartment === existingVacancy.department &&
            updatedLevel === existingVacancy.level &&
            updatedDescription === existingVacancy.description &&
            updatedClosingDate.format('YYYY-MM-DD') === dayjs(existingVacancy.closing_date).format('YYYY-MM-DD') &&
            updatedIsActive === existingVacancy.is_active
        ) {
            return res.status(StatusCodes.OK).json({ message: 'No changes made' });
        }

        const updatedVacancy = await pool.query(
            `UPDATE create_vacancy
            SET title = $1, department = $2, level = $3, description = $4, closing_date = $5, is_active = $6
             WHERE id = $7 RETURNING *`,
            [updatedTitle, updatedDepartment, updatedLevel, updatedDescription, updatedClosingDate.format('YYYY-MM-DD'), updatedIsActive, id]
        );

        res.status(StatusCodes.OK).json(updatedVacancy.rows[0]);
    } catch (err) {
        console.error(err.message);
        next(err);
    }
};
const getActiveVacancies = async (req, res, next) => {
    try {
        const result = await pool.query("SELECT * FROM create_vacancy WHERE is_active = true ORDER BY created_at DESC");
        const currentDate = dayjs();

        const updatedVacancies = await Promise.all(result.rows.map(async (vacancy) => {
            const closingDate = dayjs(vacancy.closing_date);

            if (closingDate.isBefore(currentDate) && vacancy.is_active) {
                await pool.query(
                    `UPDATE create_vacancy SET is_active = $1 WHERE id = $2`,
                    [false, vacancy.id]
                );
                vacancy.is_active = false;  
            }

            return vacancy;
        }));
        const activeVacancies = updatedVacancies.filter(vacancy => vacancy.is_active);

        res.status(StatusCodes.OK).json(activeVacancies);
    } catch (err) {
        console.error(err.message);
        next(err);
    }
};


module.exports = { getAllVacancies, getSingleVacancy, createVacancy, deleteVacancy, updateVacancy,getVacancies, updateVacancyStatus , getActiveVacancies};
