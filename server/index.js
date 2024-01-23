require("dotenv").config();
const express = require("express");
const app = express();
const mysql = require("mysql");
const path = require("path");
const multer = require("multer");
const cors = require("cors");
const {
  authenticateToken,
  generateAccessAndRefreshToken,
} = require("../JavaScript/JWT/JsonToken/server.js");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("uploads"));
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "OPTIONS", "PUT"], // Add the relevant methods
    allowedHeaders: ["Content-Type", "Authorization"],
  })
); 

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "_" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

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

//Register Product
app.post(
  "/regisProduct",
  authenticateToken,
  upload.single("file"),
  (req, res) => {
    const {
      name,
      email,
      phone,
      address,
      address2,
      city,
      postcode,
      country,
      serialNum,
      purchaseDate,
      sellerName,
      registerDate,
      uid,
      productname,
      kplus,
      warrantyExpiredDate,
    } = req.body;
    const uploadedFile = req.file.filename;

    const query = `
  START TRANSACTION;
  INSERT client.registerproduct
  SET name = "${name}" , email = "${email}" , phone = "${phone}",address = "${address}"
  , address2 = "${address2}", city = "${city}", postcode = ${postcode}, country = "${country}"
  , serialNum = "${serialNum}", purchaseDate = STR_TO_DATE("${purchaseDate}","%d-%m-%Y"), sellerName = "${sellerName}" ,
  registerDate = STR_TO_DATE("${registerDate}","%d-%m-%Y"), uid = "${uid}", receiptImage = "${uploadedFile}" , productname = "${productname}", 
  kplus = "${kplus}" , warrantyexpired = STR_TO_DATE("${warrantyExpiredDate}","%d-%m-%Y") ;
  COMMIT;
`;

    db.query(query, (err, result) => {
      if (err) {
        console.log(err);

        res.status(500).send("Database query error");
      } else {
        console.log(result);
        res.status(200).send("Success");
      }
    });
  }
);

//Create RMA
app.post(
  "/createrma",
  authenticateToken,
  upload.fields([
    { name: "imagefile", maxCount: 1 },
    { name: "imagefile2", maxCount: 1 },
    { name: "videofile", maxCount: 1 },
  ]),
  (req, res) => {
    const imageFile =
      req.files["imagefile"]?.map(({ filename }) => filename) || [];
    const imageFile2 =
      req.files["imagefile2"]?.map(({ filename }) => filename) || [];
    const videoFile =
      req.files["videofile"]?.map(({ filename }) => filename) || [];
    const reason = req.body.reason;
    const serialNum = req.body.serialNum;
    const query = `
    START TRANSACTION;
    INSERT client.createrma
    SET reason = "${reason}" , serialNum = "${serialNum}" 
    , productImage="${imageFile}",productImage2="${imageFile2}",productVideo="${videoFile}" ;
    COMMIT;`;
    db.query(query, (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Database query error");
      } else {
        console.log(result);
        res.status(200).json(result);
      }
    });
  }
);

//Get information from register Product
app.get("/getregisProduct", authenticateToken, (req, res) => {
  const uid = req.query.uid;
  const rowsPerPage = req.query.rowsPerPage;
  const page = req.query.page;

  const query = `
  START TRANSACTION;
  SELECT SQL_CALC_FOUND_ROWS * , R.serialNum
  FROM client.registerproduct R
  LEFT JOIN client.createrma E ON R.serialNum = E.serialNum
  WHERE uid = "${uid}" AND display = true
  ORDER BY R.serialNum
  LIMIT ${rowsPerPage} OFFSET ${page * rowsPerPage};
  SELECT FOUND_ROWS() AS totalRows;
  COMMIT;
  `;
  db.query(query, (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Database query error");
    } else {
      res
        .status(200)
        .json({ product: result[1], totalRow: result[2][0].totalRows });
    }
  });
});

app.post("/searchProduct", authenticateToken, (req, res) => {
  const searchQuery = req.body.searchQuery;
  const uid = req.body.uid;
  console.log(uid);
  const query = `
  START TRANSACTION;
  SELECT * , R.serialNum FROM client.registerproduct R
  LEFT JOIN client.createrma E ON R.serialNum = E.serialNum
  WHERE ( DATE_FORMAT(R.registerDate,'%Y-%m-%d') LIKE '%${searchQuery}%' OR R.name LIKE '%${searchQuery}%' OR R.serialNum LIKE '%${searchQuery}%' 
  OR R.productname LIKE '%${searchQuery}%' OR  DATE_FORMAT(R.warrantyexpired ,'%Y-%m-%d') LIKE '%${searchQuery}%' OR R.warrantyStatus LIKE '%${searchQuery}%' 
  OR CONCAT('RMA', LPAD(E.rma_id, 4, '0')) LIKE 'RMA%${searchQuery}%' OR E.reason LIKE '%${searchQuery}%' OR E.rmaStatus LIKE '%${searchQuery}%' ) AND uid ="${uid}" AND display =true; 
  COMMIT;
  `;
 
  db.query(query, (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Database query error");
    } else {
      console.log(result);
      res.status(200).json(result[1]);
    }
  });
});
   
//Check the Serial Number
app.get("/checkserialnumber", authenticateToken, (req, res) => {
  const serialnumber = req.query.serialnumber;
  const query = `SELECT * FROM client.product WHERE serialnumber="${serialnumber}"`;
  console.log(serialnumber);
  db.query(query, (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Database query error");
    } else {
      const exists = result.length > 0;

      res.status(200).json({ exists, result });
    }
  });
});

//Cancel the Product
app.put("/cancelproduct", authenticateToken, (req, res) => {
  const id = req.query.id;
 
  const query = `
  START TRANSACTION;
  UPDATE client.registerproduct SET display = false WHERE id=${id} ;
  COMMIT;`;
  db.query(query, (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Database query error");
    } else {
      res.status(200).json(result);
    }
  }); 
});

//Update the New Address at Create RMA
app.put("/updateAddress", authenticateToken, (req, res) => {
  const { serialNum, address, address2, city, postcode, country } = req.body;

  const query = `UPDATE client.registerproduct SET address="${address}" , address2="${address2}" 
  , city="${city}" , postcode="${postcode}" , country="${country}" WHERE serialNum="${serialNum}" `;

  db.query(query, (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Database query error");
    } else {
      res.status(200).json(result);
    }
  });
});
 
//Update Way Bill
app.put("/updateWaybill", (req, res) => {
  const { waybill, courier, serialNum } = req.body;

  const query = `UPDATE client.registerproduct SET waybill="${waybill}" , courier="${courier}" 
  WHERE serialNum="${serialNum}";`;

  db.query(query, (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Database query error");
    } else {
      res.status(200).json(result);
    }
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
      const token = generateAccessAndRefreshToken(req,res,user);
      console.log(token); 
      res.status(200).json({
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        affectedRows: result[1].affectedRows,
      });
    } 
  });  
}); 
 
app.listen(3001, () => { 
  console.log("Running In Port 3001");
}); 
