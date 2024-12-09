const pool = require('../db/connect');
const { StatusCodes } = require('http-status-codes');
const cloudinary = require('cloudinary').v2;
const { extractPublicId } = require('./content');

const createTestimonial = async (req, res, next) => {
    try {
        if (!req.files || !req.files.media) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Please upload an image' });
        }

        const { fullname, company_name, message } = req.body;
        if (!message) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Message is required' });
        }

        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { resource_type: 'auto', folder: 'testimonial_media' },
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

        const newTestimonial = await pool.query(
            'INSERT INTO testimonial (fullname, company_name, message, image) VALUES ($1, $2, $3, $4) RETURNING *',
            [fullname, company_name, message, uploadResult]
        );

        res.status(StatusCodes.CREATED).json(newTestimonial.rows[0]);
    } catch (error) {
        next(error);
    }
};

const updateTestimonial = async (req, res, next) => {
    const { id } = req.params;
    const { fullname, company_name, message } = req.body;
    let { image } = req.body;

    try {
        const { rows: existing } = await pool.query('SELECT * FROM testimonial WHERE id = $1', [id]);
        if (existing.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: "Testimonial not found." });
        }

        if (req.files && req.files.media) {
            const oldImageUrl = existing[0].image;
            if (oldImageUrl) {
                try {
                    console.log('Full Image URL:', oldImageUrl);
                    const publicId = extractPublicId(oldImageUrl);
                    console.log('Deleting image with public ID:', publicId);
                    const result = await cloudinary.uploader.destroy(publicId);
                    console.log('Cloudinary Response for Delete:', result);
                } catch (error) {
                    console.error('Failed to delete old image from Cloudinary:', error);
                }
            }

            try {
                const uploadResult = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { resource_type: 'auto', folder: 'testimonial_media' },
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

        const { rows: updatedTestimonial } = await pool.query(
            'UPDATE testimonial SET fullname = $1, company_name = $2, message = $3, image = $4 WHERE id = $5 RETURNING *',
            [fullname, company_name, message, image, id]
        );

        res.status(StatusCodes.OK).json(updatedTestimonial[0]);
    } catch (error) {
        next(error);
    }
};

const deleteTestimonial = async (req, res, next) => {
    const { id } = req.params;

    try {
        const { rows: existing } = await pool.query('SELECT * FROM testimonial WHERE id = $1', [id]);
        if (existing.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: "Testimonial not found." });
        }

        const image = existing[0].image;
        if (image) {
            try {
                console.log('Full Image URL:', image);
                const publicId = extractPublicId(image);
                console.log('Deleting image with public ID:', publicId);
                const result = await cloudinary.uploader.destroy(publicId);
                console.log('Cloudinary Response for Delete:', result);
            } catch (error) {
                console.error('Failed to delete image from Cloudinary:', error);
            }
        }

        await pool.query('DELETE FROM testimonial WHERE id = $1', [id]);

        res.status(StatusCodes.OK).json({message: 'Testimonial deleted successfully'});
    } catch (error) {
        next(error);
    }
};

const getTestimonials = async (req, res, next) => {
    try {
        const testimonials = await pool.query('SELECT * FROM testimonial ORDER BY created_at DESC');
        res.status(StatusCodes.OK).json(testimonials.rows);
    } catch (error) {
        next(error);
    }
};
const getSingleTestimonial = async (req, res, next) => {
    const { id } = req.params;

    try {
        const query = 'SELECT * FROM testimonial WHERE id = $1';
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: `No testimonial found with ID ${id}` });
        }

        res.status(StatusCodes.OK).json( result.rows[0] );
    } catch (error) {
        console.error('Error fetching testimonial:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Error fetching testimonial.' });
    }
};

module.exports = {
    createTestimonial,
    deleteTestimonial,
    updateTestimonial,
    getTestimonials,
    getSingleTestimonial
};
