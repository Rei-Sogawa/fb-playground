import { useState } from "react";

import { db } from "../../firebaseApp";

const todosRef = db.collection("todos");

const TodoNewForm = () => {
  const [name, setName] = useState("");
  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    await todosRef.add({ name });
    setName("");
  };
  return (
    <form onSubmit={handleSubmit}>
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
    </form>
  );
};

export default TodoNewForm;
