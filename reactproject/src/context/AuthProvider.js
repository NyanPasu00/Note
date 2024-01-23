import { createContext, useEffect, useState } from "react";
import { signOut, onAuthStateChanged, signInWithRedirect } from "firebase/auth";
import { auth, provider } from "../firebase";
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

  const refreshingToken = () => {
    axios
      .post("http://localhost:4000/refreshToken")
      .then((response) => {
        if (response.data.expired) {
          return logOut();
        }
        setAccessToken(response.data.accessToken);
        return response.data.accessToken;
      })
      .catch((error) => {
        console.error("Error refreshing token:", error);
      });
  };
  const checkingTokenExpired = async () => {
    try {
      const response = await axios.post(
        "http://localhost:4000/checkingExpired",
        {
          accessToken: accessToken,
        }
      );

      if (response.data && response.data.refresh !== undefined) {
        return response.data.refresh;
      } else {
        console.error("Invalid response format:", response.data);
      }
    } catch (error) {
      console.error("Error checking token expiration:", error.message);
    }
  };
  const checkAndRefresh = async () => {
    const isTokenExpired = await checkingTokenExpired();

    if (isTokenExpired) {
      const newAccessToken = refreshingToken();
      console.log("Refresh");
      return newAccessToken;
    } else {
      console.log("AccessToken is still valid");
      return accessToken;
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
