const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const cloudinary = require('cloudinary').v2;
const transporter = require('./nodemailerConfig');

const sendEmail = async ({ to, subject, html, attachments }) => {
  return transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
    attachments,
  });
};

const sendWelcomeEmail = async (userEmail, department, level) => {
  let subject = 'Welcome!';
  let html = `<p>Welcome to our service! Thank you for getting in touch. We'll review your inquiry shortly.</p>`;

  switch (department.toLowerCase()) { 
    case 'ui/ux':
      switch (level.toLowerCase()) { 
        case 'intern':
          subject = 'Thank You for Applying for UI/UX Internship';
          html = `<p>Thank you for applying for the UI/UX Intern position. We will get in touch with you soon regarding your application.</p>`;
          break;
        case 'junior':
          subject = 'Thank You for Applying for Junior UI/UX';
          html = `<p>Thank you for applying for the Junior UI/UX position. We will review your application and get back to you shortly.</p>`;
          break;
        case 'mid':
          subject = 'Thank You for Applying for Mid-level UI/UX';
          html = `<p>Thank you for applying for the Mid-level UI/UX position. Our team will review your application and contact you soon.</p>`;
          break;
        case 'senior':
          subject = 'Thank You for Applying for Senior UI/UX';
          html = `<p>Thank you for applying for the Senior UI/UX position. Our team will review your application and get in touch with you soon.</p>`;
          break;
        default:
          break;
      }
      break;

    case 'frontend':
      switch (level.toLowerCase()) {
        case 'intern':
          subject = 'Thank You for Applying for Frontend Internship';
          html = `<p>Thank you for applying for the Frontend Intern position. We will contact you soon regarding your application.</p>`;
          break;
        case 'junior':
          subject = 'Thank You for Applying for Junior Frontend Developer';
          html = `<p>Thank you for applying for the Junior Frontend Developer position. We will review your application and get in touch with you soon.</p>`;
          break;
        case 'mid':
          subject = 'Thank You for Applying for Mid-level Frontend Developer';
          html = `<p>Thank you for applying for the Mid-level Frontend Developer position. We will review your application and contact you shortly.</p>`;
          break;
        case 'senior':
          subject = 'Thank You for Applying for Senior Frontend Developer';
          html = `<p>Thank you for applying for the Senior Frontend Developer position. Our team will get back to you shortly after reviewing your application.</p>`;
          break;
        default:
          break;
      }
      break;

    case 'backend':
      switch (level.toLowerCase()) {
        case 'intern':
          subject = 'Thank You for Applying for Backend Internship';
          html = `<p>Thank you for applying for the Backend Intern position. We will get in touch with you soon regarding your application.</p>`;
          break;
        case 'junior':
          subject = 'Thank You for Applying for Junior Backend Developer';
          html = `<p>Thank you for applying for the Junior Backend Developer position. We will review your application and get in touch with you soon.</p>`;
          break;
        case 'mid':
          subject = 'Thank You for Applying for Mid-level Backend Developer';
          html = `<p>Thank you for applying for the Mid-level Backend Developer position. Our team will review your application and contact you soon.</p>`;
          break;
        case 'senior':
          subject = 'Thank You for Applying for Senior Backend Developer';
          html = `<p>Thank you for applying for the Senior Backend Developer position. We will review your application and get back to you soon.</p>`;
          break;
        default:
          break;
      }
      break;

    default:
      subject = 'Thank You for Your Interest in Our Company';
      html = `<p>Thank you for your interest in our company. We have received your application, and our team will review it and get in touch with you soon.</p>`;
      break;
  }

  await sendEmail({
    to: userEmail,
    subject,
    html,
  });
};

const autoRespondToEmail = async (userMessage, userEmail) => {
  try {
    let subject = 'Thank You for Contacting Us';
    let html = `<p>We have received your message. Our team will get back to you shortly.</p>`;
    const lowerCaseMessage = userMessage.toLowerCase();

    switch (true) {
      case lowerCaseMessage.includes('internship') || lowerCaseMessage.includes('intern'):
        if (lowerCaseMessage.includes("don't like") || lowerCaseMessage.includes('not good')) {
          subject = 'We’re Sorry to Hear About Your Experience';
          html = `<p>We're sorry to hear that you had a negative experience with our internship program. Please let us know how we can improve. Your feedback is important to us.</p>`;
        } else {
          subject = 'Thank You for Your Interest in Our Internship Program';
          html = `<p>Thank you for your interest in our internship program. We'll review your application and get back to you soon.</p>`;
        }
        break;

      case lowerCaseMessage.includes('job'):
        if (lowerCaseMessage.includes("don't like") || lowerCaseMessage.includes('not good')) {
          subject = 'We’re Sorry to Hear About Your Experience';
          html = `<p>We're sorry to hear that you had a negative experience with our job opportunities. Please let us know how we can improve. Your feedback is important to us.</p>`;
        } else {
          subject = 'Thank You for Your Job Inquiry';
          html = `<p>Thank you for your interest in job opportunities with us. Our team will review your application and respond accordingly.</p>`;
        }
        break;

      case lowerCaseMessage.includes('support'):
        subject = 'Support Request Received';
        html = `<p>Thank you for reaching out for support. Our support team will get in touch with you shortly.</p>`;
        break;

      case lowerCaseMessage.includes('complaint') || lowerCaseMessage.includes('issue'):
        subject = 'We’re Here to Help';
        html = `<p>We're sorry to hear that you had an issue. Our support team will look into this immediately and get back to you as soon as possible.</p>`;
        break;

      default:
        break;
    }

    await sendEmail({
      to: userEmail,
      subject,
      html,
    });

    console.log(`Auto-response sent to ${userEmail} with subject: "${subject}"`);
  } catch (error) {
    console.error(`Failed to send auto-response to ${userEmail}:`, error);
    throw new Error('Error sending auto-response email');
  }
};

