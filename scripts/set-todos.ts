import * as admin from "firebase-admin";
import * as faker from "faker";

import { TodoData } from "../src/fb/models";

admin.initializeApp();
const db = admin.firestore();
const todosRef = db.collection("todos");

console.log(faker.lorem.word());
