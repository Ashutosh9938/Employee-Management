# Overview

This project is a backend API built with Node.js and Express.js. It provides services such as user authentication, content management, employee management, testimonial handling, and contact form submissions. The project uses PostgreSQL as the database and Cloudinary for media uploads. The security of the application is enhanced by using various middleware like Helmet, XSS Clean, HPP, and CSRF protection. The application is modular, with routes and controllers defined separately to handle different aspects of the application.

# Environment Variables

PORT=5000
JWT_SECRET=your_jwt_secret
CLOUD_NAME=your_cloudinary_name
CLOUD_API_KEY=your_cloudinary_api_key
CLOUD_API_SECRET=your_cloudinary_api_secret
DATABASE_URL=your_database_url
USER_ID=admin user_id
EMAIL=email
PASSWORD=Gmail password

## server.js

The `server.js` file is the main entry point of the application. It sets up the Express server, applies security middleware, handles file uploads, configures Cloudinary, sets up routes, and starts the server. The following libraries are configured:

1. `dotenv` - Loads environment variables from a `.env` file into `process.env`.
2. `express-async-errors` - Allows for easier error handling in asynchronous functions.
3. `express-fileupload` - Middleware for handling file uploads.
4. `cookie-parser` - Parses cookies attached to the client request object.
5. `express` - The core framework for building the web application.
6. `helmet` - Secures Express apps by setting various HTTP headers.
7. `csrf` - Middleware for Cross-Site Request Forgery (CSRF) protection.
8. `hpp` - Protects against HTTP Parameter Pollution attacks.
9. `xss-clean` - Middleware to sanitize user input to prevent XSS (Cross-site Scripting) attacks.
10. `express-rate-limit` - Middleware to limit repeated requests to public APIs and endpoints.
11. `cloudinary` - Cloud service for managing and serving media files.

### Security Middleware Setup

- **Helmet**: Sets security-related HTTP headers.
- **xssClean**: Sanitizes user input to prevent XSS attacks.
- **hpp**: Protects against HTTP Parameter Pollution attacks.
- **Rate Limiting**: Limits the number of requests to the API to prevent abuse.


### Content Security Policy (CSP)

- Configures the Content Security Policy to specify allowed sources for various types of content such as scripts, styles, images, etc., to prevent XSS and other injection attacks.

### File Upload Configuration

- The `express-fileupload` middleware is configured to handle file uploads without using temporary files.

### Cloudinary Configuration

- Configures the Cloudinary SDK with credentials from the environment variables for managing and uploading media files.

## API Routes

### Authentication and Authorization

#### \`authRoutes.js\`

- **POST /register**: Registers a new user (Admin only).
- **POST /login**: Authenticates a user and provides a JWT token.
- **POST /logout**: Logs out the user by clearing their token.
- **GET /users**: Fetches all users (Admin only).
- **GET /users/:id**: Fetches a single user by ID (Admin only).
- **DELETE /users/:id**: Deletes a user by ID (Admin only).
- **POST /forgot-password**: Sends a reset token via email.
- **POST /reset-password**: Resets password using a reset token.

#### Middleware: \`authentication.js\`

- **authenticateUser**: Verifies JWT for authentication.
- **authorizePermissions**: Checks user role for authorization.

### Content Management

#### \`contentRoutes.js\`

