
import { initializeApp } from "firebase/app";
import { getAuth ,GoogleAuthProvider} from "firebase/auth";


// const firebaseConfig = {
//   apiKey: process.env.API_KEY,
//   authDomain: process.env.AUTH_DOMAIN,
//   projectId: process.env.PROJECT_ID,
//   storageBucket: process.env.STORAGE_BUCKET,
//   messagingSenderId: process.env.MESSAGING_SENDER_ID,
//   appId: process.env.APP_ID
// };

const firebaseConfig = {
  apiKey: "AIzaSyAePx7On3NL9x1g7DVV0O8O1Q3ug4pPCZg",
  authDomain: "auth-testing-fb441.firebaseapp.com",
  projectId: "auth-testing-fb441",
  storageBucket: "auth-testing-fb441.appspot.com",
  messagingSenderId: "980890206862",
  appId: "1:980890206862:web:6d5f2e8c9d664ff89e7fdf"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
export {auth,provider};