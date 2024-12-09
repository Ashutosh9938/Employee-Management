const nodemailer = require('nodemailer');

const nodemailerConfig = {
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
};

const transporter = nodemailer.createTransport(nodemailerConfig);

module.exports = transporter;
