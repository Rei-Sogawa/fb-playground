import React, { useEffect, useState } from "react";
import { db } from "./firebaseApp";
import firebase from "firebase/app";
import "firebase/firestore";
// import ComposeProviders from "./context/ComposeProviders";
// import { CounterProvider, useCounter } from "./context/Counter";

import useReactivePagination from "./hooks/useReactivePagination";

import { Todo } from "./models";

const todosRef = db.collection("todos");

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);

  // useEffect(() => {
  //   const unsubscribe = todosRef.onSnapshot((snap) => {
  //     const newTodos = snap.docs.map((doc) => ({
  //       id: doc.id,
  //       ref: doc.ref,
  //       ...doc.data(),
  //     })) as Todo[];
  //     setTodos(newTodos);
  //   });
  //   return unsubscribe;
  // }, []);

  const addTodo = async () => {
    await todosRef.add({
      name,
    });
    setName("");
  };

  const [name, setName] = useState("");

  const { docs, listenDocs, listenMoreDocs, detachListeners } =
    useReactivePagination(
      todosRef.orderBy("name", "asc"),
      todosRef.orderBy("name", "desc"),
      5,
      (a: any, b: any) => a.name - b.name
    );

  useEffect(() => {
    listenDocs();
  }, []);

  useEffect(() => {
    setTodos(docs as Todo[]);
  }, [docs]);

  return (
    <div>
      <button onClick={listenMoreDocs}>listenMoreDocs</button>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addTodo();
        }}
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </form>

      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <div style={{ display: "flex", padding: "0.5rem 0" }}>
              <div style={{ marginRight: "1rem" }}>{todo.name}</div>
              <button onClick={() => todo.ref.delete()}>remove</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// function App() {
//   return (
//     <ComposeProviders providers={[CounterProvider]}>
//       <Counter />
//     </ComposeProviders>
//   );
// }

// function Counter() {
//   const { count, increment, decrement } = useCounter();
//   return (
//     <div>
//       <div>{count}</div>
//       <button onClick={increment}>increment</button>
//       <button onClick={decrement}>decrement</button>
//     </div>
//   );
// }

export default App;
