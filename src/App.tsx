import React, { useEffect, useRef, useState } from "react";
import { db } from "./firebaseApp";
import { useUnmount } from "react-use";
import InfiniteScroll from "react-infinite-scroller";

import useReactivePagination from "./hooks/useReactivePagination";

import { Todo } from "./models";

const todosRef = db.collection("todos");

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);

  const addTodo = async () => {
    await todosRef.add({
      name,
    });
    setName("");
  };

  const [name, setName] = useState("");

  const {
    docs,
    loading,
    hasMoreDocs,
    listenDocs,
    listenMoreDocs,
    detachListeners,
  } = useReactivePagination(
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

  useUnmount(() => detachListeners());

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

      <InfiniteScroll
        pageStart={0}
        loadMore={(page) => {
          console.log(page);
          listenMoreDocs();
        }}
        hasMore={hasMoreDocs && !loading}
        loader={<div key="loader">Loading ...</div>}
      >
        <ul>
          {todos.map((todo) => (
            <li key={todo.id}>
              <div
                style={{
                  display: "flex",
                  padding: "0.5rem 0",
                }}
              >
                <div style={{ marginRight: "1rem" }}>{todo.name}</div>
                <div style={{ marginRight: "1rem" }}>
                  <TodoEditForm todo={todo} />
                </div>
                <button onClick={() => todo.ref.delete()}>remove</button>
              </div>
            </li>
          ))}
        </ul>
      </InfiniteScroll>
    </div>
  );
}

function TodoEditForm({ todo }: { todo: Todo }) {
  const [name, setName] = useState(todo.name);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        todo.ref.update({ name });
      }}
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
    </form>
  );
}

export default App;
