import { createContext, useEffect, useState } from "react";
import { signOut, onAuthStateChanged, signInWithRedirect } from "firebase/auth";
import { auth, provider } from "../firebase";
import imageCompression from "browser-image-compression";
import { PDFDocument } from "pdf-lib";
import styled from "@emotion/styled";
import axios from "axios";
const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [newUser, setNewUser] = useState(false);
  const [productData, setProductData] = useState({});
  const [allRmaInfo, setallRmaInfo] = useState({});
  const [accessToken, setAccessToken] = useState("");
  const infoSectionStyle = {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    marginBottom: 10,
  };

  const labelStyle = {
    marginRight: 10,
    fontWeight: "bold",
    minWidth: "150px",
  };
  const contentStyle = {
    display: "flex",
    alignItems: "center",
    marginBottom: "5px",
  };

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

  const googleSignIn = () => {
    signInWithRedirect(auth, provider);
  };

  const logOut = () => {
    axios
      .delete("http://localhost:4000/logout")
      .then(() => {
        console.log("Success Clear");
      })
      .catch((error) => {
        console.log(error);
      });

    signOut(auth);
  };

  const refreshingToken = async () => {
    try {
      const response = await axios.post("http://localhost:4000/refreshToken");

      if (response.data.expired) {
        await logOut();
      }

      const newToken = response.data.accessToken;
      setAccessToken(newToken);
      return newToken;
    } catch (error) {
      console.error("Error refreshing token:", error);
      throw error;
    }
  };
  const checkingTokenExpired = async () => {
    try {
      const response = await axios.post(
        "http://localhost:4000/checkingExpired",
        {
          accessToken: accessToken,
        }
      );

      return response.data.refresh;
    } catch (error) {
      console.error("Error checking token expiration:", error.message);
    }
  };
  const checkAndRefresh = async () => {
    const isTokenExpired = await checkingTokenExpired();

    if (isTokenExpired) {
      try {
        const newAccessToken = await refreshingToken();
        console.log("Refresh");
        return newAccessToken;
      } catch (error) {
        console.error("Error refreshing token:", error);
        // Handle the error if needed
      }
    } else {
      console.log("AccessToken is still valid");
      return accessToken;
    }
  };

  const compressFile = async (file) => {
    try {
      if (file.type.startsWith("image/")) {
        // Compress image
        const compressedBlob = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 400,
          outputFormat: "jpg",
        });

        const compressedFile = new File([compressedBlob], file.name, {
          type: compressedBlob.type,
          lastModified: Date.now(),
        });

        return compressedFile;
      } else if (file.type === "application/pdf") {
        // Compress PDF
        const pdfBytes = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(pdfBytes);

        // Compress the PDF (example: saving it again)
        const compressedPdfBytes = await pdfDoc.save();

        const compressedPdfFile = new File([compressedPdfBytes], file.name, {
          type: "application/pdf",
          lastModified: Date.now(),
        });

        return compressedPdfFile;
      }
    } catch (error) {
      console.error("Error compressing file:", error);
      throw error; // Rethrow the error to handle it in the caller
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => {
      unsubscribe();
    };
  }, []);
  return (
    <AuthContext.Provider
      value={{
        googleSignIn,
        logOut,
        user,
        newUser,
        setNewUser,
        productData,
        setProductData,
        allRmaInfo,
        setallRmaInfo,
        infoSectionStyle,
        labelStyle,
        contentStyle,
        VisuallyHiddenInput,
        accessToken,
        setAccessToken,
        checkAndRefresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
export default AuthContext;
