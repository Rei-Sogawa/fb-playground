process.env["GCLOUD_PROJECT"] = "playground-67a20";
process.env["FIRESTORE_EMULATOR_HOST"] = "localhost:8080";

const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();
const todosRef = db.collection("todos");

module.exports = { db, todosRef };

const main = async () => {
  await require("./set-todos")();
};

main().catch((err) => console.error(err));
