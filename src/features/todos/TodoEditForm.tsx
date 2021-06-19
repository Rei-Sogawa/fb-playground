import { useEffect, useState } from "react";

import { Todo } from "../../models";

const TodoEditForm = ({ todo }: { todo: Todo }) => {
  const [name, setName] = useState("");
  useEffect(() => setName(todo.name), [todo.name]);
  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    await todo.ref.update({ name });
  };
  return (
    <form onSubmit={handleSubmit}>
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
    </form>
  );
};

export default TodoEditForm;
