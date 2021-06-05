const { todosRef } = require("./index");
const faker = require("faker");

const setTodos = async () => {
  for (let i = 0; i < 10; i++) {
    await todosRef.add({ name: faker.lorem.word() });
  }
};

module.exports = setTodos;
