const cors = require("cors");
const session = require('express-session');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const logoPath = path.join(__dirname, "..", "assets", "logo.png");
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Anthropic = require('@anthropic-ai/sdk');
const express = require("express");
const bodyParser = require('body-parser');
const fs = require('fs');
const multer = require("multer");
const PDFDocument = require('pdfkit');
const QRCode = require("qrcode");
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const ConnectPgSimple = require('connect-pg-simple')(session); // <---- Is this line EXACTLY present, including `(session)`?
const { Pool } = require('pg'); // <---- Is this line EXACTLY present at the top?
const fetch = require('node-fetch'); // Import node-fetch for HTTP requests
const cookieParser = require('cookie-parser');

// ... rest of your server.js code ...
// लॉगिंग सेटअप
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const originalConsoleLog = console.log;
const originalConsoleError = console.error; // Also capture console.error

console.log = (...args) => {
  const logMessage = args.map(arg => {
    if (typeof arg === 'object') {
      return JSON.stringify(arg, null, 2); // Pretty print objects
    }
    return arg;
  }).join(' ');

  const timestamp = new Date().toISOString();
  const formattedLog = `[${timestamp}] LOG: ${logMessage}\n`;

  const logFileName = path.join(logsDir, `${new Date().toISOString().split('T')[0]}.log`);

  fs.appendFile(logFileName, formattedLog, (err) => {
    if (err) {
      originalConsoleError("Error writing to log file:", err); // Log error to console if file writing fails
    }
  });
  originalConsoleLog(...args); // Still log to console
};

console.error = (...args) => {
  const logMessage = args.map(arg => {
    if (typeof arg === 'object') {
      return JSON.stringify(arg, null, 2); // Pretty print objects
    }
    return arg;
  }).join(' ');

  const timestamp = new Date().toISOString();
  const formattedLog = `[${timestamp}] ERROR: ${logMessage}\n`;

  const logFileName = path.join(logsDir, `${new Date().toISOString().split('T')[0]}.log`);

  fs.appendFile(logFileName, formattedLog, (err) => {
    if (err) {
      originalConsoleError("Error writing to error log file:", err);
    }
  });
  originalConsoleError(...args); // Still log errors to console
};


// मॉडल्स इनिशियलाइज़ करें
// Initialize Gemini models
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiProModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
const geminiFlashModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// DeepSeek API Key (via OpenRouter or direct DeepSeek API)
const DEEPSEEK_API_KEY = "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"; // Replace with your actual key
const DEEPSEEK_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const app = express();
const port = 5000;

// PostgreSQL Pool Configuration using environment variables
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.log('Error connecting to DB:', err);
  } else {
    console.log('Database connected, response:', res.rows);
  }
});

// Serve the 'receipts' directory as static files
app.use('/receipts', express.static(path.join(__dirname, 'receipts')));

// लॉगिंग मिडलवेयर: सभी इनकमिंग रिक्वेस्ट्स का लॉग दिखाएँ
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}, Origin: ${req.headers.origin}`);
  next();
});

// CORS Configuration - अब दोनों origins की अनुमति है
const allowedOrigins = [
  'http://localhost:3000',          // Development Frontend
  'https://fcc-home-webapp.vercel.app' // Production Frontend (Vercel)
];

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://fcc-home-webapp.vercel.app'
    ];
    console.log("Incoming Origin:", origin); // Log the origin of the request
    let corsAllowed = false;
    if (!origin) {
      corsAllowed = true; // Allow requests without origin (e.g., server-side)
    } else if (allowedOrigins.indexOf(origin) !== -1) {
      corsAllowed = true; // Origin is in allowed list
    }

    if (corsAllowed) {
      console.log(`CORS Allowed for: ${origin}, Setting Access-Control-Allow-Origin: ${origin || '*'}`); // Log allowed and header value
      callback(null, true); // Allow request
    } else {
      console.log(`CORS Blocked for: ${origin}, Origin not in allowed list`); // Log blocked
      callback(new Error('Not allowed by CORS')); // Block request
    }
  },
  credentials: true,  // Allow credentials (cookies) to be sent
  optionsSuccessStatus: 200
};

// Generate Secret Info (Moved before API endpoints)
// const generateSecretInfo = () => uuidv4(); // Secure UUID
// Secret Info Generator
const generateSecretInfo = (score) => {
  if (score >= 90) return "आप बहुत तेजी से सीख रहे हैं!";
  if (score >= 60) return "अच्छा प्रयास! थोड़ा और अभ्यास करें!";
  return "कोई बात नहीं, धीरे-धीरे सुधार होगा!";
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(session({
  store: new ConnectPgSimple({
    pool: pool,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    path: '/',
    httpOnly: true,
    maxAge: 79200000, // 22 घंटे (22 * 60 * 60 * 1000 ms)
    secure: false,
    sameSite: 'lax'
  },
  genid: function(req) {
    console.log("Generating new session ID");
    return uuidv4(); // Use UUIDs for session IDs
  }
}));


const getClientIP = (req) => {
  let ip = req.ip; // Express का req.ip पहले से IPv6 फ्रेंडली है
  if (ip.includes("::ffff:")) {
    ip = ip.replace("::ffff:", ""); // IPv4-mapped IPv6 एड्रेस को ठीक करें
  }
  return ip;
};


// --- User Authentication Routes ---

// 1. User Registration (Optional - if you need users to register themselves)
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
      const passwordHash = await bcrypt.hash(password, 10); // Hash the password
      const result = await pool.query(
          'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at',
          [username, passwordHash]
      );
      console.log(`New user registered: ${username}`);
      res.status(201).json({ message: 'User registered successfully', user: result.rows[0] });
  } catch (error) {
      console.error("Registration error:", error);
      if (error.code === '23505') { // Unique violation error code (username already exists)
          return res.status(409).json({ message: 'Username already exists.' });
      }
      res.status(500).json({ message: 'Error registering user.', error: error.message });
  }
});

// Add this route to your server.js file
app.post('/auto-login', async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ message: 'Username is required.' });
  }

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid username.' });
    }

    // If the user exists, log them in
    return res.status(200).json({ 
      message: 'Auto-login successful',
      accessType: user.access_type 
    });
  } catch (error) {
    console.error("Auto-login error:", error);
    return res.status(500).json({ message: 'Auto-login failed due to a server error.' });
  }
});

// 2. Login Route
app.post('/login', async (req, res) => {
  console.log("--- /login route CALLED ---");
  const { username, password } = req.body;
  const clientIp = getClientIP(req); // Ensure IPv6 is captured
  console.log("Client IP:", clientIp);
  if (!username || !password) {
      console.log("Login failed: Missing username or password");
      return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
      const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
      const user = userResult.rows[0];

      if (!user) {
          console.log(`Login failed: User not found - username: ${username}`);
          return res.status(401).json({ message: 'Invalid username or password.' });
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (passwordMatch) {
          // Set session values including access_type
          req.session.userId = user.id;
          req.session.accessType = user.access_type; // Ensure your users table returns this column
          req.session.loginTimestamp = new Date();
          console.log(`Login successful for user ID: ${user.id}, username: ${username}`);
          console.log("Session after login:", req.session);

          // Log login event to login_log table
          try {
              await pool.query(
                  'INSERT INTO login_log (user_id, ip_address) VALUES ($1, $2)',
                  [user.id, clientIp]
              );
              console.log(`Login event logged to login_log for user ID: ${user.id}`);
          } catch (dbLogError) {
              console.error("Database error logging login event:", dbLogError);
          }

          // Return access_type along with success message
          return res.status(200).json({ 
            message: 'Login successful',
            accessType: user.access_type 
          });
      } else {
          console.log(`Login failed: Password mismatch for username: ${username}`);
          return res.status(401).json({ message: 'Invalid username or password.' });
      }

  } catch (dbError) {
      console.error("Database error during login:", dbError);
      return res.status(500).json({ message: 'Login failed due to a server error.' });
  }
});


// 3. Logout Route
// --- User Authentication Routes ---
app.post('/logout', (req, res) => {
  console.log("--- /logout route CALLED ---");
  console.log("req.session:", req.session);

  if (req.session && req.session.userId) {
    const userId = req.session.userId;
    const logoutTimestamp = new Date();
    const loginTimestamp = req.session.loginTimestamp ? new Date(req.session.loginTimestamp) : logoutTimestamp;

    const sessionDurationMs = logoutTimestamp - loginTimestamp;
    const sessionDurationSeconds = Math.max(0, sessionDurationMs / 1000);

    pool.query(
      'UPDATE login_log SET logout_timestamp = $1, session_duration = $2 WHERE id = (SELECT MAX(id) FROM login_log WHERE user_id = $3 AND logout_timestamp IS NULL)',
      [logoutTimestamp, `${sessionDurationSeconds} seconds`, userId],
      (dbErr, dbResult) => {
        if (dbErr) {
          console.error("Database error updating logout info:", dbErr);
        } else {
          console.log(`Logout info updated in login_log for user ID: ${userId}`);
        }

        req.session.destroy((err) => {
          if (err) {
            console.error("Error destroying session during logout:", err);
            return res.status(500).json({ message: 'Logout session destroy error.' });
          }

          // Clear the session cookie
          res.clearCookie('connect.sid');

          // Clear the username cookie
          res.clearCookie('username');

          console.log(`Session destroyed and cookies cleared for user ID: ${userId}`);
          return res.status(200).json({ message: 'Logout successful' });
        });
      }
    );
  } else {
    console.log("No active session to logout.");
    return res.status(400).json({ message: 'No active session to logout.' });
  }
});
// 4. Authentication Middleware (to protect routes)
const requireLogin = (req, res, next) => {
  if (req.session && req.session.userId) {
      // User is logged in
      next(); // Proceed to the next middleware/route handler
  } else {
      // User is not logged in
      res.status(401).json({ message: 'Authentication required. Please log in.' }); // Or redirect to login page if it's a browser app
  }
};


// --- Protected Routes Example ---

app.get('/protected-page', requireLogin, (req, res) => {
  // This route is protected, only logged-in users can access it
  res.status(200).json({ message: 'This is a protected page.', user: { username: req.session.username, userId: req.session.userId } });
});

// Route to insert a new student record
app.post("/add-student", async (req, res) => {
  const {
    name,
    father,
    mother,
    schooling_class,
    mobile_number,
    address,
    paid,
    tutionfee_paid,
    fcc_class,
    fcc_id,
    skills,
    admission_date,
  } = req.body;

  const insertQuery = `
    INSERT INTO "New_Student_Admission"
    (name, father, mother, schooling_class, mobile_number, address, paid, tutionfee_paid, fcc_class, fcc_id, skills, admission_date)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *;
  `;

  try {
    const result = await pool.query(insertQuery, [
      name,
      father,
      mother,
      schooling_class,
      mobile_number,
      address,
      paid,
      tutionfee_paid,
      fcc_class,
      fcc_id,
      skills,
      admission_date,
    ]);
    res.status(201).json(result.rows[0]); // Return response as JSON
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message }); // Send error as JSON
  }
});

app.get('/get-students', async (req, res) => {
  try {
    const query = 'SELECT * FROM "New_Student_Admission"';
    const result = await pool.query(query);

    // Format the admission_date to DD/MM/YY hh:mm AM/PM
    const formattedStudents = result.rows.map(student => ({
      ...student,
      admission_date: formatDate(student.admission_date) // Add formatted date
    }));

    res.json(formattedStudents); // Send the fetched and formatted data as JSON
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Route to update student record
app.put("/update-student/:fcc_id", async (req, res) => {
  const { fcc_id } = req.params;
  const { skills, tutionfee_paid, payment_status } = req.body;

  // Query to update student data
  const updateQuery = `
    UPDATE "New_Student_Admission"
    SET skills = $1, tutionfee_paid = $2
    WHERE fcc_id = $3
    RETURNING *;
  `;

  // Query to update payment status
  const updatePaymentQuery = `
    UPDATE payments
    SET payment_status = $1
    WHERE fcc_id = $2
    RETURNING *;
  `;

  try {
    // Start a transaction
    await pool.query('BEGIN');

    // Update student data
    const studentUpdateResult = await pool.query(updateQuery, [skills, tutionfee_paid, fcc_id]);
    const updatedStudent = studentUpdateResult.rows[0];

    // Update payment status
    if (payment_status) {
      const paymentUpdateResult = await pool.query(updatePaymentQuery, [payment_status, fcc_id]);
      const updatedPayment = paymentUpdateResult.rows[0];
    }

    // Commit transaction
    await pool.query('COMMIT');

    res.status(200).json({ message: 'Student and payment data updated successfully!', student: updatedStudent });

  } catch (err) {
    // Rollback transaction in case of error
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});



// Helper function to format date
const formatDate = (date) => {
  const d = new Date(date);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12;
  const minutesFormatted = minutes < 10 ? '0' + minutes : minutes;
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear().toString().slice(2);

  return `${day}/${month}/${year} ${hours12}:${minutesFormatted} ${ampm}`;
};


// Route to insert a new student record

// Validate FCC ID format
const validateFccId = (fccId) => {
  const regex = /^\d{4}200024$|^XXXX200024$/;
  return regex.test(fccId);
};

// API to update or create student data and log attendance
app.post("/api/update-student", async (req, res) => {
  const { fcc_id, ctc, ctg, task_completed, forceUpdate } = req.body;

  if (!fcc_id) {
    return res.status(400).json({ error: "FCC_ID is required" });
  }

  try {
    // Check if the student already exists in the `students` table
    const checkStudentQuery = "SELECT * FROM students WHERE fcc_id = $1";
    const result = await pool.query(checkStudentQuery, [fcc_id]);

    let ctcUpdated = false;

    if (result.rowCount > 0) {
      // Check if CTC is within 30 hours
      const student = result.rows[0];
      const currentTime = new Date();
      const ctcTime = new Date(student.ctc_time);
      const timeDiff = (currentTime - ctcTime) / (1000 * 60 * 60); // time difference in hours

      if (timeDiff > 30 && !forceUpdate) {
        // If CTC is older than 30 hours, don't update and return error
        return res.status(400).json({ message: "CTC is more than 30 hours old. Update not allowed!" });
      }

      // Update the CTC, CTG, and task completed fields
      const updateStudentQuery = `
        UPDATE students
        SET ctc_time = CASE WHEN $1 THEN NOW() ELSE ctc_time END,
            ctg_time = CASE WHEN $2 THEN NOW() ELSE ctg_time END,
            task_completed = $3
        WHERE fcc_id = $4;
      `;
      await pool.query(updateStudentQuery, [ctc, ctg, task_completed, fcc_id]);

      ctcUpdated = true;
    } else {
      // Insert a new student record
      const insertStudentQuery = `
        INSERT INTO students (fcc_id, ctc_time, ctg_time, task_completed)
        VALUES ($1, CASE WHEN $2 THEN NOW() ELSE NULL END, CASE WHEN $3 THEN NOW() ELSE NULL END, $4);
      `;
      await pool.query(insertStudentQuery, [fcc_id, ctc, ctg, task_completed]);

      ctcUpdated = true;
    }

    // Log attendance
    const logAttendanceQuery = `
      INSERT INTO attendance_log (fcc_id, ctc_time, ctg_time, task_completed, log_date)
      VALUES ($1, CASE WHEN $2 THEN NOW() ELSE NULL END, CASE WHEN $3 THEN NOW() ELSE NULL END, $4, CURRENT_DATE)
      ON CONFLICT (fcc_id, log_date)
      DO UPDATE SET
        ctc_time = CASE WHEN $2 THEN NOW() ELSE attendance_log.ctc_time END,
        ctg_time = CASE WHEN $3 THEN NOW() ELSE attendance_log.ctg_time END,
        task_completed = $4;
    `;
    await pool.query(logAttendanceQuery, [fcc_id, ctc, ctg, task_completed]);

    if (ctcUpdated) {
      res.status(200).json({ message: "Student and attendance log updated successfully.", ctcUpdated: true });
    } else {
      res.status(200).json({ message: "Student and attendance log inserted successfully.", ctcUpdated: false });
    }
  } catch (error) {
    console.error("Error updating or creating student and logging attendance:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Upload data

// Multer Configuration
const storage = multer.memoryStorage(); // Store file in memory as a buffer
const upload = multer({ storage });

// Endpoint to upload file
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { originalname, mimetype, buffer } = req.file;
    const { description } = req.body;

    // Insert file data into the PostgreSQL database, including the uploaded_at field
    const query = `
      INSERT INTO files (filename, filetype, filedata, description, uploaded_at)
      VALUES ($1, $2, $3, $4, NOW()) RETURNING *`;
    const result = await pool.query(query, [originalname, mimetype, buffer, description]);

    res.status(200).json({ message: "File uploaded successfully", file: result.rows[0] });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ message: "Error uploading file", error: error.message });
  }
});

// Endpoint to fetch files with optional filters
app.get("/files", async (req, res) => {
  try {
    const { startDate, endDate, search } = req.query;
    let query = `SELECT id, filename, filetype, description, uploaded_at FROM files`;
    const conditions = [];
    const params = [];

    if (startDate) {
      conditions.push(`uploaded_at >= $${params.length + 1}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`uploaded_at <= $${params.length + 1}`);
      params.push(endDate);
    }
    if (search) {
      conditions.push(`(filename ILIKE '%' || $${params.length + 1} || '%' OR description ILIKE '%' || $${params.length + 1} || '%')`);
      params.push(search);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += " ORDER BY uploaded_at DESC";

    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ message: "Error fetching files" });
  }
});