const logUserToExcel = async (enrollerData) => {
  const filePath = path.join(__dirname, '../enrollers.xlsx');

  let workbook;
  let worksheet;

  if (fs.existsSync(filePath)) {
    workbook = xlsx.readFile(filePath);
    worksheet = workbook.Sheets['Enrollers'] || workbook.Sheets[workbook.SheetNames[0]];
  } else {
    workbook = xlsx.utils.book_new();
    worksheet = xlsx.utils.json_to_sheet([]);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Enrollers');
  }

  const jsonData = xlsx.utils.sheet_to_json(worksheet);
  jsonData.push(enrollerData);

  const newWorksheet = xlsx.utils.json_to_sheet(jsonData);
  workbook.Sheets['Enrollers'] = newWorksheet;

  xlsx.writeFile(workbook, filePath);

  const uploadResult = await uploadFileToCloudinary(filePath);

  console.log('File uploaded to Cloudinary:', uploadResult);
};

const uploadFileToCloudinary = (filePath) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      { resource_type: 'auto', folder: 'panacea', tags: ['enrollers'] },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );
  });
};

const sendResetPasswordEmail = async ({ name, email, token, origin }) => {
  const resetURL = `${origin}/reset-password?token=${token}&email=${email}`;
  const message = `<p>Please reset your password by clicking on the following link: 
  <a href="${resetURL}">Reset Password</a></p>`;

  return sendEmail({
    to: email,
    subject: 'Reset Password',
    html: `<h4>Hello, ${name}</h4>
   ${message}
   `,
  });
};

const sendCourseEmail = async (userEmail, interestedCourse) => {
  let subject = 'Welcome to the Course!';
  let html = `<p>Thank you for enrolling in our course. We will contact you with further details shortly.</p>`;

  const normalizedCourse = interestedCourse.toLowerCase(); // Normalize to lowercase for case-insensitive matching

  switch (normalizedCourse) {
    case 'wordpress development':
      subject = 'Thank You for Enrolling in WordPress Development';
      html = `<p>Thank you for enrolling in the WordPress Development course. We're excited to have you on board and will reach out to you soon with further details.</p>`;
      break;

    case 'public speaking':
      subject = 'Thank You for Enrolling in Public Speaking';
      html = `<p>Thank you for enrolling in the Public Speaking course. We're excited to help you become a better speaker. You'll hear from us soon!</p>`;
      break;

    case 'mern stack':
      subject = 'Thank You for Enrolling in MERN Stack';
      html = `<p>Thank you for enrolling in the MERN Stack course. We're eager to help you master full-stack development. Stay tuned for more information.</p>`;
      break;

    case 'python with data science':
      subject = 'Thank You for Enrolling in Python With Data Science';
      html = `<p>Thank you for enrolling in the Python With Data Science course. We're excited to guide you through the journey of data science. We'll be in touch soon.</p>`;
      break;

    case 'ui/ux design':
      subject = 'Thank You for Enrolling in UI/UX Design';
      html = `<p>Thank you for enrolling in the UI/UX Design course. We're excited to help you hone your design skills. Further details will follow soon!</p>`;
      break;

    case 'basic computer training':
      subject = 'Thank You for Enrolling in Basic Computer Training';
      html = `<p>Thank you for enrolling in the Basic Computer Training course. We'll make sure you get started on the right foot. We'll reach out to you soon.</p>`;
      break;

    default:
      subject = 'Thank You for Your Interest in Our Course';
      html = `<p>Thank you for your interest in our courses. We have received your enrollment, and our team will contact you soon with more information.</p>`;
  }

  await sendEmail({
    to: userEmail,
    subject,
    html,
  });
};

module.exports = {
  sendWelcomeEmail,
  autoRespondToEmail,
  logUserToExcel,
  sendResetPasswordEmail,
  sendCourseEmail,
};
