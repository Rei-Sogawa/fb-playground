import firebase from "firebase/app";
import "firebase/firestore";

export * from "./todo";

export type IdAndRef = {
  id: string;
  ref: firebase.firestore.DocumentReference<firebase.firestore.DocumentData>;
};