// Route to download a file
app.get('/files/download/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const query = 'SELECT * FROM files WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'File not found' });
    }

    const file = result.rows[0];

    // Set the response headers for downloading
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.setHeader('Content-Type', file.filetype);

    // Send the file buffer as the response
    res.send(file.filedata);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({ message: 'Error downloading file' });
  }
});


app.post("/api/payments", async (req, res) => {
  const {
    fcc_id,
    amount,
    payment_method,
    payment_status,
    student_name,
    monthly_cycle_days,
  } = req.body;

  try {
    const taxRate = 0.18; // 18% GST rate
    const numericAmount = parseFloat(amount); // Ensure amount is a number
    if (isNaN(numericAmount)) {
      throw new Error("Invalid amount provided");
    }
    const taxAmount = numericAmount * taxRate;
    const grandTotal = numericAmount + taxAmount;

    // Insert payment data into the 'payments' table
    const paymentResult = await pool.query(
      `INSERT INTO payments (fcc_id, amount, payment_method, payment_status, student_name, monthly_cycle_days)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [fcc_id, grandTotal, payment_method, payment_status, student_name, monthly_cycle_days]
    );

    const payment = paymentResult.rows[0];
    const receiptDir = path.join(__dirname, "receipts");

    // Ensure the 'receipts' directory exists
    if (!fs.existsSync(receiptDir)) {
      fs.mkdirSync(receiptDir);
    }

    const receiptPath = path.join(receiptDir, `receipt_${payment.id}.pdf`);
    const doc = new PDFDocument({ margin: 50 });

    // Stream the PDF to file
    doc.pipe(fs.createWriteStream(receiptPath));

   // Outer Border
doc.lineWidth(2).rect(10, 10, doc.page.width - 20, doc.page.height - 20).stroke("#1E90FF");

// Header Section
const imageWidth = 70; // Width of the logo image
const marginRight = 40; // Right margin from the edge of the page
const rightX = doc.page.width - imageWidth - marginRight; // Calculate X position for right alignment

// Check if the logo file exists before loading it
if (fs.existsSync(logoPath)) {
  const imageWidth = 70; // Width of the logo image
  const marginRight = 40; // Right margin from the edge of the page
  const rightX = doc.page.width - imageWidth - marginRight; // Calculate X position for right alignment

  doc.image(logoPath, {
    fit: [imageWidth, 70],
    align: "right",
    valign: "top",
    x: rightX,
    y: doc.y,
  });
} else {
  console.error("Logo file not found:", logoPath);
}
doc.moveDown(0.5);
doc.moveDown(0.5);
doc
  .fontSize(18)
  .font("Helvetica-Bold")
  .fillColor("#1E90FF")
  .text("FCC The Gurukul", { align: "left" });
doc
  .fontSize(10)
  .font("Helvetica")
  .fillColor("black")
  .text("Motisabad Mugaon, Buxar, Bihar – 802126", { align: "left" });
doc.text("Contact: 9135365331 | Email: fccthegurukul@gmail.com", { align: "left" });
doc.moveDown(2);

// Receipt Title
doc
  .fontSize(22)
  .font("Helvetica-Bold")
  .fillColor("#4CAF50")
  .text("Fee Payment Receipt", { align: "center" });
doc.moveDown(0.5);
doc
  .fontSize(12)
  .font("Helvetica")
  .fillColor("black")
  .text("Thank you for your payment!", { align: "center" });
doc.moveDown(1.5);

// Section: Student Details
doc
  .fontSize(16)
  .font("Helvetica-Bold")
  .fillColor("#1E90FF")
  .text("Student Details:", { underline: true });
doc.moveDown(0.5);
doc
  .fontSize(12)
  .font("Helvetica")
  .fillColor("black")
  .text(`Student Name: ${payment.student_name}`, { align: "left" });
  doc.moveDown(0.5);
doc.text(`FCC ID: ${payment.fcc_id}`, { align: "left" });
doc.moveDown(1);

// Section: Payment Details
doc
  .fontSize(16)
  .font("Helvetica-Bold")
  .fillColor("#1E90FF")
  .text("Payment Details:", { underline: true });
doc.moveDown(0.5);
doc
  .fontSize(12)
  .font("Helvetica")
  .fillColor("black")
  .text(`Base Amount: ${numericAmount.toFixed(2)}`, { align: "left" });
  doc.moveDown(0.5);
doc.text(`PG Tax + Online Services (5%+13%): ${taxAmount.toFixed(2)}`, { align: "left" });
doc.moveDown(0.5);
// Add Separator Line
doc.lineWidth(1).moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke("#E0E0E0");
doc.moveDown(0.5);

doc.text(`Total Amount: ${grandTotal.toFixed(2)}`, { align: "left" });
doc.moveDown(0.5);
// Add Separator Line
doc.lineWidth(1).moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke("#E0E0E0");
doc.moveDown(1);

doc.text(`Payment Method: ${payment.payment_method}`, { align: "left" });
doc.moveDown(0.5);
doc.text(`Payment Status: ${payment.payment_status}`, { align: "left" });
doc.moveDown(0.5);
doc.text(`Monthly Cycle Days: ${payment.monthly_cycle_days.join(", ")}`, { align: "left" });
doc.moveDown(0.5);
doc.text(`Payment Date: ${new Date(payment.payment_date).toLocaleString()}`, { align: "left" });
doc.moveDown(0.5);
doc.text(`Payment Receipt Code: #${payment.id}`, { align: "left", fillColor: "#E0E0E0" });
doc.moveDown(0.5);

// Add Separator Line
doc.lineWidth(1).moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke("#E0E0E0");
doc.moveDown(1.5);

// QR Code Section
doc
  .fontSize(14)
  .font("Helvetica-Bold")
  .fillColor("#1E90FF")
  .text( `QR code ko scan karke ${payment.student_name}, ke pdhai bare me sabkuchh jane`, { align: "center" });
doc.moveDown(0.5);

const qrPath = path.join(receiptDir, `qr_${payment.id}.png`);
await QRCode.toFile(qrPath, `https://fccthegurukul.in/student/${payment.fcc_id}`);

// Center the QR Code
const qrWidth = 100; // Width of the QR code
const centerX = (doc.page.width - qrWidth) / 2; // Calculate X position for centering
doc.image(qrPath, centerX, doc.y, { width: qrWidth }); // Use calculated centerX and current Y position

doc.moveDown(1); // Move down after QR code


doc.moveDown(5);
// Footer Section
doc.lineWidth(0.5).moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke("#E0E0E0");

doc.moveDown(1);
doc
  .fontSize(10)
  .font("Helvetica")
  .fillColor("gray")
  .text("This receipt is system-generated and does not require a signature.", { align: "center" });

doc
  .fontSize(10)
  .font("Helvetica")
  .fillColor("gray")
  .text("FCC The Gurukul © 2025. All rights reserved | www.fccthegurukul.in", { align: "center" });

  // Add Footer Image
const footerImgPath = "C:/Users/FCC The Gurukul/My Projects/fcc-home-webapp/src/assets/footerimg.png";
const footerImageHeight = 100;
const footerYPosition = doc.page.height - footerImageHeight - 20;

doc.image(footerImgPath, {
  fit: [doc.page.width - 100, footerImageHeight],
  align: "center",
  valign: "bottom",
  y: footerYPosition,
});

// Finalize the PDF
doc.end();

    // Insert receipt details into the 'receipts' table
    await pool.query(
      `INSERT INTO receipts (payment_id, student_name, fcc_id, base_amount, gst, grand_total, payment_method, payment_status, monthly_cycle_days, payment_date, receipt_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        payment.id,
        payment.student_name,
        payment.fcc_id,
        numericAmount,
        taxAmount,
        grandTotal,
        payment.payment_method,
        payment.payment_status,
        payment.monthly_cycle_days.join(", "),
        new Date(payment.payment_date),
        `receipts/receipt_${payment.id}.pdf`,
      ]
    );

    res.status(201).json({
      message: "Payment added successfully",
      receipt: `receipts/receipt_${payment.id}.pdf`,
    });
  } catch (err) {
    console.error("Error inserting payment:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/payments", async (req, res) => {
  try {
    const { fcc_id, payment_status, payment_method, startDate, endDate, monthly_cycle_days } = req.query;
    let query = `SELECT * FROM payments`;
    const conditions = [];
    const params = [];

    if (fcc_id) {
      conditions.push(`fcc_id = $${params.length + 1}`);
      params.push(fcc_id);
    }

    if (payment_status) {
      conditions.push(`payment_status = $${params.length + 1}`);
      params.push(payment_status);
    }

    if (payment_method) {
      conditions.push(`payment_method = $${params.length + 1}`);
      params.push(payment_method);
    }

    if (startDate) {
      conditions.push(`payment_date >= $${params.length + 1}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`payment_date <= $${params.length + 1}`);
      params.push(endDate);
    }

    if (monthly_cycle_days) {
      const cycleDaysArray = monthly_cycle_days.split(',').map(day => parseInt(day.trim(), 10));
      conditions.push(`monthly_cycle_days && $${params.length + 1}::int[]`);
      params.push(cycleDaysArray);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += " ORDER BY payment_date DESC";

    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching payments:", err);
    res.status(500).json({ error: err.message });
  }
});


const studentPhotos = {
  "4949200024": "https://firebasestorage.googleapis.com/v0/b/sarkari-result-23f65.appspot.com/o/profile_images%2FIMG_20241112_150831_462.jpg?alt=media&token=e75bd57c-f944-4061-94e7-381b15a519f1",
  "9631200024": "https://firebasestorage.googleapis.com/v0/b/sarkari-result-23f65.appspot.com/o/profile_images%2FZRIUJKZxEGfNRtkwTy2DfkWAL4s2?alt=media&token=9cd5e3fe-130e-4623-9299-7b5c88f9d519",
  "1234567890": "https://firebasestorage.googleapis.com/v0/b/sarkari-result-23f65.appspot.com/o/profile_images%2Fprofile-pic.png?alt=media&token=fe4c6d0c-73a5-44ed-8d4f-f8ac9b18dab7",
  "9708200025": "https://posterjack.ca/cdn/shop/articles/Tips_for_Taking_Photos_at_the_Beach_55dd7d25-11df-4acf-844f-a5b4ebeff4df.jpg?v=1738158629&width=2048"
};


// Route to fetch CTC/CTG data and logs by FCC ID
app.get("/get-ctc-ctg/:fcc_id", async (req, res) => {
  const { fcc_id } = req.params;
  try {
    // Query to fetch student data
    const studentQuery = `
      SELECT fcc_id, ctc_time, ctg_time, task_completed
      FROM students
      WHERE fcc_id = $1;
    `;

    // Query to fetch logs
    const logsQuery = `
      SELECT fcc_id, ctc_time, ctg_time, task_completed, log_date
      FROM attendance_log
      WHERE fcc_id = $1
      ORDER BY log_date DESC; -- Sort logs by most recent date
    `;

    // Execute queries
    const studentResult = await pool.query(studentQuery, [fcc_id]);
    const logsResult = await pool.query(logsQuery, [fcc_id]);

    // Check if student exists
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Return student and log data
    res.json({
      student: studentResult.rows[0], // Single student entry
      logs: logsResult.rows,          // Array of log entries
    });
  } catch (error) {
    console.error("Error fetching CTC/CTG data and logs:", error);
    res.status(500).json({ error: "Failed to fetch CTC/CTG data and logs" });
  }
});


// API एंडपॉइंट टॉपिक के आधार पर क्विज़ प्रश्न प्राप्त करने के लिए
app.get('/get-quiz-by-topic/:skillTopic', async (req, res) => {
  const { skillTopic } = req.params;
  try {
      const query = 'SELECT * FROM quizzes WHERE skill_topic = $1';
      const values = [skillTopic];
      const result = await pool.query(query, values);
      res.json(result.rows); // प्रश्नों को JSON प्रतिक्रिया के रूप में भेजें
  } catch (error) {
      console.error('क्विज़ प्रश्न प्राप्त करने में त्रुटि:', error);
      res.status(500).json({ error: 'क्विज़ प्रश्न प्राप्त करने में विफल' });
  }
});

// नया API एंडपॉइंट क्विज़ सेशन शुरू करने के लिए
app.post('/start-quiz-session', async (req, res) => {
  const { fccId, skillTopic, totalQuestions } = req.body;

  try {
      const query = 'INSERT INTO quiz_sessions (fcc_id, skill_topic, total_questions, score) VALUES ($1, $2, $3, $4) RETURNING session_id, start_time';
      const values = [fccId, skillTopic, totalQuestions, 0]; // Added score: 0 to the values and query
      const result = await pool.query(query, values);

      const session = result.rows[0];
      res.json({ sessionId: session.session_id, startTime: session.start_time });
  } catch (error) {
      console.error('क्विज़ सेशन शुरू करने में त्रुटि:', error);
      res.status(500).json({ error: 'क्विज़ सेशन शुरू करने में विफल' });
  }
});

// अपडेट किया गया API एंडपॉइंट क्विज़ प्रयास सबमिट करने के लिए
app.post('/submit-quiz-attempt', async (req, res) => {
  const { sessionId, fccId, skillTopic, quizAnswers } = req.body; // अब sessionId प्राप्त करें // fccId is available here
  let score = 0;

  try {
      for (const qa of quizAnswers) {
          const { question_id, user_answer } = qa;

          // प्रश्न ID से सही उत्तर प्राप्त करें
          const questionQuery = 'SELECT correct_answer FROM quizzes WHERE quiz_id = $1';
          const questionValues = [question_id];
          try {
              const questionResult = await pool.query(questionQuery, questionValues);

              if (questionResult.rows.length > 0) {
                  const correctAnswer = questionResult.rows[0].correct_answer;
                  const isCorrect = user_answer === correctAnswer;

                  // यदि उत्तर सही है तो स्कोर बढ़ाएँ
                  if (isCorrect) {
                      score++;
                  }

                  // प्रयास डेटा डेटाबेस में स्टोर करें, अब session_id डालें, **include fccId here**
                  const attemptQuery = 'INSERT INTO quiz_attempts (session_id, question_id, user_answer, is_correct, fcc_id) VALUES ($1, $2, $3, $4, $5)'; // Added fcc_id to columns
                  const attemptValues = [sessionId, question_id, user_answer, isCorrect, fccId]; // Added fccId to values
                  try {
                      await pool.query(attemptQuery, attemptValues);
                  } catch (attemptError) {
                      console.error('प्रयास डेटा डालने में त्रुटि:', attemptError);
                      console.error('प्रयास डेटा डालने में त्रुटि - क्वेरी:', attemptQuery, attemptValues);
                      throw attemptError;
                  }
              } else {
                  console.warn(`प्रश्न ID ${question_id} नहीं मिला`);
              }
          } catch (questionError) {
              console.error('सही उत्तर प्राप्त करने में त्रुटि:', questionError);
              console.error('सही उत्तर प्राप्त करने में त्रुटि - क्वेरी:', questionQuery, questionValues);
              throw questionError;
          }
      }

      // क्विज़ सेशन रिकॉर्ड अपडेट करें session score, end_time, और duration के साथ
      const updateSessionQuery = 'UPDATE quiz_sessions SET score = $1, end_time = NOW(), duration = end_time - start_time WHERE session_id = $2 RETURNING end_time, duration';
      const updateSessionValues = [score, sessionId];
      try {
          const updateSessionResult = await pool.query(updateSessionQuery, updateSessionValues);
          const sessionUpdate = updateSessionResult.rows[0];
          res.json({ score: score, endTime: sessionUpdate.end_time, duration: sessionUpdate.duration, message: 'क्विज़ सबमिट हो गया!' });
      } catch (updateSessionError) {
          console.error('क्विज़ सेशन अपडेट करने में त्रुटि:', updateSessionError);
          console.error('क्विज़ सेशन अपडेट करने में त्रुटि - क्वेरी:', updateSessionQuery, updateSessionValues);
          throw updateSessionError;
      }

  } catch (error) {
      console.error('क्विज़ प्रयास सबमिट करने में त्रुटि:', error);
      res.status(500).json({ error: 'क्विज़ सबमिट करने में विफल' });
  }
});


// Endpoint to get all classes
app.get('/get-classes', async (req, res) => {
  try {
      // Query to fetch distinct class names from Leaderboard_Scoring_Task table
      const classesResult = await pool.query(
          `SELECT DISTINCT class FROM Leaderboard_Scoring_Task WHERE class IS NOT NULL AND class != '' ORDER BY class`
      );

      // Extract class names from the result rows
      const classNames = classesResult.rows.map(row => row.class);

      res.json({ classes: classNames }); // Send the class names as JSON response
  } catch (error) {
      console.error('Error fetching classes:', error);
      res.status(500).json({ error: 'Server error fetching classes' });
  }
});


// Endpoint to fetch personalized leaderboard data for a student (MODIFIED to fetch fcc_class from Leaderboard)
// Endpoint to fetch personalized leaderboard data for a student (MODIFIED to fetch fcc_class from Leaderboard AND include start_time and end_time for tasks)
app.get('/leaderboard/:fccId', async (req, res) => {
  const { fccId } = req.params;
  const { leaderboardClassFilter } = req.query; // Get class filter from query params

  try {
      // 1. Fetch student profile to get fcc_class (Optional - keep for consistency or fallback)
      const studentProfileResponse = await fetch(`http://localhost:${port}/get-student-profile/${fccId}`);
      if (!studentProfileResponse.ok) {
          console.error('Error fetching student profile:', studentProfileResponse.statusText);
          return res.status(500).json({ error: 'Student profile fetch failed' });
      }
      const studentProfileData = await studentProfileResponse.json();
      const studentClass = studentProfileData?.fcc_class; // Get numerical fcc_class from student profile

      if (!studentClass) {
          console.error('Student class not found for FCC ID:', fccId);
          return res.status(400).json({ error: 'Student class not found' });
      }

      // 2. Get leaderboard data for all students (or top N) -  NOW FETCHING fcc_class from Leaderboard
      let leaderboardQuery = `SELECT * FROM Leaderboard`;
      let leaderboardParams = [];

      if (leaderboardClassFilter && leaderboardClassFilter !== 'ALL') {
          leaderboardQuery += ` WHERE fcc_class = $1`;
          leaderboardParams = [leaderboardClassFilter];
      }

      leaderboardQuery += ` ORDER BY total_score DESC LIMIT 100`; // Always apply limit

      const leaderboardResult = await pool.query(leaderboardQuery, leaderboardParams);

      // 3. Get personalized scoring tasks and task history for the given FCC ID (MODIFIED QUERY TO INCLUDE start_time and end_time)
      const tasksResult = await pool.query(
          `SELECT st.task_id, st.task_name, st.description, st.max_score, st.start_time, st.end_time, /* ADDED start_time, end_time */
                  COALESCE(stl.score_earned, 0) as score_earned, stl.status, stl.completed_at
             FROM Leaderboard_Scoring_Task st
             LEFT JOIN Scoring_Task_Log stl
                ON st.task_id = stl.task_id AND stl.student_fcc_id = $1
             WHERE st.class = $2::VARCHAR  -- Filter tasks by student's class
             ORDER BY st.task_id`,
          [fccId, studentClass] // Pass studentClass for task filtering
      );

      // 4. Optionally, fetch student's leaderboard record (as before)
      const studentRecord = await pool.query(
          `SELECT * FROM Leaderboard WHERE student_fcc_id = $1`,
          [fccId]
      );

      res.json({
          leaderboard: leaderboardResult.rows,
          tasks: tasksResult.rows,
          student: studentRecord.rows[0] || null,
      });
  } catch (err) {
      console.error('Error fetching leaderboard data:', err);
      res.status(500).json({ error: 'Server error fetching leaderboard data' });
  }
});

// Endpoint to mark a task as completed and update the score
app.post('/complete-task', async (req, res) => {
  const { fccId, taskId, scoreEarned } = req.body;
  try {
    // 1. Insert a record in Scoring_Task_Log
    const insertResult = await pool.query(
      `INSERT INTO Scoring_Task_Log (student_fcc_id, task_id, score_earned, status, completed_at)
       VALUES ($1, $2, $3, 'COMPLETED', NOW())
       RETURNING *`,
      [fccId, taskId, scoreEarned]
    );

    // 2. Update the student's total score in Leaderboard table (Add the new score)
    const updateResult = await pool.query(
      `UPDATE Leaderboard
       SET total_score = total_score + $1, last_updated = NOW()
       WHERE student_fcc_id = $2
       RETURNING *`,
      [scoreEarned, fccId]
    );

    // 3. Log the update in Leaderboard_Log
    await pool.query(
      `INSERT INTO Leaderboard_Log (leaderboard_id, action, description)
       VALUES ($1, 'UPDATE', 'Score updated by task completion')`,
      [updateResult.rows[0].id]
    );

    res.json({
      message: 'Task completed and score updated successfully',
      taskLog: insertResult.rows[0],
      updatedLeaderboard: updateResult.rows[0],
    });
  } catch (err) {
    console.error('Error completing task:', err);
    res.status(500).json({ error: 'Server error while completing task' });
  }
});

// भाषा पहचान के लिए एक साधारण फ़ंक्शन
const detectLanguage = (text) => {
  const hindiRegex = /[\u0900-\u097F]/; // देवनागरी स्क्रिप्ट रेंज
  const hasHindi = hindiRegex.test(text);
  const hasEnglish = /[a-zA-Z]/.test(text);

  if (hasHindi && hasEnglish) {
    // मिश्रित भाषा: हिंदी को प्राथमिकता दें
    return 'hindi';
  } else if (hasHindi) {
    return 'hindi';
  } else {
    return 'english';
  }
};

// प्रॉम्प्ट टेम्पलेट
// const generatePrompt = (messages, detectedLanguage) => {
//   const latestMessage = messages[messages.length - 1].content;
//   const historyText = messages.slice(0, -1).map(msg => `${msg.role}: ${msg.content}`).join('\n');

//   const prompt = `
//     You are a friendly and helpful AI assistant designed to assist users in their preferred language.
//     Follow these rules to respond accurately:
//     1. Detect the user's primary language based on their input:
//        - If the message contains Hindi characters (Devanagari script), assume Hindi is the primary language and respond fully in Hindi.
//        - If the message mixes Hindi and English but includes Hindi words or phrases, assume the user prefers Hindi (they may not be fluent in English) and respond in Hindi.
//        - If the message is entirely in English, respond in English.
//     2. Keep your tone natural, concise, and conversational, matching the user's style.
//     3. Use the conversation history to provide context-aware responses.
//     4. If unsure about the language preference, default to Hindi if Hindi characters are present, otherwise English.

//     Conversation history:
//     ${historyText ? historyText + '\n' : 'No prior history.\n'}
//     Current message from user: "${latestMessage}"
//     Detected language hint: ${detectedLanguage} (use this as a starting point, but adjust based on the rules above)
    
//     Now, respond to the user's current message in their preferred language.
//   `;
//   return prompt;
// };

const generatePrompt = (messages, detectedLanguage) => {
  const latestMessage = messages[messages.length - 1].content;
  const historyText = messages.slice(0, -1).map(msg => `${msg.role}: ${msg.content}`).join('\n');

  const prompt = `
    You are a smart, proactive, and user-friendly AI assistant designed to assist in the user's preferred language. Your goal is to provide a helpful and complete response in every situation, minimizing follow-up questions unless absolutely necessary. Follow these rules:

    1. **Language Detection**:
       - If the message contains Hindi characters (Devanagari script), assume Hindi is the primary language and respond fully in Hindi.
       - If the message mixes Hindi and English but includes Hindi words or phrases, assume the user prefers Hindi (they may not be fluent in English) and respond in Hindi.
       - If the message is entirely in English, respond in English.
       - If unsure, default to Hindi if Hindi characters are present, otherwise English.

    2. **Smart and Proactive Response**:
       - Always provide a complete and useful answer based on the user's input and conversation history, even if the request is vague or incomplete.
       - If the request is broad (e.g., "top 10 math formulas"), assume a reasonable context (e.g., common formulas for a general level like 10th grade) and provide a list or answer immediately. Only ask for clarification if the context is truly unclear or contradictory.
       - Avoid repeatedly asking for more details unless the request is impossible to interpret without them. Instead, make an educated guess and offer additional options if needed.
       - Use history to infer intent and avoid redundant questions.

    3. **Tone and Style**:
       - Keep your tone natural, friendly, and concise.
       - Match the user's communication style (e.g., casual or formal).
       - Provide answers that are practical and directly usable.

    Conversation history:
    ${historyText ? historyText + '\n' : 'No prior history.\n'}
    Current message from user: "${latestMessage}"
    Detected language hint: ${detectedLanguage} (use this as a starting point, but adjust based on the rules above)

    Now, respond to the user's current message in their preferred language. Provide a complete and helpful answer based on their input and history, assuming reasonable context if details are missing.
  `;
  return prompt;
};


// app.post('/api/chat', async (req, res) => {
//   const { message: userMessage, model: selectedModel, history = [] } = req.body;

//   if (!userMessage) {
//     return res.status(400).json({ error: 'Message is required' });
//   }

//   try {
//     let responseText = "";

//     const messages = [
//       ...history.map(msg => ({
//         role: msg.sender === 'user' ? 'user' : 'assistant',
//         content: msg.text
//       })),
//       { role: 'user', content: userMessage }
//     ];

//     const detectedLanguage = detectLanguage(userMessage);

//     if (selectedModel === 'deepseek') {
//       const openRouterApiKey = process.env.OPENROUTER_API_KEY;
//       if (!openRouterApiKey) {
//         return res.status(500).json({ error: 'DeepSeek API key is missing' });
//       }

//       const deepseekResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${openRouterApiKey}`,
//           'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({
//           model: 'deepseek/deepseek-r1:free',
//           messages: [
//             { role: 'system', content: generatePrompt(messages, detectedLanguage) },
//             ...messages
//           ]
//         })
//       });

//       if (!deepseekResponse.ok) {
//         const errorDetails = await deepseekResponse.json();
//         throw new Error(`DeepSeek API request failed: ${errorDetails.error?.message}`);
//       }

//       const deepseekData = await deepseekResponse.json();
//       responseText = deepseekData.choices[0].message.content;

//     } else if (selectedModel === 'gemini-pro' || !selectedModel) {
//       const prompt = generatePrompt(messages, detectedLanguage);
//       const geminiResult = await geminiProModel.generateContent(prompt);
//       responseText = geminiResult.response.text();

//     } else if (selectedModel === 'gemini-flash') {
//       const prompt = generatePrompt(messages, detectedLanguage);
//       const geminiResult = await geminiFlashModel.generateContent(prompt);
//       responseText = geminiResult.response.text();

//     } else {
//       return res.status(400).json({ error: 'Invalid model selected' });
//     }

//     res.json({
//       response: responseText,
//       language: detectedLanguage,
//       timestamp: new Date().toISOString()
//     });

//   } catch (error) {
//     console.error('API error:', error);
//     res.status(500).json({ error: 'Failed to get response from AI model', details: error.message });
//   }
// });

app.post('/api/chat', async (req, res) => {
  const userMessage = req.body.message;
  const selectedModel = req.body.model;
  const clientIp = req.ip; // User ka IP address get karein
  const secretInfo = uuidv4(); // Generate unique UUID for each chat

  if (!userMessage) {
      return res.status(400).json({ error: 'Message is required' });
  }

  try {
      let responseText = "";
      if (selectedModel === 'deepseek') {
          // DeepSeek via OpenRouter
          const openRouterApiKey = process.env.OPENROUTER_API_KEY;
          if (!openRouterApiKey) {
              return res.status(500).json({ error: 'DeepSeek API key is missing in environment variables' });
          }
          const deepseekResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                  "Authorization": `Bearer ${openRouterApiKey}`,
                  "Content-Type": "application/json"
              },
              body: JSON.stringify({
                  "model": "deepseek/deepseek-r1:free",
                  "messages": [
                      {
                          "role": "user",
                          "content": userMessage
                      }
                  ]
              })
          });

          if (!deepseekResponse.ok) {
              const errorDetails = await deepseekResponse.json();
              console.error("OpenRouter/DeepSeek API error:", errorDetails);
              throw new Error(`DeepSeek API request failed with status ${deepseekResponse.status}: ${errorDetails.error ? errorDetails.error.message : deepseekResponse.statusText}`);
          }

          const deepseekData = await deepseekResponse.json();
          if (deepseekData && deepseekData.choices && deepseekData.choices.length > 0) { // Check response data
              responseText = deepseekData.choices[0].message.content;
          } else {
              responseText = "DeepSeek API से response prapt nahi hui";
          }


      } else if (selectedModel === 'mistral') {
          // Mistral via OpenRouter
          const openRouterApiKey = process.env.OPENROUTER_API_KEY;
          if (!openRouterApiKey) {
              return res.status(500).json({ error: 'OpenRouter API key is missing in environment variables' });
          }
          const mistralResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                  "Authorization": `Bearer ${openRouterApiKey}`,
                  "Content-Type": "application/json"
              },
              body: JSON.stringify({
                  "model": "mistralai/mistral-medium",
                  "messages": [
                      {
                          "role": "user",
                          "content": userMessage
                      }
                  ]
              })
          });

          if (!mistralResponse.ok) {
              const errorDetails = await mistralResponse.json();
              console.error("OpenRouter/Mistral API error:", errorDetails);
              throw new Error(`Mistral API request failed with status ${mistralResponse.status}: ${errorDetails.error ? errorDetails.error.message : mistralResponse.statusText}`);
          }

          const mistralData = await mistralResponse.json();
          if (mistralData && mistralData.choices && mistralData.choices.length > 0) {
              responseText = mistralData.choices[0].message.content;
          } else {
              responseText = "Mistral API से response prapt nahi hui";
          }

      } else if (selectedModel === 'nous-hermes') {
          // Nous Hermes via OpenRouter
          const openRouterApiKey = process.env.OPENROUTER_API_KEY;
          if (!openRouterApiKey) {
              return res.status(500).json({ error: 'OpenRouter API key is missing in environment variables' });
          }
          const nousHermesResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                  "Authorization": `Bearer ${openRouterApiKey}`,
                  "Content-Type": "application/json"
              },
              body: JSON.stringify({
                  "model": "NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO",
                  "messages": [
                      {
                          "role": "user",
                          "content": userMessage
                      }
                  ]
              })
          });

          if (!nousHermesResponse.ok) {
              const errorDetails = await nousHermesResponse.json();
              console.error("OpenRouter/Nous Hermes API error:", errorDetails);
              throw new Error(`Nous Hermes API request failed with status ${nousHermesResponse.status}: ${errorDetails.error ? errorDetails.error.message : nousHermesResponse.statusText}`);
          }

          const nousHermesData = await nousHermesResponse.json();
          if (nousHermesData && nousHermesData.choices && nousHermesData.choices.length > 0) {
              responseText = nousHermesData.choices[0].message.content;
          } else {
              responseText = "Nous Hermes API से response prapt nahi hui";
          }

      } else if (!selectedModel || selectedModel === 'gemini-flash') {
          // Google Gemini Flash (Default)
          const geminiResult = await geminiFlashModel.generateContent(userMessage);
          responseText = geminiResult.response.text();

      } else if (selectedModel === 'gemini-pro') {
          // Google Gemini Pro
          const geminiResult = await geminiProModel.generateContent(userMessage);
          responseText = geminiResult.response.text();

      } else {
          return res.status(400).json({ error: 'Invalid model selected' });
      }

      // Chat history database mein save karein
      try {
          const insertQuery = `
              INSERT INTO chat_history (user_name, ip_address, selected_model, user_message, bot_response, secret_info)
              VALUES ($1, $2, $3, $4, $5, $6)
              RETURNING id, timestamp, secret_info;
          `;
          const insertValues = ['default_user', clientIp, selectedModel, userMessage, responseText, secretInfo];
          const chatHistoryResult = await pool.query(insertQuery, insertValues);
          console.log("Chat history saved:", chatHistoryResult.rows[0]);

           res.json({ response: responseText, chat_log_id: chatHistoryResult.rows[0].id, secretInfo: chatHistoryResult.rows[0].secret_info });


      } catch (dbError) {
          console.error("Error saving chat history to database:", dbError);
          res.json({ response: responseText, db_error: 'Failed to save chat history' });
      }


  } catch (error) {
      console.error("API error:", error);
      res.status(500).json({ error: 'Failed to get response from AI model', details: error.message });
  }
});


