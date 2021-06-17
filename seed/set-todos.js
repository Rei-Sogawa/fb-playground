const { todosRef } = require("./index");
const faker = require("faker");

const setTodos = async () => {
  for (let i = 7; i < 500; i++) {
    await todosRef.add({ name: i.toString().padStart(3, 0) });
  }
};

module.exports = setTodos;
