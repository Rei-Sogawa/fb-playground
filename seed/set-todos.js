const { todosRef } = require("./index");
const faker = require("faker");

const setTodos = async () => {
  for (let i = 0; i < 99; i++) {
    await todosRef.add({ name: i.toString().padStart(2, 0) });
  }
};

module.exports = setTodos;
