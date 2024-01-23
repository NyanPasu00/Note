require("dotenv").config();
const express = require("express");
const nodeMailer = require("nodemailer");
const multer = require("multer");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
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

app.delete("/logout", (req, res) => {
  // Clear the refreshToken cookie on the client side
  res.clearCookie("refreshToken", { httpOnly: true });

  // Respond with a status indicating success (204 No Content)
  res.sendStatus(204);
});

app.post("/refreshtoken", (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken == null) {
    return res.json({ error: "Refresh token expired", expired: true });
  }
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403); // Other verification errors
    }

    const accessToken = generateAccessToken({ name: user.name });
    res.json({ accessToken: accessToken });
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
      console.log("Token is valid");

      return res.json({ message: "Token is valid", refresh: false });
    }
  });
});

function generateAccessAndRefreshToken(req, res, user) {
  const accessToken = generateAccessToken(user);
  const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET);
  try {
    console.log("Setting refreshToken cookie...");

    const expirationTime = new Date(new Date().getTime() + 100 * 1000);
    res.cookie("refreshToken", refreshToken, {
      sameSite: "strict",
      path: "/",
      expires: expirationTime,
      httpOnly: true,
    });
    console.log("Cookie set successfully!");
    return { accessToken: accessToken, refreshToken: refreshToken };
  } catch (error) {
    console.error("Error setting refreshToken cookie:", error);
  }
}

function generateAccessToken(user) {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "10s" });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    console.log("Authorization header missing");
    return res.status(401).json({ error: "Authorization header missing" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    console.log("Bearer token missing");
    return res.status(401).json({ error: "Bearer token missing" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        console.log("Token expired");
        return res.status(401).json({ error: "Token expired" });
      }
      console.log("Invalid token");
      return res.json({ error: "Invalid token" });
    }

    console.log("Token is valid");
    req.user = user;
    next();
  });
}

//Sending Email
app.post("/sendemail", upload.array("selectedFiles"), (req, res) => {
  const { subject, toEmail, text } = req.body;
  const files = req.files;
  console.log(req.files);
  console.log("Received Files:", files);

  const transporter = nodeMailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL,
      pass: process.env.PASSWORD,
    },
  });

  const attachments = files.map((file) => ({
    filename: file.originalname,
    content: file.buffer,
    encoding: "base64",
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
      console.error("Error sending email:", error);

      // Check if the error includes more details
      if (error.response) {
        console.error("SMTP Error Response:", error.response);
      }

      res.status(500).send("Error sending email");
    } else {
      console.log("Email sent:", info.response);
      res.status(200).send("Email Sent Successfully");
    }
  });
});

module.exports = { authenticateToken, generateAccessAndRefreshToken };

app.listen(4000, () => {
  console.log("Running In Port 4000");
});
