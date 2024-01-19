require("dotenv").config();
const express = require("express");
const nodeMailer = require("nodemailer");
const multer = require('multer');
const cookieParser = require("cookie-parser");
const mysql = require("mysql");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const { authenticateToken } = require("./authMiddleware");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"], // Add the relevant methods
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);



const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_DATABASE,
  charset: "utf8mb4",
  multipleStatements: true,
});

db.connect((err) => {
  if (err) throw err;
  console.log("MySql Connected");
});

app.delete("/logout", (req, res) => {
  // Clear the refreshToken cookie on the client side
  res.clearCookie("refreshToken", { httpOnly: true });

  // Respond with a status indicating success (204 No Content)
  res.sendStatus(204);
});

app.post("/refreshtoken", (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken == null) return res.sendStatus(401);

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);

    const accessToken = generateAccessToken({ name: user.name });
    res.json({ accessToken: accessToken });
  });
});

app.post("/loginInformation", (req, res) => {
  const email = req.body.email;
  const name = req.body.name;
  const uid = req.body.uid;
  const user = { email: email, name: name, uid: uid };
  const query = `
  START TRANSACTION;
  INSERT INTO client.rma_uid (email, name, uid)
  SELECT "${email}" AS email, "${name}" AS name, "${uid}" AS uid
  FROM (SELECT 1) as Dummy
  WHERE NOT EXISTS (SELECT 1 FROM client.rma_uid WHERE uid = "${uid}")
  LIMIT 1;
  COMMIT;
`;

  db.query(query, (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Database query error");
    } else {
      const accessToken = generateAccessToken(user);
      const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET);
      try {
        console.log("Setting refreshToken cookie...");

        const expirationTime = new Date(new Date().getTime() + 500 * 1000); // 5 seconds from now
        res.cookie("refreshToken", refreshToken, {
          sameSite: "strict",
          path: "/",
          expires: expirationTime,
          httpOnly: true,
        });

        console.log("Cookie set successfully!");
        res.status(200).json({
          accessToken: accessToken,
          affectedRows: result[1].affectedRows,
        });
      } catch (error) {
        console.error("Error setting refreshToken cookie:", error);
        res.status(500).send("Internal Server Error");
      }
    }
  });
});

app.post("/checkingExpired", (req, res) => {
  const token = req.body.accessToken;
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        console.log("Token expired");
        return res.json({ error: "Token expired", refresh: true });
      }
      console.log("Invalid token");
      return res.status(403).json({ error: "Invalid token" });
    } else {
      // Continue with additional logic for a valid token if needed
      console.log("Token is valid");
      // Additional logic here...

      // Send a response back if necessary
      return res.json({ message: "Token is valid", refresh: false });
    }
  });
});

app.get("/getRefreshCookie", (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  res.json({ refreshToken: refreshToken });
});

function generateAccessToken(user) {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "10s" });
}

//Sending Email
app.post('/sendemail', upload.array('selectedFiles'), (req, res) => {
  const { subject, toEmail, text } = req.body;
  const files = req.files;
  console.log(req.files);
  console.log('Received Files:', files);

  const transporter = nodeMailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL,
      pass: process.env.PASSWORD,
    },
  });

  const attachments = files.map((file) => ({
    filename: file.originalname,
    content: file.buffer,
    encoding: 'base64',
    mimetype: file.mimetype,
  }));

  const mailOptions = {
    from: process.env.GMAIL,
    to: toEmail,
    subject: subject,
    text: text,
    attachments: attachments,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);

      // Check if the error includes more details
      if (error.response) {
        console.error('SMTP Error Response:', error.response);
      }

      res.status(500).send('Error sending email');
    } else {
      console.log('Email sent:', info.response);
      res.status(200).send('Email Sent Successfully');
    }
  });
});
app.listen(3002);
