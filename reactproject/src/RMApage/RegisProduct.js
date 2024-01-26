
import moment from "moment";
import axios from "axios";
import React, { useContext, useState } from "react";
import AuthContext from "../context/AuthProvider";
import imageCompression from 'browser-image-compression';
import { PDFDocument } from 'pdf-lib';
import "./style.css";
//Material UI
import { Button, TextField } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import CancelIcon from "@mui/icons-material/Cancel";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";

export function RegisProduct({ handleRegisProductPage }) {
  const defaultDate = moment();

  const { user, VisuallyHiddenInput , checkAndRefresh } = useContext(AuthContext);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [productCount, setProductCount] = useState(1);

  const [address, setAddress] = useState({
    address: "",
    address2: "",
    city: "",
    postcode: "",
    country: "",
  });

  const [product, setProduct] = useState([
    {
      serialNum: "",
      purchaseDate: defaultDate.format("DD-MM-YYYY"),
      sellerName: "",
      checkSerialResult: null,
      serialResult: {},
    },
  ]);

  //Insert Address
  const handleInputAddressChange = (e) => {
    const { id, value } = e.target;
    setAddress({
      ...address,
      [id]: value,
    });
  };

  //Additional Product
  const handleAddProduct = () => {
    setProductCount(() => productCount + 1);
    setProduct([
      ...product,
      {
        serialNum: "",
        checkSerialResult: null,
        serialResult: null,
        purchaseDate: defaultDate.format("DD-MM-YYYY"),
        sellerName: "",
      },
    ]);
  };

  //Cancel Product
  const handleCancelProduct = (productToRemove) => {
    if (productCount > 1) {
      setProductCount(() => productCount - 1);
      setProduct((prevProducts) =>
        prevProducts.filter((_, index) => index !== productToRemove)
      );
    }
  };

  //Upload Image or PDF
  const handlePDFImageUpload = async (e) => {
    const file = e.target.files[0];
  
    try {
      const compressingFile = await compressFile(file);
      setSelectedFile(compressingFile);
    } catch (error) {
      console.error('Error handling PDF image upload:', error);
    }
  };

  //If Serial Number Change Set New Serial Number and Need to Check Again
  const handleSerialNumberChange = (newSerialNumber, changeToNull, index) => {
    setProduct((prevProducts) => {
      const updatedProducts = [...prevProducts];
      updatedProducts[index] = {
        ...updatedProducts[index],
        serialNum: newSerialNumber,
        checkSerialResult: changeToNull,
      };
      return updatedProducts;
    });
  };

  //Change DateOfPurchase
  const handleDateOfPurChaseChange = (newDate, index) => {
    setProduct((prevProducts) => {
      const updatedProducts = [...prevProducts];
      updatedProducts[index] = {
        ...updatedProducts[index],
        purchaseDate: moment(newDate._d).format("DD-MM-YYYY"),
      };
      return updatedProducts;
    });
  };

  //Seller Name Change
  const handleSellerNameChange = (newSellerName, index) => {
    setProduct((prevProducts) => {
      const updatedProducts = [...prevProducts];
      updatedProducts[index] = {
        ...updatedProducts[index],
        sellerName: newSellerName,
      };
      return updatedProducts;
    });
  };

  //If Not Found Serial Number need to Insert Product_name
  const handleNotFoundSerialNumber = (newProductName,index) => {
    setProduct((prevProducts) => {
      const updatedProducts = [...prevProducts];
      updatedProducts[index] = {
        ...updatedProducts[index],
        serialResult: {product_name : newProductName},
      };
      return updatedProducts;
    });
  }
  
  //Check Serial Number
  const handleCheckSerialNumber = async(serialnumber, index) => {
    const token = await checkAndRefresh();
    axios
      .get(
        "http://localhost:3001/checkserialnumber?serialnumber=" +
          (serialnumber || "")
      ,{
        headers : {
          Authorization: `Bearer ${token}`
        }
      })
      .then((response) => {
        console.log(response)
        setProduct((prevProducts) => {
          const updatedProducts = [...prevProducts];
          updatedProducts[index] = {
            ...updatedProducts[index],
            checkSerialResult: response.data.exists,
            serialResult: response.data.result[0],
          };
          return updatedProducts;
        });
      })
      .catch((error) => {
        console.error("Error Getting data:", error);
      });
  };

  //Open PDF and Image
  const openPDFImageInNewTab = (file) => {
    if (file) {
      const imagePDFUrl = URL.createObjectURL(file);
      window.open(imagePDFUrl);
    }
  };

  //Checking Insert All Fields Or Not
  const handleCheckingRegisProduct = (event) => {
    event.preventDefault();
    if (
      !fullName ||
      !email ||
      !phone ||
      !address.address ||
      !address.address2 ||
      !address.city ||
      !address.postcode ||
      !address.country ||
      !selectedFile
    ) {
      alert("Please full in all required Fields");
      return;
    }

    let missingFields = false;

    product.forEach((item) => {
      if (!item.serialNum || !item.purchaseDate || !item.sellerName || !item.serialResult.product_name) {
        missingFields = true;
        alert("Some products have missing fields");
      } else if (item.checkSerialResult === null) {
        missingFields = true;
        alert("Please Check Your Serial Number");
        return;
      }
    });

    if (!missingFields) {
      handleRegisProductPage("registed");
      regisProduct();
      alert("Success Registered");
    }
  };
 
  //Register The Product
  const regisProduct = async() => {
    const token = await checkAndRefresh();
    
    product.forEach((item) => {
      const formData = new FormData();
      formData.append("name", fullName);
      formData.append("email", email);
      formData.append("phone", phone);
      formData.append("address", address.address);
      formData.append("address2", address.address2);
      formData.append("city", address.city);
      formData.append("postcode", address.postcode);
      formData.append("country", address.country);
      formData.append("serialNum", item.serialNum);
      formData.append("productname", item.serialResult.product_name);
      formData.append("kplus", item.serialResult.kplus);
      formData.append("warrantyExpiredDate", moment(item.serialResult.date_manufacture).format("DD-MM-YYYY"));
      formData.append("purchaseDate", item.purchaseDate);
      formData.append("sellerName", item.sellerName);
      formData.append("registerDate", moment().format("DD-MM-YYYY"));
      formData.append("uid", user?.uid);
      formData.append("file", selectedFile);

      axios
        .post("http://localhost:3001/regisProduct", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`
          },
        })
        .then(() => {
          console.log("Sending Success");
        })
        .catch((error) => {
          console.error("Error sending data:", error);
        });
    });
  };

  const compressFile = async (file) => {
    try {
      if (file.type.startsWith('image/')) {
        // Compress image
        const compressedBlob = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 400,
          outputFormat: 'jpg',
        });
  
        const compressedFile = new File([compressedBlob], file.name, {
          type: compressedBlob.type,
          lastModified: Date.now(),
        });
  
        return compressedFile;

      } else if (file.type === 'application/pdf') {
        // Compress PDF
        const pdfBytes = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(pdfBytes);
  
        // Compress the PDF (example: saving it again)
        const compressedPdfBytes = await pdfDoc.save();
  
        const compressedPdfFile = new File([compressedPdfBytes], file.name, {
          type: 'application/pdf',
          lastModified: Date.now(),
        });
  
        return compressedPdfFile;
      } else {
        // Unsupported file type, return the original file
        return file;
      }
    } catch (error) {
      console.error('Error compressing file:', error);
      throw error; // Rethrow the error to handle it in the caller
    }
  };

  return (
    <>
      <div className="overlay">
        <div className="overlay-content">
          <div className="regisProduct">
            <h1>Register Product</h1>
            <h3>Contact Information</h3>
            <div className="flex-container">
              <div>
                <TextField
                  label="Full Name"
                  id="fname"
                  size="small"
                  style={{ width: "40ch" }}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div>
                <TextField
                  label="Email"
                  id="email"
                  size="small"
                  type="email"
                  style={{ width: "40ch" }}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <TextField
                  label="Phone"
                  id="phone"
                  size="small"
                  type="tel"
                  style={{ width: "40ch" }}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div>
                <TextField
                  label="Address"
                  id="address"
                  size="small"
                  type="address"
                  style={{ width: "40ch" }}
                  onChange={handleInputAddressChange}
                  required
                />
              </div>
              <div>
                <TextField
                  label="Address 2"
                  id="address2"
                  size="small"
                  type="address"
                  style={{ width: "40ch" }}
                  onChange={handleInputAddressChange}
                  required
                />
              </div>
              <div>
                <TextField
                  label="City"
                  id="city"
                  size="small"
                  type="address"
                  style={{ width: "40ch" }}
                  onChange={handleInputAddressChange}
                  required
                />
              </div>
              <div>
                <TextField
                  label="Postal Code"
                  id="postcode"
                  size="small"
                  type="text"
                  style={{ width: "40ch" }}
                  onChange={handleInputAddressChange}
                  required
                />
              </div>
              <div>
                <TextField
                  label="Country"
                  id="country"
                  size="small"
                  type="text"
                  style={{ width: "40ch" }}
                  onChange={handleInputAddressChange}
                  required
                />
              </div>
            </div>
            {product.map((product, index) => (
              <div key={index}>
                <div
                  style={{
                    border: "3px solid black",
                    borderRadius: "10px",
                    padding: "15px",
                    width: "42%",
                    marginTop: "10px",
                  }}
                >
                  <h3>Product Information {index + 1}</h3>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div>
                      <TextField
                        label="Serial Number"
                        id={`serialNum-${index}`}
                        size="small"
                        type="text"
                        style={{ width: "40ch" }}
                        onChange={(e) => {
                          handleSerialNumberChange(e.target.value, null, index);
                        }}
                        required
                        InputProps={{
                          endAdornment: (
                            <>
                              {product.checkSerialResult === true && (
                                <CheckCircleIcon style={{ color: "green" }} />
                              )}
                              {product.checkSerialResult === false && (
                                <ReportProblemIcon
                                  style={{ color: "orange" }}
                                />
                              )}
                              {product.checkSerialResult === null && (
                                <CancelIcon style={{ color: "red" }} />
                              )}
                            </>
                          ),
                        }}
                      />
                      <Button
                        variant="contained"
                        size="small"
                        style={{ width: "130px", height: "40px" }}
                        onClick={() =>
                          handleCheckSerialNumber(product.serialNum, index)
                        }
                      >
                        Check Serial Number
                      </Button>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        marginTop: "10px",
                        marginBottom: "10px",
                      }}
                    >
                      {product.checkSerialResult === true && (
                        <div
                          style={{
                            border: "1px solid #ccc",
                            borderRadius: "5px",
                            padding: "10px",
                            marginTop: "10px",
                            width: "50%",
                          }}
                        >
                          <div
                            style={{
                              marginBottom: "5px",
                              fontWeight: "bold",
                            }}
                          >
                            Serial Number: {product.serialResult.serialnumber}
                          </div>
                          <div>
                            Product Name: {product.serialResult.product_name}
                          </div>
                          <div>
                            Warranty Expired Date:{" "}
                            {moment(
                              product.serialResult.date_manufacture
                            ).format("DD-MM-YYYY")}
                          </div>
                          <div>
                            K Plus: {product.serialResult.kplus ? "Yes" : "No"}
                          </div>
                        </div>
                      )}
                      {product.checkSerialResult === false && (
                        <div>
                          <div
                            style={{
                              textAlign: "left",
                              width: "70%",
                              fontWeight: "bold",
                            }}
                          >
                            Serial Number is not found in our records, please
                            check its accuracy. Provide more details if it's
                            correct. We'll investigate further. Thank you!
                          </div>
                          <div>
                            <TextField
                              label="Product Name"
                              id="productname"
                              size="small"
                              type="text"
                              style={{
                                marginTop: "10px",
                                width: "40ch",
                                textAlign: "center",
                              }}
                              onChange={(e) => handleNotFoundSerialNumber(e.target.value,index)}
                              required
                          
                            />
                          </div>
                        </div>
                      )}
                      {product.checkSerialResult === null && (
                        <div
                          style={{
                            textAlign: "right",
                            width: "41%",
                            fontWeight: "bold",
                          }}
                        >
                          Please Check Serial Number
                        </div>
                      )}
                    </div>

                    <div>
                      Date of Purchase :
                      <div className="datepicker-overlay">
                        <DatePicker
                          defaultValue={defaultDate}
                          onChange={(newDate) =>
                            handleDateOfPurChaseChange(newDate, index)
                          }
                          format="DD/MM/YYYY"
                          PopperProps={{
                            placement: "right-end",
                          }}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <TextField
                        label="Reseller Name"
                        id="sellerName"
                        size="small"
                        type="text"
                        style={{
                          marginBottom: "10px",
                          width: "40ch",
                        }}
                        onChange={(e) =>
                          handleSellerNameChange(e.target.value, index)
                        }
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Button variant="contained" onClick={handleAddProduct}>
                      Add Additional Product
                    </Button>
                    {index === 0 ? null : (
                      <Button
                        variant="contained"
                        onClick={() => handleCancelProduct(index)}
                      >
                        Cancel Product
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <br />
            <div>
              <div>Upload Invoice in PDF or Image file :</div>
              <div style={{ display: "flex" , flexDirection:"column"}}>
                <div>
                  <Button
                    component="label"
                    variant="contained"
                    size="small"
                    startIcon={<CloudUploadIcon />}
                  >
                    Upload file
                    <VisuallyHiddenInput
                      type="file"
                      onChange={handlePDFImageUpload}
                      name="file"
                    />
                  </Button>
                </div>
                <div>
                  {selectedFile && (
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div>
                        <p>
                          Selected File:
                          <a
                            href="#"
                            onClick={() => openPDFImageInNewTab(selectedFile)}
                            style={{ marginLeft: "5px" }}
                          >
                            {selectedFile.name}
                          </a>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <br />
            <div>
              <Button
                variant="contained"
                type="submit"
                onClick={handleCheckingRegisProduct}
              >
                Submit
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  handleRegisProductPage("cancel");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
