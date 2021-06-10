import firebase from "firebase/app";
import "firebase/firestore";
import "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDKZpdYcX5iTLqoNW5XMSEac02jDyr5yLE",
  authDomain: "playground-67a20.firebaseapp.com",
  projectId: "playground-67a20",
  storageBucket: "playground-67a20.appspot.com",
  messagingSenderId: "1008914470267",
  appId: "1:1008914470267:web:77fc11d8586398920bd9de",
  measurementId: "G-P2RHN4186V",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const db = firebase.firestore();
export const auth = firebase.auth();

if (process.env.REACT_APP_USE_FIRESTORE_EMULATOR === "TRUE")
  db.useEmulator("localhost", 8080);
if (process.env.REACT_APP_USE_AUTH_EMULATOR === "TRUE")
  auth.useEmulator("http://localhost:9099");
