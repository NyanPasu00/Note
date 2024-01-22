import { Button } from "@mui/material";
import axios from "axios";
import React, { useState } from "react";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import styled from "@emotion/styled";

axios.defaults.withCredentials = true;
export function Nodemailer() {
  const [subject, setSubject] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [text, setText] = useState("");

  const VisuallyHiddenInput = styled("input")({
    clip: "rect(0 0 0 0)",
    clipPath: "inset(50%)",
    height: 1,
    overflow: "hidden",
    position: "absolute",
    bottom: 0,
    left: 0,
    whiteSpace: "nowrap",
    width: 1,
  });

  const [selectedFiles, setSelectedFiles] = useState([]);

  const handlePDFImageUpload = (e) => {
    const files = e.target.files;
    setSelectedFiles([...selectedFiles, ...files]);
  };
  
  const sendEmail = async () => {
    const formData = new FormData();
    formData.append("subject", subject);
    formData.append("toEmail", toEmail);
    formData.append("text", text);
    selectedFiles.forEach((file) => {
      formData.append('selectedFiles', file);
    });

    try {
      const response = await axios.post(
        "http://localhost:3002/sendemail",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
    } catch (error) {
      console.error("Error sending email:", error);
    }
  };
  return (
    <>
      <div>
        <label htmlFor="name">Subject:</label>
        <input
          type="text"
          id="name"
          name="name"
          placeholder="Enter your Subject"
          required
          onChange={(e) => setSubject(e.target.value)}
        />
        <br />

        <label htmlFor="email">Enter Email Want to Send:</label>
        <input
          type="email"
          id="email"
          name="email"
          placeholder="Enter your email"
          required
          onChange={(e) => setToEmail(e.target.value)}
        />
        <br />

        <label htmlFor="password">Text :</label>
        <input
          type="text"
          id="text"
          name="text"
          placeholder="Enter your text"
          required
          onChange={(e) => setText(e.target.value)}
        />
        <br />
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
              name="selectedFiles"
              multiple
            />
          </Button>
        </div>
        <div>
          <button type="button" onClick={sendEmail}>
            Send Email
          </button>
        </div>
      </div>
    </>
  );
}
