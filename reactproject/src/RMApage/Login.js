import React, { useEffect, useState, useContext } from "react";
import AuthContext from "../context/AuthProvider";
import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import axios from "axios";

export function Login() {
  const { googleSignIn, user, setNewUser , setAccessToken } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  const waitForLoading = () => {
    setIsLoading(true);
    const delayRedirect = setTimeout(() => {
      setIsLoading(false);
    }, 2500);
    return () => clearTimeout(delayRedirect);
  };
  const handleGoogleSignIn = async () => {
    try {
      await googleSignIn();
    } catch (error) {
      if (error.code === "auth/cancelled-popup-request") {
        console.log("Authentication popup was canceled by the user.");
      } else {
        console.error("Error signing in with Google:", error);
      }
    }
  };

  useEffect(() => {
    waitForLoading();

    if (user !== null) {
      axios
        .post("http://localhost:3001/loginInformation", {
          email: user?.email,
          name: user?.displayName,
          uid: user?.uid,
        })
        .then((response) => {
          setAccessToken(response.data.accessToken)
          if (response.data.affectedRows) {
            setNewUser(true);
            navigate("/home");
          } else {
            navigate("/home");
          }
        })
        .catch((error) => {
          console.error("Error getting UID:", error);
        });
    }
  }, [user]);

  return (
    <>
      <div>
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: "30px",
            }}
          >
            <div>
              <h1>Login Page</h1>
              <Button
                variant="contained"
                size="large"
                style={{ width: "300px" }}
                onClick={() => handleGoogleSignIn()}
              >
                Sign In With Google
              </Button>
            </div>
            <div style={{ fontSize: "13px" }}>
              By signing up,you agree to our Terms and
              <br /> Conditions and that you have read our Privacy Policy
            </div>
          </div>
        )}
      </div>
    </>
  );
}
