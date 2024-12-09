require('dotenv').config();
require('express-async-errors');
const fileUpload = require('express-fileupload');
const cookieParser = require('cookie-parser');
const express = require('express');
const helmet = require('helmet');
const csrf = require('csurf');
const hpp = require('hpp');
const xssClean = require('xss-clean');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
const app = express();

// Security Middleware Setup
app.use(helmet()); // Set various security-related HTTP headers
app.use(xssClean()); // Sanitize user input to prevent XSS attacks
app.use(hpp()); // Prevent HTTP Parameter Pollution

app.use(
  helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "trusted-cdn.com"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:", "trusted-cdn.com"],
      "connect-src": ["'self'"],
      "font-src": ["'self'", "trusted-cdn.com"],
      "object-src": ["'none'"],
      "upgrade-insecure-requests": [],
    },
  })
);

// Body Parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser(process.env.JWT_SECRET));


// File Upload Configuration
app.use(fileUpload({ useTempFiles: false }));

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

//cross origin resource sharing
app.use(cors({
  origin:
  process.env.HOST_URL  ||
    'http://localhost:3000',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  credentials: true
}));


// Routes
const content = require('./routes/content');
const testimonial = require('./routes/testimonial');
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employee');
const contactus = require('./routes/contactUs');
const vacancyRoutes = require('./routes/vacancy');
const courseRoutes = require('./routes/course');
const vacancyFormRoutes = require('./routes/vacancyForm');
const commentsRoutes = require('./routes/comments');

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/contactUs', contactus);
app.use('/api/v1/testimonial', testimonial);
app.use('/api/v1/content', content);
app.use('/api/v1/employee', employeeRoutes);
app.use('/api/v1/vacancy', vacancyRoutes);
app.use('/api/v1/course', courseRoutes);
app.use('/api/v1/vacancyForm', vacancyFormRoutes);
app.use('/api/v1/comments', commentsRoutes);

const port = process.env.PORT || 5000;

const start = async () => {
  try {
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`)
    );
  } catch (error) {
    console.log(error);
  }
};

start();
