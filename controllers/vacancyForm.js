const pool = require('../db/connect');
const cloudinary = require('cloudinary').v2;
const { sendWelcomeEmail } = require('../utils/sendEmail');


const getVacancyForm = async (req, res, next) => {
    try {
        const allVacancy = await pool.query("SELECT * FROM vacancy_applications");
        res.json(allVacancy.rows);
    } catch (err) {
        console.error(err.message);
        next(err);
    }
};
const vacancyForm = async (req, res, next) => {
    try {
        if (!req.files || !req.files.resume || !req.files.coverLetter) {
            return res.status(400).json({ message: 'Resume and Cover Letter files are required' });
        }

        const resumeFile = req.files.resume;
        const coverLetterFile = req.files.coverLetter;

        if (resumeFile.mimetype !== 'application/pdf') {
            return res.status(400).json({ message: 'Resume must be a PDF file' });
        }
        if (coverLetterFile.mimetype !== 'application/pdf') {
            return res.status(400).json({ message: 'Cover Letter must be a PDF file' });
        }

        const { full_name, email, phone_number, address, city, linkedin_url, github_url, department, level } = req.body;
        if (!full_name || !email || !phone_number || !address || !city || !linkedin_url || !github_url || !department || !level) {
            return res.status(400).json({ message: 'Please fill all the fields' });
        }

        const resumeUploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { resource_type: 'auto', folder: 'panacea', tags: [full_name, 'resume'] },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result.secure_url);
                }
            );
            stream.end(resumeFile.data);
        });
        const coverLetterUploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { resource_type: 'auto', folder: 'panacea', tags: [full_name, 'cover_letter'] },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result.secure_url);
                }
            );
            stream.end(coverLetterFile.data);
        });
        const newVacancy = await pool.query(
            `INSERT INTO vacancy_applications (full_name, email, phone_number, address, city, linkedin_url, github_url, resume_url, cover_letter_url, department, level)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [full_name, email, phone_number, address, city, linkedin_url, github_url, resumeUploadResult, coverLetterUploadResult, department, level]
        );
        await sendWelcomeEmail(email, department, level);
        res.status(201).json(newVacancy.rows[0]);
    } catch (err) {
        console.error('Error processing vacancy form submission:', err);
        next(err);
    }
};

const getAllDepartment = async (req, res, next) => {
    const department = await pool.query("SELECT DISTINCT department FROM vacancy_applications")

    if (department.rows.length === 0) {
        return res.status(404).json({ message: 'No application found' });
    }

    const departmentArr = await Promise.all(department.rows.map(async (d) => {
       return d.department
    }))
    
    res.json(departmentArr);
}

const getSingleVacancyForm = async (req, res, next) => {
    try {
        const { id } = req.params;
        const vacancy = await pool.query("SELECT * FROM vacancy_applications WHERE id = $1", [id]);

        if (vacancy.rows.length === 0) {
            return res.status(404).json({ message: 'Vacancy not found' });
        }

        res.json(vacancy.rows[0]);
    } catch (err) {
        console.error(err.message);
        next(err);
    }
};
const getVacancySortedForm = async (req, res, next) => {
    try {
        const { department, level, full_name, email } = req.query;
        let query = "SELECT * FROM vacancy_applications WHERE 1=1";
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

        if (full_name) {
            query += ` AND full_name ILIKE $${valueIndex}`;
            values.push(`%${full_name}%`);
            valueIndex += 1;
        }

        if (email) {
            query += ` AND email = $${valueIndex}`;
            values.push(email);
            valueIndex += 1;
        }

        query += " ORDER BY created_at DESC";

        const result = await pool.query(query, values);

        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err.message);
        next(err);
    }
};
const deleteVacancyForm = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await pool.query("DELETE FROM vacancy_applications WHERE id = $1 RETURNING *", [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Vacancy application not found' });
        }

        res.status(200).json({ message: 'Vacancy application deleted successfully' });
    } catch (err) {
        console.error('Error deleting vacancy application:', err);
        next(err);
    }
};

module.exports = { vacancyForm, getAllDepartment, getVacancyForm, getSingleVacancyForm, getVacancySortedForm, deleteVacancyForm };