// FCC ID के आधार पर अपडेटेड टेबल से फीस विवरण प्राप्त करने वाला API endpoint
app.get("/get-tuition-fee-details/:fcc_id", async (req, res) => {
  const { fcc_id } = req.params;
  try {
    const queryText = `
      SELECT total_fee,
             fee_paid,
             fee_remaining,
             due_date,
             offer_price,
             offer_valid_till,
             class
      FROM tuition_fee_details
      WHERE fcc_id = $1
    `;
    const { rows } = await pool.query(queryText, [fcc_id]);
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: "उस FCC ID के लिए कोई फीस विवरण नहीं मिला" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("फीस विवरण प्राप्त करने में त्रुटि:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ... आपके मौजूदा बैकएंड कोड ...

// एपीआई एंडपॉइंट क्लासेज की लिस्ट लाने के लिए
app.get('/api/classrooms', cors(), async (req, res) => {
  try {
      const query = `
          SELECT DISTINCT classroom_name
          FROM live_videos
          ORDER BY classroom_name;
      `;
      const { rows } = await pool.query(query);
      const classroomNames = rows.map(row => row.classroom_name);
      res.json(classroomNames);
  } catch (error) {
      console.error("Error fetching classroom names:", error);
      res.status(500).json({ error: 'Failed to fetch classroom names' });
  }
});


// एपीआई एंडपॉइंट लाइव वीडियो लाने के लिए, क्लासरूम फ़िल्टर के साथ
app.get('/api/videos', cors(), async (req, res) => {
  const classroomName = req.query.classroomName;
  try {
      // Local date string (YYYY-MM-DD) निकालने के लिए
      const today = new Date();
      const pad = (n) => (n < 10 ? '0' + n : n);
      const todayDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

      let query = `
        SELECT video_title, youtube_url, live_date
        FROM live_videos
        WHERE live_date <= $1
      `;
      const params = [todayDate];

      if (classroomName) {
          query += ` AND classroom_name = $2`;
          params.push(classroomName);
      }

      query += ` ORDER BY live_date DESC;`;

      const { rows } = await pool.query(query, params);

      // live_date को local date string में convert करने का helper function
      const formatDate = (date) => {
          const d = new Date(date);
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      };

      // अब compare करें local date strings से
      const todaysVideos = rows.filter(video => formatDate(video.live_date) === todayDate);
      const pastVideos = rows.filter(video => formatDate(video.live_date) < todayDate);

      res.json({
          todaysVideos,
          pastVideos,
      });
  } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

app.get('/api/attendance', cors(), async (req, res) => {
  const classroomName = req.query.classroomName;
  if (!classroomName) {
    return res.status(400).json({ error: 'classroomName parameter is required' });
  }
  
  const classNumber = classroomName.split(" ")[1];

  try {
    const query = `
      SELECT nsa.name, s.ctc_time, s.ctg_time, nsa.fcc_id  -- Added nsa.fcc_id
      FROM "New_Student_Admission" nsa
      LEFT JOIN students s ON nsa.fcc_id = s.fcc_id
      WHERE nsa.fcc_class = $1;
    `;
    const { rows } = await pool.query(query, [classNumber]);

    const today = new Date();
    const pad = (n) => (n < 10 ? '0' + n : n);
    const todayDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    const getDateString = (date) => {
      const d = new Date(date);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    const attendanceData = rows.map(row => {
      let status = "Absent";
      let duration = null;
      
      if (row.ctc_time) {
        const ctcTime = new Date(row.ctc_time);
        const ctcDate = getDateString(ctcTime);
        if (ctcDate === todayDate) {
          status = "Entered class";
          if (row.ctg_time) {
            const ctgTime = new Date(row.ctg_time);
            const ctgDate = getDateString(ctgTime);
            if (ctgDate === todayDate) {
              status = "Class attended";
              const diffMs = ctgTime - ctcTime;
              const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
              const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
              duration = `${diffHours} hrs ${diffMinutes} mins`;
            }
          }
        }
      }
      
      return {
        name: row.name,
        fcc_id: row.fcc_id,  // Added fcc_id
        status,
        duration
      };
    });

    res.json(attendanceData);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ error: "Failed to fetch attendance data" });
  }
});

// GET /api/tasks
app.get('/api/tasks', cors(), async (req, res) => {
  try {
    const { class: classNumber } = req.query;
    if (!classNumber) return res.status(400).json({ error: 'Class parameter required' });

    const query = `
      SELECT * FROM leaderboard_scoring_task
      WHERE class = $1
      ORDER BY start_time DESC
    `;
    const { rows } = await pool.query(query, [classNumber]);
    
    // Convert dates to local time
    const processedTasks = rows.map(task => ({
      ...task,
      start_time: new Date(task.start_time).toLocaleString(),
      end_time: new Date(task.end_time).toLocaleString()
    }));

    res.json(processedTasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.get('/api/students-by-class', cors(), async (req, res) => {
  const classroomName = req.query.classroomName;
  if (!classroomName) {
      return res.status(400).json({ error: 'classroomName parameter is required' });
  }
  const classNumber = classroomName.split(" ")[1]; // "Class 1" से '1' निकालना

  try {
      const query = `
          SELECT nsa.name, nsa.fcc_id
          FROM "New_Student_Admission" nsa
          WHERE nsa.fcc_class = $1;
      `;
      const { rows } = await pool.query(query, [classNumber]);
      res.json(rows);
  } catch (error) {
      console.error("Error fetching students by class:", error);
      res.status(500).json({ error: 'Failed to fetch students by class' });
  }
});
app.post('/api/tasks', cors(), express.json(), async (req, res) => {
  try {
      const { task_name, description, max_score, start_time, end_time, class: classNumber, teacher_fcc_id, action_type } = req.body;

      if (!task_name || !description || !max_score || !start_time || !end_time || !classNumber || !teacher_fcc_id || !action_type) {
          return res.status(400).json({ error: 'All fields are required...' });
      }

      // 1. Insert the task into leaderboard_scoring_task table (as before)
      const taskInsertQuery = `
          INSERT INTO leaderboard_scoring_task (task_name, description, max_score, start_time, end_time, class, teacher_fcc_id, action_type)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *;
      `;
      const taskInsertValues = [task_name, description, max_score, start_time, end_time, classNumber, teacher_fcc_id, action_type];
      const { rows: taskRows } = await pool.query(taskInsertQuery, taskInsertValues);
      const newTask = taskRows[0];

      // 2. Log the task creation action in teacher_update_logs
      const logQuery = `
          INSERT INTO teacher_update_logs (teacher_fcc_id, action_type, submission_timestamp, classroom_name, number_of_students_submitted)
          VALUES ($1, $2, NOW(), $3, $4)
          RETURNING *;
      `;
      const logValues = [
          teacher_fcc_id,
          'Task Create', // Action Type is "Task Create"
          `Class ${classNumber}`, // Or use your actual classroom name if available
          0 // Number of students submitted is 0 for task creation (not applicable)
      ];
      const logResult = await pool.query(logQuery, logValues);
      console.log("📝 Task creation logged:", logResult.rows[0]);


      res.status(201).json({ message: 'Task created and logged successfully', task: newTask });

  } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ error: 'Failed to create task', details: error.message });
  }
});

// ... other backend code ...
app.post('/api/submit-scores', cors(), express.json(), async (req, res) => {
  console.log("📦 Incoming request to /api/submit-scores");
  console.log("Request body:", req.body);

  try {
      const { submissions, teacher_fcc_id, classroom_name, num_students_submitted } = req.body;

      if (!submissions || submissions.length === 0) {
          console.warn("⚠️ No submissions data provided in the request body.");
          return res.status(400).json({ error: 'No submissions data provided.' });
      }

      if (!teacher_fcc_id) {
          console.warn("⚠️ Teacher FCC ID is missing in the request.");
          return res.status(400).json({ error: 'Teacher FCC ID is required for submission.' });
      }


      for (const submission of submissions) {
          const { fcc_id, fcc_class, task_name, score_obtained } = submission;

          if (!fcc_id || !fcc_class || !task_name || score_obtained === undefined) {
              console.warn("⚠️ Incomplete submission data, skipping:", submission);
              continue;
          }

          const score = parseInt(score_obtained, 10);

          if (isNaN(score)) {
              console.warn(`⚠️ Invalid score provided for fcc_id: ${fcc_id}, task: ${task_name}. Skipping submission.`);
              continue;
          }

          // task_submissions Table insert
          const submissionQuery = `
              INSERT INTO task_submissions (fcc_id, fcc_class, task_name, score_obtained)
              VALUES ($1, $2, $3, $4)
              RETURNING *;
          `;
          const submissionValues = [fcc_id, fcc_class, task_name, score];

          // leaderboard Table insert
          const leaderboardQuery = `
              INSERT INTO leaderboard (fcc_id, fcc_class, task_name, score)
              VALUES ($1, $2, $3, $4)
              RETURNING *;
          `;
          const leaderboardValues = [fcc_id, fcc_class, task_name, score];

          try {
              console.log(`🚀 Inserting submission for fcc_id: ${fcc_id}, task: ${task_name}, score: ${score}`);
              await pool.query(submissionQuery, submissionValues);
              await pool.query(leaderboardQuery, leaderboardValues);
              console.log(`✅ Successfully inserted scores for fcc_id: ${fcc_id}, task: ${task_name}`);

          } catch (dbError) {
              console.error("🚨 Database insertion error for submission:", submission, dbError);
              return res.status(500).json({ error: 'Failed to submit scores due to database error.', details: dbError.message });
          }
      }

      // Log teacher action after successful score submissions
      try {
          const logQuery = `
              INSERT INTO teacher_update_logs (teacher_fcc_id, classroom_name, number_of_students_submitted, action_type)
              VALUES ($1, $2, $3, $4)
              RETURNING *;
          `;
          const logValues = [teacher_fcc_id, classroom_name, num_students_submitted, 'Task Check']; // Added action_type: 'Task Check'
          const logResult = await pool.query(logQuery, logValues);
          console.log("📝 Teacher update log recorded:", logResult.rows[0]);
      } catch (logError) {
          console.error("🚨 Error logging teacher action:", logError);
          // Log error, but don't fail the score submission entirely. Logging error is secondary.
      }


      res.status(201).json({ message: 'Scores submitted successfully and leaderboard updated.' });

  } catch (error) {
      console.error('🔥 Error submitting scores:', error);
      res.status(500).json({ error: 'Failed to submit scores', details: error.message });
  }
});

app.get('/api/leaderboard-data', cors(), async (req, res) => {
  console.log("📦 Incoming request to /api/leaderboard-data");
  console.log("Query Parameters:", req.query);

  try {
      const taskNameFilter = req.query.taskName;
      const classFilter = req.query.class; // नया क्लास फ़िल्टर
      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      let query = `
          SELECT
              nsa.name AS student_name,
              l.fcc_id,
              nsa.fcc_class,
              SUM(l.score) AS total_score
          FROM leaderboard l
          JOIN "New_Student_Admission" nsa ON l.fcc_id = nsa.fcc_id
          WHERE l.submission_date >= $1 AND l.submission_date <= $2
      `;
      const params = [startOfMonth, endOfMonth];
      let paramIndex = 3;

      if (taskNameFilter) {
          query += ` AND l.task_name = $${paramIndex}`;
          params.push(taskNameFilter);
          paramIndex++;
      }
      if (classFilter) { // क्लास फ़िल्टर जोड़ने की शर्त
          query += ` AND nsa.fcc_class = $${paramIndex}`;
          params.push(classFilter);
          paramIndex++;
      }

      query += `
          GROUP BY nsa.name, l.fcc_id, nsa.fcc_class
          ORDER BY total_score DESC;
      `;

      console.log("🚀 Executing SQL Query:", query);
      console.log("Query Parameters:", params);

      const { rows } = await pool.query(query, params);

      console.log("📊 Leaderboard Data Fetched:", rows);

      // Add profile images to leaderboard data
      const leaderboardDataWithImages = rows.map(student => {
          return {
              ...student,
              profile_image: studentPhotos[student.fcc_id] || null // Use studentPhotos to get image URL, default to null if not found
          };
      });

      console.log("📊 Leaderboard Data Fetched with Images:", leaderboardDataWithImages);

      res.json(leaderboardDataWithImages);

  } catch (error) {
      console.error("🚨 Error fetching leaderboard data:", error);
      res.status(500).json({ error: 'Failed to fetch leaderboard data', details: error.message, stack: error.stack });
  }
});

app.get('/api/leaderboard-task-names', cors(), async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT task_name
            FROM leaderboard
            ORDER BY task_name;
        `;
        const { rows } = await pool.query(query);
        const taskNames = rows.map(row => row.task_name);
        res.json(taskNames);
    } catch (error) {
        console.error("Error fetching task names:", error);
        res.status(500).json({ error: 'Failed to fetch task names' });
    }
});

// API endpoint to get unique class names from "New_Student_Admission" table for filter
app.get('/api/leaderboard-class-names', cors(), async (req, res) => {
  try {
      const query = `
          SELECT DISTINCT fcc_class
          FROM "New_Student_Admission"
          ORDER BY fcc_class;
      `;
      const { rows } = await pool.query(query);
      const classNames = rows.map(row => row.fcc_class);
      res.json(classNames);
  } catch (error) {
      console.error("Error fetching class names:", error);
      res.status(500).json({ error: 'Failed to fetch class names' });
  }
});


// API endpoint to get unique task names from leaderboard table for filter
app.get('/api/leaderboard-task-names', cors(), async (req, res) => {
  try {
      const query = `
          SELECT DISTINCT task_name
          FROM leaderboard
          ORDER BY task_name;
      `;
      const { rows } = await pool.query(query);
      const taskNames = rows.map(row => row.task_name);
      res.json(taskNames);
  } catch (error) {
      console.error("Error fetching task names:", error);
      res.status(500).json({ error: 'Failed to fetch task names' });
  }
});

/// server.js (updated APIs for student admission table filtering)

// Updated API endpoint to get total admissions (filtered by students table)
app.get('/api/total-admissions', cors(), async (req, res) => {
  try {
      const query = `
          SELECT COUNT(DISTINCT nsa.fcc_id)
          FROM "New_Student_Admission" nsa
          WHERE EXISTS (SELECT 1 FROM students s WHERE s.fcc_id = nsa.fcc_id);
      `;
      const result = await pool.query(query);
      const totalAdmissions = parseInt(result.rows[0].count, 10);
      res.json({ totalAdmissions });
  } catch (error) {
      console.error("Error fetching total admissions:", error);
      res.status(500).json({ error: 'Failed to fetch total admissions' });
  }
});

app.get('/api/attendance-overview', cors(), async (req, res) => {
  try {
      const today = new Date();
      const pad = (n) => (n < 10 ? '0' + n : n);
      const todayDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

      const query = `
          WITH ValidStudentFCCIDs AS (
              SELECT nsa.fcc_id
              FROM "New_Student_Admission" nsa
              WHERE EXISTS (SELECT 1 FROM students s WHERE s.fcc_id = nsa.fcc_id)
          ),
          LatestStudentData AS (
              SELECT
                  s.fcc_id,
                  s.ctc_time,
                  s.ctg_time,
                  s.task_completed,
                  ROW_NUMBER() OVER(PARTITION BY s.fcc_id ORDER BY s.ctc_time DESC NULLS LAST) as rn
              FROM students s
              WHERE EXISTS (SELECT 1 FROM ValidStudentFCCIDs vsf WHERE vsf.fcc_id = s.fcc_id)
          ),
          AttendanceSummary AS (
              SELECT
                  SUM(CASE WHEN DATE(lsd.ctc_time) = $1::date THEN 1 ELSE 0 END) as present_count,
                  SUM(CASE WHEN DATE(lsd.ctc_time) != $1::date OR lsd.ctc_time IS NULL THEN 1 ELSE 0 END) as absent_count
              FROM LatestStudentData lsd
              WHERE lsd.rn = 1
          ),
          PresentStudentsDetails AS (
              SELECT JSON_AGG(row_to_json(ps))
              FROM (
                  SELECT nsa.fcc_id, nsa.name, nsa.father, nsa.mother, nsa.mobile_number, nsa.address, 
                         lsd.ctc_time, lsd.ctg_time, lsd.task_completed, nsa.admission_date
                  FROM LatestStudentData lsd
                  JOIN "New_Student_Admission" nsa ON lsd.fcc_id = nsa.fcc_id
                  WHERE DATE(lsd.ctc_time) = $1::date AND lsd.rn = 1
              ) as ps
          ),
          AbsentStudentsDetails AS (
              SELECT JSON_AGG(row_to_json(absent_s))
              FROM (
                  SELECT nsa.fcc_id, nsa.name, nsa.father, nsa.mother, nsa.mobile_number, nsa.address, 
                         lsd.ctc_time, lsd.ctg_time, lsd.task_completed, nsa.admission_date
                  FROM LatestStudentData lsd
                  JOIN "New_Student_Admission" nsa ON lsd.fcc_id = nsa.fcc_id
                  WHERE (DATE(lsd.ctc_time) != $1::date OR lsd.ctc_time IS NULL) AND lsd.rn = 1
              ) as absent_s
          )
          SELECT
              (SELECT present_count FROM AttendanceSummary) as presentStudents,
              (SELECT absent_count FROM AttendanceSummary) as absentStudents,
              COALESCE((SELECT json_agg FROM PresentStudentsDetails), '[]'::json) as presentStudentsDetails,
              COALESCE((SELECT json_agg FROM AbsentStudentsDetails), '[]'::json) as absentStudentsDetails
          ;
      `;
      const result = await pool.query(query, [todayDate]);

      res.json({
          presentStudents: parseInt(result.rows[0].presentstudents, 10) || 0,
          absentStudents: parseInt(result.rows[0].absentstudents, 10) || 0,
          presentStudentsDetails: result.rows[0].presentstudentsdetails || [],
          absentStudentsDetails: result.rows[0].absentstudentsdetails || [],
      });
  } catch (error) {
      console.error("Error fetching attendance overview:", error);
      res.status(500).json({ error: 'Failed to fetch attendance overview' });
  }
});

// Updated API endpoint for daily task completion report (filtered by admission table)
app.get('/api/daily-task-completion', cors(), async (req, res) => {
  try {
      // Today's date in YYYY-MM-DD format
      const today = new Date();
      const pad = (n) => (n < 10 ? '0' + n : n);
      const todayDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

      const query = `
          WITH ValidStudentFCCIDs AS (
              SELECT nsa.fcc_id
              FROM "New_Student_Admission" nsa
              WHERE EXISTS (SELECT 1 FROM students s WHERE s.fcc_id = nsa.fcc_id)
          ),
          LatestStudentData AS (
              SELECT
                  s.fcc_id,
                  s.ctc_time,
                  s.task_completed,
                  ROW_NUMBER() OVER(PARTITION BY s.fcc_id ORDER BY s.ctc_time DESC NULLS LAST) as rn
              FROM students s
              WHERE EXISTS (SELECT 1 FROM ValidStudentFCCIDs vsf WHERE vsf.fcc_id = s.fcc_id) -- Filter for valid FCC IDs
          ),
          DailyTaskSummary AS (
              SELECT
                  SUM(CASE WHEN lsd.task_completed = true AND DATE(lsd.ctc_time) = $1::date THEN 1 ELSE 0 END) as completed_tasks_today,
                  SUM(CASE WHEN lsd.task_completed = false AND DATE(lsd.ctc_time) = $1::date THEN 1 ELSE 0 END) as not_completed_tasks_today,
                  SUM(CASE WHEN lsd.task_completed = true AND DATE(lsd.ctc_time) < $1::date THEN 1 ELSE 0 END) as completed_tasks_before_today,
                  SUM(CASE WHEN lsd.task_completed = false AND DATE(lsd.ctc_time) < $1::date THEN 1 ELSE 0 END) as not_completed_tasks_before_today,
                  COUNT(DISTINCT lsd.fcc_id) as total_students_recorded
              FROM LatestStudentData lsd
              WHERE lsd.rn = 1
          )
          SELECT
              (SELECT completed_tasks_today FROM DailyTaskSummary) as completedTasksToday,
              (SELECT not_completed_tasks_today FROM DailyTaskSummary) as notCompletedTasksToday,
              (SELECT completed_tasks_before_today FROM DailyTaskSummary) as completedTasksBeforeToday,
              (SELECT not_completed_tasks_before_today FROM DailyTaskSummary) as notCompletedTasksBeforeToday,
              (SELECT total_students_recorded FROM DailyTaskSummary) as totalStudentsRecorded
          ;
      `;
      const result = await pool.query(query, [todayDate]);

      res.json({
          completedTasksToday: parseInt(result.rows[0].completedtaskstoday, 10) || 0,
          notCompletedTasksToday: parseInt(result.rows[0].notcompletedtaskstoday, 10) || 0,
          completedTasksBeforeToday: parseInt(result.rows[0].completedtasksbeforetoday, 10) || 0,
          notCompletedTasksBeforeToday: parseInt(result.rows[0].notcompletedtasksbeforetoday, 10) || 0,
          totalStudentsRecorded: parseInt(result.rows[0].totalstudentsrecorded, 10) || 0,
      });
  } catch (error) {
      console.error("Error fetching daily task completion report:", error);
      res.status(500).json({ error: 'Failed to fetch daily task completion report' });
  }
});

app.get('/api/admitted-students', cors(), async (req, res) => {
  try {
      const query = `
          SELECT nsa.fcc_id, nsa.name, nsa.father, nsa.mother, nsa.schooling_class, nsa.mobile_number, 
                 nsa.address, nsa.paid, nsa.tutionfee_paid, nsa.fcc_class, nsa.skills, nsa.admission_date
          FROM "New_Student_Admission" nsa
          WHERE EXISTS (SELECT 1 FROM students s WHERE s.fcc_id = nsa.fcc_id);
      `;
      const result = await pool.query(query);
      res.json(result.rows);
  } catch (error) {
      console.error("Error fetching admitted students:", error);
      res.status(500).json({ error: 'Failed to fetch admitted students' });
  }
});

// Serve Present Students Details at /fcchome-present-students
app.get('/fcchome-present-students', cors(), async (req, res) => {
  try {
      const today = new Date();
      const pad = (n) => (n < 10 ? '0' + n : n);
      const todayDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

      const query = `
          WITH ValidStudentFCCIDs AS (
              SELECT nsa.fcc_id
              FROM "New_Student_Admission" nsa
              WHERE EXISTS (SELECT 1 FROM students s WHERE s.fcc_id = nsa.fcc_id)
          ),
          LatestStudentData AS (
              SELECT
                  s.fcc_id,
                  s.ctc_time,
                  s.ctg_time,
                  s.task_completed,
                  ROW_NUMBER() OVER(PARTITION BY s.fcc_id ORDER BY s.ctc_time DESC NULLS LAST) as rn
              FROM students s
              WHERE EXISTS (SELECT 1 FROM ValidStudentFCCIDs vsf WHERE vsf.fcc_id = s.fcc_id)
          )
          SELECT nsa.fcc_id, nsa.name, nsa.father, nsa.mother, nsa.mobile_number, nsa.address, 
                 lsd.ctc_time, lsd.ctg_time, lsd.task_completed, nsa.admission_date
          FROM LatestStudentData lsd
          JOIN "New_Student_Admission" nsa ON lsd.fcc_id = nsa.fcc_id
          WHERE DATE(lsd.ctc_time) = $1::date AND lsd.rn = 1;
      `;
      const result = await pool.query(query, [todayDate]);
      const students = result.rows;

      const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
              <title>Present Students Details</title>
              <style>
                  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background-color: #eef2f7; }
                  h4 { color: #2c3e50; font-size: 1.8rem; text-align: center; }
                  table { width: 100%; border-collapse: collapse; margin-top: 20px; background-color: #fff; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); }
                  thead { background-color: #3498db; color: #fff; }
                  th, td { padding: 14px; text-align: left; border-bottom: 1px solid #e0e6ed; }
                  th { font-weight: 600; text-transform: uppercase; }
                  td { color: #34495e; }
                  tbody tr:nth-child(even) { background-color: #f1f5f9; }
                  tbody tr:hover { background-color: #dfe9f3; }
              </style>
          </head>
          <body>
              <h4>Present Students Details</h4>
              <table>
                  <thead>
                      <tr>
                          <th>FCC ID</th>
                          <th>Name</th>
                          <th>Father</th>
                          <th>Mother</th>
                          <th>Mobile Number</th>
                          <th>Address</th>
                          <th>CTC Time</th>
                          <th>CTG Time</th>
                          <th>Task Completed</th>
                          <th>Admission Date</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${students.map(student => `
                          <tr>
                              <td>${student.fcc_id}</td>
                              <td>${student.name}</td>
                              <td>${student.father || 'N/A'}</td>
                              <td>${student.mother || 'N/A'}</td>
                              <td>${student.mobile_number || 'N/A'}</td>
                              <td>${student.address || 'N/A'}</td>
                              <td>${student.ctc_time ? new Date(student.ctc_time).toLocaleTimeString() : 'N/A'}</td>
                              <td>${student.ctg_time ? new Date(student.ctg_time).toLocaleTimeString() : 'N/A'}</td>
                              <td>${student.task_completed ? 'Yes' : 'No'}</td>
                              <td>${student.admission_date ? new Date(student.admission_date).toLocaleDateString() : 'N/A'}</td>
                          </tr>
                      `).join('')}
                  </tbody>
              </table>
          </body>
          </html>
      `;
      res.send(htmlContent);
  } catch (error) {
      console.error("Error fetching present students:", error);
      res.status(500).send("Error fetching present students");
  }
});

// Serve Absent Students Details at /fcchome-absent-students

app.get('/fcchome-absent-students', cors(), async (req, res) => {
  try {
      const today = new Date();
      const pad = (n) => (n < 10 ? '0' + n : n);
      const todayDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

      const query = `
          WITH ValidStudentFCCIDs AS (
              SELECT nsa.fcc_id
              FROM "New_Student_Admission" nsa
              WHERE EXISTS (SELECT 1 FROM students s WHERE s.fcc_id = nsa.fcc_id)
          ),
          LatestStudentData AS (
              SELECT
                  s.fcc_id,
                  s.ctc_time,
                  s.ctg_time,
                  s.task_completed,
                  ROW_NUMBER() OVER(PARTITION BY s.fcc_id ORDER BY s.ctc_time DESC NULLS LAST) as rn
              FROM students s
              WHERE EXISTS (SELECT 1 FROM ValidStudentFCCIDs vsf WHERE vsf.fcc_id = s.fcc_id)
          )
          SELECT nsa.fcc_id, nsa.name, nsa.father, nsa.mother, nsa.mobile_number, nsa.address, 
                 lsd.ctc_time, lsd.ctg_time, lsd.task_completed, nsa.admission_date
          FROM LatestStudentData lsd
          JOIN "New_Student_Admission" nsa ON lsd.fcc_id = nsa.fcc_id
          WHERE (DATE(lsd.ctc_time) != $1::date OR lsd.ctc_time IS NULL) AND lsd.rn = 1;
      `;
      const result = await pool.query(query, [todayDate]);
      const students = result.rows;

      const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
              <title>Absent Students Details</title>
              <style>
                  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background-color: #eef2f7; }
                  h4 { color: #2c3e50; font-size: 1.8rem; text-align: center; }
                  table { width: 100%; border-collapse: collapse; margin-top: 20px; background-color: #fff; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); }
                  thead { background-color: #3498db; color: #fff; }
                  th, td { padding: 14px; text-align: left; border-bottom: 1px solid #e0e6ed; }
                  th { font-weight: 600; text-transform: uppercase; }
                  td { color: #34495e; }
                  tbody tr:nth-child(even) { background-color: #f1f5f9; }
                  tbody tr:hover { background-color: #dfe9f3; }
              </style>
          </head>
          <body>
              <h4>Absent Students Details</h4>
              <table>
                  <thead>
                      <tr>
                          <th>FCC ID</th>
                          <th>Name</th>
                          <th>Father</th>
                          <th>Mother</th>
                          <th>Mobile Number</th>
                          <th>Address</th>
                          <th>CTC Time</th>
                          <th>CTG Time</th>
                          <th>Task Completed</th>
                          <th>Admission Date</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${students.map(student => `
                          <tr>
                              <td>${student.fcc_id}</td>
                              <td>${student.name}</td>
                              <td>${student.father || 'N/A'}</td>
                              <td>${student.mother || 'N/A'}</td>
                              <td>${student.mobile_number || 'N/A'}</td>
                              <td>${student.address || 'N/A'}</td>
                              <td>${student.ctc_time ? new Date(student.ctc_time).toLocaleTimeString() : 'N/A'}</td>
                              <td>${student.ctg_time ? new Date(student.ctg_time).toLocaleTimeString() : 'N/A'}</td>
                              <td>${student.task_completed ? 'Yes' : 'No'}</td>
                              <td>${student.admission_date ? new Date(student.admission_date).toLocaleDateString() : 'N/A'}</td>
                          </tr>
                      `).join('')}
                  </tbody>
              </table>
          </body>
          </html>
      `;
      res.send(htmlContent);
  } catch (error) {
      console.error("Error fetching absent students:", error);
      res.status(500).send("Error fetching absent students");
  }
});

app.get('/fcchome-present-students', cors(), async (req, res) => {
  try {
    const today = new Date();
    const pad = (n) => (n < 10 ? '0' + n : n);
    const todayDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    const query = `
      WITH ValidStudentFCCIDs AS (
          SELECT nsa.fcc_id
          FROM "New_Student_Admission" nsa
          WHERE EXISTS (SELECT 1 FROM students s WHERE s.fcc_id = nsa.fcc_id)
      ),
      LatestStudentData AS (
          SELECT
              s.fcc_id,
              s.ctc_time,
              s.ctg_time,
              s.task_completed,
              ROW_NUMBER() OVER(PARTITION BY s.fcc_id ORDER BY s.ctc_time DESC NULLS LAST) as rn
          FROM students s
          WHERE EXISTS (SELECT 1 FROM ValidStudentFCCIDs vsf WHERE vsf.fcc_id = s.fcc_id)
      )
      SELECT nsa.fcc_id, nsa.name, nsa.father, nsa.mother, nsa.mobile_number, nsa.address, 
             lsd.ctc_time, lsd.ctg_time, lsd.task_completed, nsa.admission_date
      FROM LatestStudentData lsd
      JOIN "New_Student_Admission" nsa ON lsd.fcc_id = nsa.fcc_id
      WHERE DATE(lsd.ctc_time) = $1::date AND lsd.rn = 1;
    `;
    const result = await pool.query(query, [todayDate]);
    const students = result.rows.map(student => ({
      fcc_id: student.fcc_id,
      name: student.name,
      father: student.father || 'N/A',
      mother: student.mother || 'N/A',
      mobile_number: student.mobile_number || 'N/A',
      address: student.address || 'N/A',
      ctc_time: student.ctc_time ? new Date(student.ctc_time).toISOString() : 'N/A',
      ctg_time: student.ctg_time ? new Date(student.ctg_time).toISOString() : 'N/A',
      task_completed: student.task_completed ? 'Yes' : 'No',
      admission_date: student.admission_date ? new Date(student.admission_date).toISOString() : 'N/A'
    }));

    res.json({ students }); // Return JSON instead of HTML
  } catch (error) {
    console.error("Error fetching present students:", error);
    res.status(500).json({ error: "Error fetching present students" });
  }
});

// Route to fetch student profile by FCC ID

const generateSkillImageName = (req, file) => {
  try {
    console.log('req.body for image filename:', req.body); // Enhanced Debug log
    const fccId = req.body.fcc_id || 'unknown';
    const skillTopic = (req.body.skill_topic || 'skill')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 15);
    const date = new Date().toISOString().split('T')[0];
    const actionType = req.body.action_type || 'create';
    const ext = path.extname(file.originalname);

    const filename = `${fccId}_${skillTopic}_${date}_${actionType}${ext}`;
    console.log('Generated image filename:', filename); // Enhanced Debug log
    return filename;
  } catch (err) {
    console.error('Error generating image filename:', err);
    return file.originalname;
  }
};

// 2. Multer storage configuration
const skillImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/skill_images/');
  },
  filename: (req, file, cb) => {
    cb(null, generateSkillImageName(req, file));
  }
});

// 3. File filter for images only
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// 4. Configured upload middleware - Keeping it but will use 'uploadFiles' instead in routes

// 2. वीडियो के लिए नया स्टोरेज और फिल्टर
const generateSkillVideoName = (req, file) => {
  try {
    console.log('req.body for video filename:', req.body); // Enhanced Debug log
    const fccId = req.body.fcc_id || 'unknown';
    const skillTopic = (req.body.skill_topic || 'skill')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 15);
    const date = new Date().toISOString().split('T')[0];
    const actionType = req.body.action_type || 'create';
    const ext = path.extname(file.originalname);

    const filename = `${fccId}_${skillTopic}_${date}_${actionType}_video${ext}`;
    console.log('Generated video filename:', filename); // Enhanced Debug log
    return filename;
  } catch (err) {
    console.error('Error generating video filename:', err);
    return file.originalname;
  }
};

const skillVideoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/skill_videos/'); // नया डायरेक्टरी वीडियो के लिए
  },
  filename: (req, file, cb) => {
    cb(null, generateSkillVideoName(req, file));
  }
});

const videoFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed for videos!'), false);
  }
};

const uploadFiles = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === 'skill_image') {
        cb(null, 'public/skill_images/');
      } else if (file.fieldname === 'skill_video') {
        cb(null, 'public/skill_videos/');
      }
    },
    filename: (req, file, cb) => {
      if (file.fieldname === 'skill_image') {
        cb(null, generateSkillImageName(req, file));
      } else if (file.fieldname === 'skill_video') {
        cb(null, generateSkillVideoName(req, file));
      }
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'skill_image') {
      imageFileFilter(req, file, cb);
    } else if (file.fieldname === 'skill_video') {
      videoFileFilter(req, file, cb);
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 } // Maximum file size limit for both types
}).fields([
  { name: 'skill_image', maxCount: 1 },
  { name: 'skill_video', maxCount: 1 }
]);

// 5. Serve static files
app.use('/skill_images', express.static(path.join(__dirname, 'public/skill_images')));
app.use('/skill_videos', express.static(path.join(__dirname, 'public/skill_videos'))); // वीडियो के लिए नया रूट

// Route to fetch student profile by FCC ID
app.get("/get-student-profile/:fcc_id", async (req, res) => {
  const { fcc_id } = req.params;

  try {
    const query = 'SELECT * FROM "New_Student_Admission" WHERE fcc_id = $1';
    const result = await pool.query(query, [fcc_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const student = result.rows[0];
    student.photo_url = studentPhotos[fcc_id] || null; // Assign photo if available

    res.json(student);
  } catch (error) {
    console.error("Error fetching student:", error);
    res.status(500).json({ error: "Failed to fetch student data" });
  }
});

// Route to fetch student skills by FCC ID
// 6. GET रूट्स में वीडियो URL जोड़ें
app.get('/get-student-skills/:fcc_id', async (req, res) => {
  const { fcc_id } = req.params;

  try {
    const query = `
      SELECT
        skill_topic,
        skill_level,
        skill_description,
        skill_image_url,
        skill_video_url, -- वीडियो URL जोड़ें
        status,
        skill_log
      FROM student_skills
      WHERE fcc_id = $1
    `;
    const result = await pool.query(query, [fcc_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No skills found for this student' });
    }

    const skills = result.rows.map(skill => ({
      ...skill,
      skill_level: skill.skill_level || 'Unknown',
      status: skill.status || 'Not Specified',
      skill_description: skill.skill_description || 'No description available',
    }));

    res.json(skills);
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: 'Failed to fetch student skills' });
  }
});

// Route to search student skills by FCC ID - Consider if this is needed alongside /get-student-skills/:fcc_id
app.get('/api/student-skills/search/:fccId', async (req, res) => {
  const { fccId } = req.params;
  try {
    const query = 'SELECT * FROM student_skills WHERE fcc_id = $1';
    const result = await pool.query(query, [fccId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching student skills:', error);
    res.status(500).json({ error: 'Failed to fetch student skills' });
  }
});

// GET /api/skills (with pagination from previous solution)
app.get('/api/skills', async (req, res) => {
  try {
    const { fcc_id, name, skill_topic, skill_level, status, page = 1, limit = 10 } = req.query; // `status` ko add kiya
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        ss.*,
        nsa.name AS student_name
      FROM student_skills ss
      JOIN "New_Student_Admission" nsa ON ss.fcc_id = nsa.fcc_id
      WHERE 1=1
    `;
    let countQuery = `
      SELECT COUNT(*)
      FROM student_skills ss
      JOIN "New_Student_Admission" nsa ON ss.fcc_id = nsa.fcc_id
      WHERE 1=1
    `;
    const params = [];

    if (fcc_id) {
      query += ` AND ss.fcc_id = $${params.length + 1}`;
      countQuery += ` AND ss.fcc_id = $${params.length + 1}`;
      params.push(fcc_id);
    }
    if (name) {
      query += ` AND nsa.name ILIKE $${params.length + 1}`;
      countQuery += ` AND nsa.name ILIKE $${params.length + 1}`;
      params.push(`%${name}%`);
    }
    if (skill_topic) {
      query += ` AND ss.skill_topic ILIKE $${params.length + 1}`;
      countQuery += ` AND ss.skill_topic ILIKE $${params.length + 1}`;
      params.push(`%${skill_topic}%`);
    }
    if (skill_level) {
      query += ` AND ss.skill_level = $${params.length + 1}`;
      countQuery += ` AND ss.skill_level = $${params.length + 1}`;
      params.push(skill_level);
    }
    if (status) { // Naya condition for status filter
      query += ` AND ss.status = $${params.length + 1}`;
      countQuery += ` AND ss.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY ss.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [skillsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, -2))
    ]);

    res.json({
      skills: skillsResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Error fetching skills:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// POST /api/skills
app.post('/api/skills', uploadFiles, async (req, res, next) => { // Using uploadFiles middleware
  try {
    console.log('Request body for skill creation:', req.body);
    console.log('Files received:', req.files); // Debug log for files

    if (!req.body.fcc_id) {
      return res.status(400).json({ error: 'FCC ID is required' });
    }
    if (!req.body.skill_topic) {
      return res.status(400).json({ error: 'Skill Topic is required' });
    }
    if (!req.body.skill_level) {
      return res.status(400).json({ error: 'Skill Level is required' });
    }

    const skillData = {
      fcc_id: req.body.fcc_id,
      skill_topic: req.body.skill_topic,
      skill_level: req.body.skill_level,
      status: req.body.status,
      skill_description: req.body.skill_description,
      skill_image_url: req.files['skill_image'] ? `/skill_images/${req.files['skill_image'][0].filename}` : null,
      skill_video_url: req.files['skill_video'] ? `/skill_videos/${req.files['skill_video'][0].filename}` : null,
    };

    const insertSkillQuery = `
      INSERT INTO student_skills
      (fcc_id, skill_topic, skill_level, status, skill_description, skill_image_url, skill_video_url, skill_log)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const initialLog = [{
      time: new Date().toISOString(),
      action: 'create',
      details: {
        status: skillData.status,
        skill_topic: skillData.skill_topic,
        skill_level: skillData.skill_level,
        description: skillData.skill_description,
        image_url: skillData.skill_image_url,
        video_url: skillData.skill_video_url,
      }
    }];

    const skillResult = await pool.query(insertSkillQuery, [
      skillData.fcc_id,
      skillData.skill_topic,
      skillData.skill_level,
      skillData.status,
      skillData.skill_description,
      skillData.skill_image_url,
      skillData.skill_video_url,
      JSON.stringify(initialLog)
    ]);

    const logActivityQuery = `
      INSERT INTO skill_log_activity
      (student_skill_id, action, details, timestamp)
      VALUES ($1, $2, $3, NOW())
    `;
    await pool.query(logActivityQuery, [
      skillResult.rows[0].id,
      'create',
      JSON.stringify(skillData)
    ]);

    res.status(201).json(skillResult.rows[0]);
  } catch (err) {
    console.error('Error saving skill:', err);
    res.status(500).json({ error: 'Skill creation failed: ' + err.message });
  }
});

// PUT /api/skills/:id - Updated to use uploadFiles middleware
app.put('/api/skills/:id', uploadFiles, async (req, res, next) => { // Using uploadFiles middleware
  const skillId = req.params.id;
  console.log('Updating skill with ID:', skillId);
  console.log('Request body for skill update:', req.body);
  console.log('Files received for update:', req.files); // Debug log for files

  if (!skillId || isNaN(Number(skillId))) {
    return res.status(400).json({ error: 'Invalid skill ID provided' });
  }

  const { skill_topic, skill_level, status, skill_description } = req.body;
  let skill_image_url = req.body.skill_image_url; // default to body value if no new image
  let skill_video_url = req.body.skill_video_url; // default to body value if no new video

  // Check if new image was uploaded
  if (req.files['skill_image'] && req.files['skill_image'][0]) {
    skill_image_url = `/skill_images/${req.files['skill_image'][0].filename}`;
    console.log('Updated skill_image_url:', skill_image_url);
  }

  // Check if new video was uploaded
  if (req.files['skill_video'] && req.files['skill_video'][0]) {
    skill_video_url = `/skill_videos/${req.files['skill_video'][0].filename}`;
    console.log('Updated skill_video_url:', skill_video_url);
  }

  try {
    const currentSkillQuery = 'SELECT * FROM student_skills WHERE id = $1';
    const currentSkillResult = await pool.query(currentSkillQuery, [skillId]);

    if (currentSkillResult.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const currentSkill = currentSkillResult.rows[0];
    let currentLog = currentSkill.skill_log;

    if (!currentLog || typeof currentLog !== 'string') {
      currentLog = '[]';
    }

    try {
      currentLog = JSON.parse(currentLog);
    } catch (parseError) {
      console.error('Error parsing existing skill log:', parseError);
      currentLog = [];
    }

    const updateData = {
      skill_topic: skill_topic || currentSkill.skill_topic,
      skill_level: skill_level || currentSkill.skill_level,
      status: status || currentSkill.status,
      skill_description: skill_description || currentSkill.skill_description,
      skill_image_url: skill_image_url, // Use potentially new image URL or existing
      skill_video_url: skill_video_url, // Use potentially new video URL or existing
    };

    console.log('Update Data:', updateData);

    const newLogEntry = {
      time: new Date().toISOString(),
      action: 'update',
      details: updateData,
    };
    currentLog.push(newLogEntry);

    const updateQuery = `
      UPDATE student_skills
      SET skill_topic = $1,
          skill_level = $2,
          status = $3,
          skill_description = $4,
          skill_image_url = $5,
          skill_video_url = $6,
          skill_log = $7,
          updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `;
    const updateResult = await pool.query(updateQuery, [
      updateData.skill_topic,
      updateData.skill_level,
      updateData.status,
      updateData.skill_description,
      updateData.skill_image_url,
      updateData.skill_video_url,
      JSON.stringify(currentLog),
      skillId,
    ]);

    const logActivityQuery = `
      INSERT INTO skill_log_activity
      (student_skill_id, action, details, timestamp)
      VALUES ($1, $2, $3, NOW())
    `;
    await pool.query(logActivityQuery, [
      skillId,
      'update',
      JSON.stringify(updateData),
    ]);

    res.json(updateResult.rows[0]);
  } catch (err) {
    console.error('Error updating skill:', err);
    res.status(500).json({ error: `Skill update failed: ${err.message}` });
  }
});

// GET /api/students
app.get('/api/students', async (req, res) => {
  try {
    const result = await pool.query('SELECT fcc_id, name FROM "New_Student_Admission"');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Analyze Speech API
app.post('/api/analyze-speech', async (req, res) => {
  const { text, history, userName } = req.body;

  if (!text || !userName) {
    console.log('Missing required fields:', { text, userName });
    return res.status(400).json({ message: 'Text and userName are required.' });
  }

  let prompt = `
    You are an English-speaking assistant helping a learner practice English conversationally. Your goal is to improve their speaking skills by providing detailed feedback and encouraging practice.
    Analyze their latest input: "${text}"
    Provide the response in nine parts, separated by "---":
    Corrected Version: Give a direct, corrected version of what they should have said (simple and natural). If the input is 90%+ incorrect (score ≤ 10%), say: "I couldn’t understand you. Please tell me in Hindi what you meant, and I’ll help you say it in English!"
    2. Hindi Analysis: Explain in Hindi why the corrected version is better, pointing out specific mistakes (grammar, spelling, clarity, relevance) in a friendly tone. If the score is ≤ 10%, say: "आप क्या बोलना चाहते हैं? मुझे हिंदी में बताइए, मैं उसे अंग्रेजी में अनुवाद कर दूंगा!" and encourage them.
    3. Pronunciation Tip: Provide a short tip in Hindi about how to pronounce a key word or phrase from the corrected version (e.g., "‘Hello’ को ‘हैलो’ बोलते हैं, 'h' पर जोर दो!").
    4. Vocabulary Word: Pick one new or important word from the corrected version and give its Hindi meaning (e.g., "Word: Beautiful - सुंदर").
    5. User Score and Badge: Assign a percentage score (0-100%) based on accuracy (grammar, spelling, clarity, and relevance to context). Use these criteria:
       - 90-100%: Perfect or near-perfect (Excellent)
       - 80-89%: Minor errors (Good)
       - 60-79%: Understandable with some mistakes (Average)
       - 40-59%: Significant errors but somewhat clear (Poor)
       - 0-39%: Mostly incorrect or unclear (Needs Improvement)
       Format: "Score: XX%\nBadge: [Badge Name]"
    6. Corrected Score and Badge: Assign a score (typically 90-100%) and badge to the "Corrected Version". Format: "Score: XX%\nBadge: [Badge Name]"
    Next Question: Ask a follow-up question based on their input to keep the conversation going (keep it simple and relevant).
    Next Question Hindi: Provide the Hindi translation of the "Next Question".
    9. Mini Info: Provide a short tip in Hindi about why answering the "Next Question" helps (e.g., "इससे आपको रोज़मर्रा की बातचीत की प्रैक्टिस मिलेगी!").
    Use the previous conversation (history below) to understand context and make responses natural.
    Previous conversation:
  `;

  if (history && history.length > 0) {
    history.forEach((entry) => {
      prompt += `- User: "${entry.user_input}"\n- AI: "${entry.corrected_version} --- ${entry.hindi_analysis} --- ${entry.pronunciation_tip} --- ${entry.vocabulary_word} --- Score: ${entry.score}%\\nBadge: ${entry.badge} --- Corrected Score: ${entry.corrected_score}%\\nBadge: ${entry.corrected_badge} --- ${entry.next_question} --- ${entry.next_question_hindi} --- ${entry.mini_info}"\n`;
    });
  }

  prompt += `Now respond to the latest input: "${text}"`;

  let feedbackText;

  const processResponse = (text) => {
    const parts = text.split('---').map(part => part.trim());
    const correctedVersion = parts[0] || 'No correction provided.';
    const hindiAnalysis = parts[1] || 'कोई विश्लेषण नहीं दिया गया।';
    const pronunciationTip = parts[2] || 'उच्चारण टिप उपलब्ध नहीं है।';
    const vocabularyWord = parts[3] || 'कोई नया शब्द नहीं मिला।';
    const userScoreAndBadge = parts[4] || 'Score: 0%\nBadge: Needs Improvement';
    const correctedScoreAndBadge = parts[5] || 'Score: 100%\nBadge: Excellent';
    const nextQuestion = parts[6] || 'What happens next?';
    const nextQuestionHindi = parts[7] || 'आगे क्या होता है?';
    const miniInfo = parts[8] || 'इससे आपको अंग्रेजी बोलने की प्रैक्टिस मिलेगी!';

    const [userScoreLine = 'Score: 0%', userBadgeLine = 'Badge: Needs Improvement'] = userScoreAndBadge.split('\n').map(line => line.trim());
    const userScore = parseInt(userScoreLine.match(/\d+/)?.[0] || 0, 10);
    const userBadge = userBadgeLine.match(/Badge: (.+)/)?.[1] || 'Needs Improvement';

    const [correctedScoreLine = 'Score: 100%', correctedBadgeLine = 'Badge: Excellent'] = correctedScoreAndBadge.split('\n').map(line => line.trim());
    const correctedScore = parseInt(correctedScoreLine.match(/\d+/)?.[0] || 100, 10);
    const correctedBadge = correctedBadgeLine.match(/Badge: (.+)/)?.[1] || 'Excellent';

    return {
      correctedVersion,
      hindiAnalysis,
      pronunciationTip,
      vocabularyWord,
      score: userScore,
      badge: userBadge,
      correctedScore,
      correctedBadge,
      nextQuestion,
      nextQuestionHindi,
      miniInfo
    };
  };

  try {
    console.log('Attempting Gemini 1.5 Pro...');
    const geminiProResponse = await geminiProModel.generateContent(prompt);
    feedbackText = geminiProResponse.response.text();
  } catch (error) {
    if (error.status === 429) {
      console.log('Gemini 1.5 Pro quota exhausted, switching to Gemini 1.5 Flash...');
      try {
        const geminiFlashResponse = await geminiFlashModel.generateContent(prompt);
        feedbackText = geminiFlashResponse.response.text();
      } catch (flashError) {
        if (flashError.status === 429) {
          console.log('Gemini 1.5 Flash quota exhausted, switching to DeepSeek API...');
          try {
            const deepseekResponse = await fetch(DEEPSEEK_API_URL, {
              method: 'POST',
              headers: {
                "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                "model": "deepseek/deepseek-r1:free",
                "messages": [
                  { "role": "user", "content": prompt }
                ]
              })
            });

            if (!deepseekResponse.ok) {
              const errorDetails = await deepseekResponse.json();
              throw new Error(`DeepSeek API request failed: ${errorDetails.error?.message || deepseekResponse.statusText}`);
            }

            const deepseekData = await deepseekResponse.json();
            feedbackText = deepseekData.choices[0].message.content;
          } catch (deepseekError) {
            console.error('DeepSeek API error:', deepseekError);
            return res.status(429).json({
              message: 'सभी AI मॉडल्स का कोटा समाप्त हो गया है। कृपया बाद में कोशिश करें।',
              error: 'All AI model quotas exhausted.'
            });
          }
        } else {
          throw flashError;
        }
      }
    } else {
      throw error;
    }
  }

  const responseData = processResponse(feedbackText);
  const secretInfo = generateSecretInfo(responseData.score);
  let personalizedMessage = '';
  if (responseData.score >= 90) personalizedMessage = "शाबाश! बहुत शानदार काम!";
  else if (responseData.score >= 60) personalizedMessage = "Good job! अच्छा प्रयास!";
  else personalizedMessage = "कोई बात नहीं, प्रैक्टिस जारी रखें!";

  const query = `
    INSERT INTO conversations (user_name, user_input, corrected_version, hindi_analysis, pronunciation_tip, vocabulary_word, score, badge, corrected_score, corrected_badge, secret_info, next_question, next_question_hindi, mini_info, personalized_message)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *;
  `;
  const values = [
    userName, text, responseData.correctedVersion, responseData.hindiAnalysis, responseData.pronunciationTip, responseData.vocabularyWord,
    responseData.score, responseData.badge, responseData.correctedScore, responseData.correctedBadge, secretInfo,
    responseData.nextQuestion, responseData.nextQuestionHindi, responseData.miniInfo, personalizedMessage
  ];

  try {
    const result = await pool.query(query, values);
    console.log('Speech analyzed and stored:', result.rows[0]);
    res.status(200).json({
      correctedVersion: responseData.correctedVersion,
      hindiAnalysis: responseData.hindiAnalysis,
      pronunciationTip: responseData.pronunciationTip,
      vocabularyWord: responseData.vocabularyWord,
      score: responseData.score,
      badge: responseData.badge,
      correctedScore: responseData.correctedScore,
      correctedBadge: responseData.correctedBadge,
      secretInfo,
      nextQuestion: responseData.nextQuestion,
      nextQuestionHindi: responseData.nextQuestionHindi,
      miniInfo: responseData.miniInfo,
      personalizedMessage
    });
  } catch (dbError) {
    console.error('Database insertion error:', dbError);
    res.status(500).json({ message: 'Database error occurred.', error: dbError.message });
  }
});

// Get Conversation History API
app.get('/api/conversation-history', async (req, res) => {
  const { userName } = req.query;

  if (!userName) {
    console.log('Missing userName in query');
    return res.status(400).json({ message: 'userName is required.' });
  }

  try {
    const query = `
      SELECT * FROM conversations
      WHERE user_name = $1
      ORDER BY timestamp DESC;
    `;
    const result = await pool.query(query, [userName]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    res.status(500).json({ message: 'Failed to fetch history.' });
  }
});

// Progress Saving Route
app.post('/api/english-progress', async (req, res) => {
  const { userName, secretCode, level, score } = req.body;
  const clientIp = req.ip || req.connection.remoteAddress;

  if (!userName || !secretCode || !level || !score) {
    console.log('Missing fields in progress save:', { userName, secretCode, level, score });
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO english_progress (user_name, secret_code, level, score, client_ip, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [userName, secretCode, level, score, clientIp]
    );

    console.log('Progress saved:', result.rows[0]);
    res.status(201).json({ message: 'Progress saved successfully!', data: result.rows[0] });
  } catch (error) {
    console.error('Error saving progress:', error);
    res.status(500).json({ message: 'Failed to save progress.' });
  }
});

// API endpoint to log user activity
app.post('/api/user-activity-log', async (req, res) => {
  const { activity_type, activity_details, page_url, session_id: frontendSessionId } = req.body;
  const clientIp = req.ip; // Get user IP address
  const sessionUuid = frontendSessionId || uuidv4(); // Use session ID from frontend or generate new

  if (!activity_type) {
      return res.status(400).json({ error: 'Activity type is required' });
  }

  try {
      const insertQuery = `
          INSERT INTO user_activity_log (user_name, ip_address, session_id, page_url, activity_type, activity_details)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, timestamp;
      `;
      const insertValues = ['anonymous_user', clientIp, sessionUuid, page_url, activity_type, activity_details]; // user_name abhi default

      const activityLogResult = await pool.query(insertQuery, insertValues);
      console.log("User activity logged:", activityLogResult.rows[0]);

      res.status(201).json({ message: 'Activity logged successfully', log_id: activityLogResult.rows[0].id, session_id: sessionUuid });
  } catch (dbError) {
      console.error("Error logging user activity to database:", dbError);
      res.status(500).json({ error: 'Failed to log user activity', details: dbError.message });
  }
})

// Get all live videos
app.get("/live-videos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM live_videos ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Add new live video
app.post("/live-videos", async (req, res) => {
  const { classroom_name, video_title, youtube_url, live_date } = req.body;
  const updated_by = req.cookies.username || "anonymous"; // Get username from cookies
  try {
    const result = await pool.query(
      "INSERT INTO live_videos (classroom_name, video_title, youtube_url, live_date, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING video_id",
      [classroom_name, video_title, youtube_url, live_date]
    );
    const video_id = result.rows[0].video_id;

    // Log the creation
    await pool.query(
      "INSERT INTO live_video_logs (video_id, action_type, new_classroom_name, new_video_title, new_youtube_url, new_live_date, updated_by) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [video_id, "created", classroom_name, video_title, youtube_url, live_date, updated_by]
    );

    res.status(201).send("Video added successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Update live video
app.put("/live-videos/:id", async (req, res) => {
  const { id } = req.params;
  const { classroom_name, video_title, youtube_url, live_date } = req.body;
  const updated_by = req.cookies.username || "anonymous"; // Get username from cookies

  try {
    // Get old values
    const oldVideo = await pool.query("SELECT * FROM live_videos WHERE video_id = $1", [id]);
    const oldData = oldVideo.rows[0];

    // Log the update with old and new values
    await pool.query(
      "INSERT INTO live_video_logs (video_id, action_type, old_classroom_name, new_classroom_name, old_video_title, new_video_title, old_youtube_url, new_youtube_url, old_live_date, new_live_date, updated_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
      [
        id,
        "updated",
        oldData.classroom_name,
        classroom_name,
        oldData.video_title,
        video_title,
        oldData.youtube_url,
        youtube_url,
        oldData.live_date,
        live_date,
        updated_by,
      ]
    );

    // Update the video
    await pool.query(
      "UPDATE live_videos SET classroom_name = $1, video_title = $2, youtube_url = $3, live_date = $4, updated_at = NOW() WHERE video_id = $5",
      [classroom_name, video_title, youtube_url, live_date, id]
    );

    res.send("Video updated successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Add Teacher
app.post("/teachers", async (req, res) => {
  const { fccid, name, subject } = req.body;
  try {
    await pool.query(
      "INSERT INTO teachers (fccid, name, subject) VALUES ($1, $2, $3)",
      [fccid, name, subject]
    );
    res.status(201).send("Teacher added successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Get All Teachers
app.get("/teachers", async (req, res) => {
  try {
    const result = await pool.query("SELECT fccid, name, subject FROM teachers ORDER BY name");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Record Campus Entry
app.post("/campus-entry", async (req, res) => {
  const { fccid } = req.body;
  const recorded_by = req.cookies.username || "anonymous";
  try {
    const result = await pool.query(
      "INSERT INTO campus_entry_exit (fccid, recorded_by) VALUES ($1, $2) RETURNING entry_id",
      [fccid, recorded_by]
    );
    res.status(201).json({ message: "Entry recorded", entry_id: result.rows[0].entry_id });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Record Campus Exit
app.put("/campus-exit/:entry_id", async (req, res) => {
  const { entry_id } = req.params;
  try {
    await pool.query(
      "UPDATE campus_entry_exit SET exit_time = NOW() WHERE entry_id = $1 AND exit_time IS NULL",
      [entry_id]
    );
    res.send("Exit recorded");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Start Teaching Session
app.post("/teaching-session", async (req, res) => {
  const { fccid } = req.body;
  const recorded_by = req.cookies.username || "anonymous";
  try {
    const teacher = await pool.query("SELECT subject FROM teachers WHERE fccid = $1", [fccid]);
    if (!teacher.rows.length) throw new Error("Teacher not found");
    const subject = teacher.rows[0].subject;

    const result = await pool.query(
      "INSERT INTO teaching_sessions (fccid, subject, recorded_by) VALUES ($1, $2, $3) RETURNING session_id",
      [fccid, subject, recorded_by]
    );
    res.status(201).json({ message: "Teaching session started", session_id: result.rows[0].session_id });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// End Teaching Session
app.put("/teaching-session/:session_id", async (req, res) => {
  const { session_id } = req.params;
  try {
    await pool.query(
      "UPDATE teaching_sessions SET end_time = NOW() WHERE session_id = $1 AND end_time IS NULL",
      [session_id]
    );
    res.send("Teaching session ended");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Start Study Session
app.post("/study-session", async (req, res) => {
  const { fccid } = req.body;
  const recorded_by = req.cookies.username || "anonymous";
  try {
    const result = await pool.query(
      "INSERT INTO study_sessions (fccid, recorded_by) VALUES ($1, $2) RETURNING session_id",
      [fccid, recorded_by]
    );
    res.status(201).json({ message: "Study session started", session_id: result.rows[0].session_id });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});
// Start Group Session
app.post("/group-sessions/start", async (req, res) => {
  const { fccid, session_type } = req.body;
  const recorded_by = req.cookies.username || "anonymous";
  try {
    const result = await pool.query(
      "INSERT INTO group_sessions (fccid, session_type, recorded_by) VALUES ($1, $2, $3) RETURNING session_id",
      [fccid, session_type, recorded_by]
    );
    res.status(201).json({ message: `${session_type} session started`, session_id: result.rows[0].session_id });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// End Group Session
app.put("/group-sessions/end/:session_id", async (req, res) => {
  const { session_id } = req.params;
  try {
    await pool.query(
      "UPDATE group_sessions SET end_time = NOW() WHERE session_id = $1 AND end_time IS NULL",
      [session_id]
    );
    res.send("Session ended");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Fetch Active Group Sessions
app.get("/group-sessions/active", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT session_id, fccid, session_type, start_time FROM group_sessions WHERE end_time IS NULL"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Updated Activity Report
app.get("/activity-report", async (req, res) => {
  const { fccid, start_date, end_date } = req.query;
  try {
    const queryParams = [start_date, end_date];
    let baseQuery = `
      SELECT 
        t.fccid, t.name, t.subject,
        (SELECT COUNT(*) FROM campus_entry_exit ce WHERE ce.fccid = t.fccid AND ce.entry_time >= $1 AND ce.entry_time <= $2) as campus_visits,
        (SELECT SUM(EXTRACT(EPOCH FROM (ce.exit_time - ce.entry_time))) FROM campus_entry_exit ce WHERE ce.fccid = t.fccid AND ce.entry_time >= $1 AND ce.entry_time <= $2 AND ce.exit_time IS NOT NULL) as total_campus_seconds,
        (SELECT SUM(EXTRACT(EPOCH FROM (gs.end_time - gs.start_time))) FROM group_sessions gs WHERE gs.fccid = t.fccid AND gs.session_type = 'teaching' AND gs.start_time >= $1 AND gs.start_time <= $2 AND gs.end_time IS NOT NULL) as teaching_seconds,
        (SELECT SUM(EXTRACT(EPOCH FROM (gs.end_time - gs.start_time))) FROM group_sessions gs WHERE gs.fccid = t.fccid AND gs.session_type = 'study' AND gs.start_time >= $1 AND gs.start_time <= $2 AND gs.end_time IS NOT NULL) as study_seconds,
        (SELECT SUM(EXTRACT(EPOCH FROM (gs.end_time - gs.start_time))) FROM group_sessions gs WHERE gs.fccid = t.fccid AND gs.session_type = 'sleeping' AND gs.start_time >= $1 AND gs.start_time <= $2 AND gs.end_time IS NOT NULL) as sleeping_seconds,
        (SELECT SUM(EXTRACT(EPOCH FROM (gs.end_time - gs.start_time))) FROM group_sessions gs WHERE gs.fccid = t.fccid AND gs.session_type = 'entertainment' AND gs.start_time >= $1 AND gs.start_time <= $2 AND gs.end_time IS NOT NULL) as entertainment_seconds,
        (SELECT SUM(EXTRACT(EPOCH FROM (gs.end_time - gs.start_time))) FROM group_sessions gs WHERE gs.fccid = t.fccid AND gs.session_type = 'lunch' AND gs.start_time >= $1 AND gs.start_time <= $2 AND gs.end_time IS NOT NULL) as lunch_seconds,
        (SELECT SUM(EXTRACT(EPOCH FROM (gs.end_time - gs.start_time))) FROM group_sessions gs WHERE gs.fccid = t.fccid AND gs.session_type = 'breakfast' AND gs.start_time >= $1 AND gs.start_time <= $2 AND gs.end_time IS NOT NULL) as breakfast_seconds,
        (SELECT SUM(EXTRACT(EPOCH FROM (gs.end_time - gs.start_time))) FROM group_sessions gs WHERE gs.fccid = t.fccid AND gs.session_type = 'dinner' AND gs.start_time >= $1 AND gs.start_time <= $2 AND gs.end_time IS NOT NULL) as dinner_seconds,
        (SELECT SUM(EXTRACT(EPOCH FROM (gs.end_time - gs.start_time))) FROM group_sessions gs WHERE gs.fccid = t.fccid AND gs.session_type = 'out_of_campus' AND gs.start_time >= $1 AND gs.start_time <= $2 AND gs.end_time IS NOT NULL) as out_of_campus_seconds,
        (SELECT SUM(EXTRACT(EPOCH FROM (gs.end_time - gs.start_time))) FROM group_sessions gs WHERE gs.fccid = t.fccid AND gs.session_type = 'others' AND gs.start_time >= $1 AND gs.start_time <= $2 AND gs.end_time IS NOT NULL) as others_seconds
      FROM teachers t
    `;
    if (fccid) {
      baseQuery += " WHERE t.fccid = $3";
      queryParams.push(fccid);
    }
    baseQuery += " GROUP BY t.fccid, t.name, t.subject";

    const result = await pool.query(baseQuery, queryParams);
    res.json(result.rows.map(row => {
      const totalCampusSeconds = row.total_campus_seconds || 0;
      const mealSeconds = (row.lunch_seconds || 0) + (row.breakfast_seconds || 0) + (row.dinner_seconds || 0);
      const productiveSeconds = (row.teaching_seconds || 0) + 
                               (row.study_seconds || 0) + 
                               (row.sleeping_seconds || 0) + 
                               (row.breakfast_seconds || 0) + 
                               (row.dinner_seconds || 0); // Lunch ko productive se exclude kiya
      const timeLostSeconds = Math.max(0, totalCampusSeconds - productiveSeconds) + 
                              (row.entertainment_seconds || 0) + 
                              (row.out_of_campus_seconds || 0) + 
                              (row.lunch_seconds || 0);

      console.log(`Debug - FCCID: ${row.fccid}, Total Campus: ${totalCampusSeconds}, Productive: ${productiveSeconds}, Time Lost: ${timeLostSeconds}`);

      return {
        ...row,
        total_campus_time: formatTime(row.total_campus_seconds || 0),
        teaching_time: formatTime(row.teaching_seconds || 0),
        study_time: formatTime(row.study_seconds || 0),
        sleeping_time: formatTime(row.sleeping_seconds || 0),
        entertainment_time: formatTime(row.entertainment_seconds || 0),
        lunch_time: formatTime(row.lunch_seconds || 0),
        breakfast_time: formatTime(row.breakfast_seconds || 0),
        dinner_time: formatTime(row.dinner_seconds || 0),
        meal_time: formatTime(mealSeconds),
        out_of_campus_time: formatTime(row.out_of_campus_seconds || 0),
        others_time: formatTime(row.others_seconds || 0),
        time_lost: formatTime(timeLostSeconds), // Renamed from timepass_time to time_lost
      };
    }));
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// server.js

// Fetch Unique Session Types
app.get("/session-types", async (req, res) => {
  try {
    const result = await pool.query("SELECT DISTINCT session_type FROM group_sessions");
    const sessionTypes = result.rows.map(row => row.session_type);
    res.json(sessionTypes);
  } catch (err) {
    console.error("Error fetching session types:", err);
    res.status(500).send("Server Error");
  }
});
// server.js (or your main backend file)
// ... your existing imports and configurations ...

// Leaderboard Endpoint with Session-wise Filtering
app.get("/leaderboard-sessions", async (req, res) => {
  const { session_type, start_date, end_date } = req.query;
  let query = `
    SELECT
      fccid,
      session_type,
      COUNT(*) as session_count,
      SUM(EXTRACT(EPOCH FROM (end_time - start_time))) as total_duration_seconds
    FROM
      group_sessions
    WHERE
      end_time IS NOT NULL
  `;
  const params = [];

  if (session_type) {
    query += ` AND session_type = $${params.length + 1}`;
    params.push(session_type);
  }

  if (start_date && end_date) {
    query += ` AND start_time BETWEEN $${params.length + 1} AND $${params.length + 2}`;
    params.push(start_date, end_date);
  } else if (start_date) {
    query += ` AND start_time >= $${params.length + 1}`;
    params.push(start_date);
  } else if (end_date) {
    query += ` AND start_time <= $${params.length + 1}`;
    params.push(end_date);
  }


  query += `
    GROUP BY
      fccid, session_type
    ORDER BY
      total_duration_seconds DESC;
  `;

  try {
    const result = await pool.query(query, params);
    res.json(result.rows.map(row => ({
      ...row,
      total_duration: formatTime(row.total_duration_seconds || 0), // Format duration in HH:MM:SS
    })));
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// ... your existing formatTime function (if not already present in this file, add it here)
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return "00:00:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}


// Server Startup
app.listen(port, async () => {
  console.log(`HTTP Server running on port ${port}`);
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Database connected, response:', res.rows);
  } catch (err) {
    console.error('Database connection or setup error:', err);
  }
});