- **GET /topViewed**: Retrieves the most viewed content.
- **GET /:id**: Retrieves specific content by ID.
- **POST /**: Creates new content (Admin/Content Writer).
- **PATCH /:id**: Updates existing content (Admin/Content Writer).
- **DELETE /:id**: Deletes content by ID (Admin/Content Writer).
- **GET /**: Retrieves all content with pagination.

### Employee Management

#### \`employeeRoutes.js\`

- **POST /**: Creates a new employee (Admin only).
- **PATCH /:id**: Updates an employee’s details (Admin only).
- **GET /**: Retrieves all employees (Admin only).
- **GET /former**: Retrieves former employees (Admin only).
- **GET /active**: Retrieves active employees (Admin only).

### Testimonial Management

#### \`testimonialRoutes.js\`

- **POST /**: Adds a new testimonial (Admin only).
- **GET /**: Retrieves all testimonials.
- **PATCH /:id**: Updates a testimonial (Admin only).
- **DELETE /:id**: Deletes a testimonial by ID (Admin only).

### Contact Form Handling

#### \`contactUsRoutes.js\`

- **POST /**: Submits a new contact form.
- **GET /**: Retrieves all contact form submissions (Admin only).
- **GET /:id**: Retrieves a single form by ID (Admin only).
- **DELETE /:id**: Deletes a form by ID (Admin only).

### Vacancy Management

#### Vacancy Form Routes

These routes handle job vacancy form submissions and retrieval:

- **GET /vacancyForm**: Retrieves all submitted job vacancy forms (Admin only).
- **GET /vacancyForm/search**: Searches sorted job vacancy forms (Admin only).
- **GET /vacancyForm/:id**: Retrieves a specific vacancy form by ID (Admin only).
- **POST /vacancyForm**: Submits a job vacancy form (Public).

#### Vacancy Routes

These routes manage job vacancies:

- **GET /vacancy/active**: Retrieves active job vacancies.
- **GET /vacancy**: Retrieves all job vacancies.
- **GET /vacancy/:id**: Retrieves a specific job vacancy by ID.
- **POST /vacancy/create**: Creates a new job vacancy (Admin only).
- **DELETE /vacancy/delete/:id**: Deletes a job vacancy by ID (Admin only).
- **PATCH /vacancy/update/:id**: Updates a job vacancy by ID (Admin only).
- **PATCH /vacancy/:id/status**: Updates a vacancy’s status (Admin only).

### Course Management

#### \`courseRoutes.js\`

Manages course creation, retrieval, and updates:

- **POST /courses**: Creates a new course (Admin only).
- **GET /courses**: Retrieves all courses.
- **GET /courses/:id**: Retrieves a course by ID.
- **PATCH /courses/:id**: Updates a course by ID (Admin only).

#### Enroll Routes

- **GET /enroll**: Retrieves all enrollees (Admin only).
- **GET /enroll/:id**: Retrieves an enrollee by ID (Admin only).
- **DELETE /enroll/:id**: Deletes an enrollee by ID (Admin only).
- **POST /enroll**: Submits a new enrollee record (Public).

### Role-Based Access

- **Admin-only**: Only admin users can create, update, or delete job vacancies.
- **Public Access**: Anyone can retrieve vacancy forms or job listings based on the specified filters.

### Notes for Front-End Integration

- **File Upload**: Any job vacancy-related media uploads (like vacancy logos or images) should be handled using `multipart/form-data` when posting data to the server.
- **Pagination & Filtering**: Use the `page` and `limit` query parameters where applicable for better user experience when retrieving large datasets of vacancies.
- **Authentication**: Admin endpoints (e.g., `/create`, `/update`, `/delete`) require proper JWT authentication. The front-end must include the JWT token in the request headers for these operations.

## Utility Functions

- **createHash**: Creates a SHA-256 hash, used for hashing sensitive data such as password reset tokens.
- **extractPublicId**: Extracts the public ID from a Cloudinary URL, useful for managing uploaded images.
- **autoRespondToEmail**: Sends an automated response to users who submit a contact form.
- **logUserToExcel**: Logs user interactions to an Excel file for record-keeping.

## Database Connection

- **pool.js**: Sets up a connection pool for PostgreSQL using `pg` library to handle database operations efficiently.

## Error Handling

Custom error classes are defined to handle various error scenarios like authentication errors, bad requests, and unauthorized access:

- **CustomAPIError**: Base class for all custom errors.
- **UnauthenticatedError**: Thrown when authentication fails.
- **UnauthorizedError**: Thrown when a user tries to access a route they are not authorized to access.
- **BadRequestError**: Thrown when invalid data is provided in the request.

## Front-End Integration Overview

### Where Requests Are Coming From

- The front-end application will make HTTP requests to the API endpoints defined in the routes (e.g., `/api/v1/auth/register`, `/api/v1/content`, etc.).
- The front-end should handle JWT tokens for authentication, typically by storing them in HTTP-only cookies or local storage (though HTTP-only cookies are more secure).
- CSRF tokens are used for protecting POST requests; these should be included in the headers of POST requests from the front-end.
- File uploads (e.g., images) should be sent as `multipart/form-data` to the appropriate endpoints, like `/api/v1/content` for blog posts or `/api/v1/employee` for employee pictures.

### Summary for Front-End Developers

- Use JWT for authenticating API requests.
- Ensure CSRF tokens are included in POST requests.
- Handle pagination for lists (e.g., blogs, employees) by making requests with `page` and `limit` query parameters.
- When working with file uploads (e.g., images), use `multipart/form-data` format.
- Be mindful of the role-based access controls when making API requests, as some actions are restricted to Admin or Content Writer roles only.
- Error messages and status codes returned by the API should be handled gracefully in the front-end application.

# Conclusion

This backend system provides a robust, secure, and scalable solution for managing content, user data, employees, testimonials, and contact forms. By adhering to security best practices and using modern technologies, it ensures that data integrity and user experience are maintained at a high standard.
