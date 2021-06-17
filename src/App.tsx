import React, { useEffect, useState } from "react";
import { db } from "./firebaseApp";
import { useMount, useUnmount } from "react-use";
import InfiniteScroll from "react-infinite-scroller";
import { sortBy } from "lodash-es";

import useReactivePagination from "./hooks/useReactivePagination";

import { Todo } from "./models";

const todosRef = db.collection("todos");

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);

  const { updating, hasMore, docSnaps, listen, listenMore, detachListeners } =
    useReactivePagination({
      forwardOrderQuery: todosRef.orderBy("name", "asc"),
      reverseOrderQuery: todosRef.orderBy("name", "desc"),
      size: 5,
    });

  useMount(() => listen());
  useUnmount(() => detachListeners());

  useEffect(() => {
    const todos = sortBy(
      docSnaps.map(
        (docSnap) =>
          ({
            id: docSnap.id,
            ref: docSnap.ref,
            ...docSnap.data(),
          } as Todo)
      ),
      "name"
    );
    setTodos(todos);
  }, [docSnaps]);

  const handleLoadMore = async () => {
    if (updating) return;
    await listenMore();
  };

  const [name, setName] = useState("");
  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    await todosRef.add({ name });
    setName("");
  };

  return (
    <div>
      <button onClick={listenMore}>listenMoreDocs</button>
      <form onSubmit={handleSubmit}>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </form>

      <InfiniteScroll pageStart={0} loadMore={handleLoadMore} hasMore={hasMore}>
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
  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    await todo.ref.update({ name });
    setName("");
  };
  return (
    <form onSubmit={handleSubmit}>
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
    </form>
  );
}

export default App;
