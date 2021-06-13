import React, { useEffect, useState } from "react";
import { db } from "./firebaseApp";
import { useUnmount } from "react-use";
import InfiniteScroll from "react-infinite-scroller";
import { sortBy } from "lodash-es";

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

  const { queryDocSnaps, hasMore, listen, listenMore, detachListeners } =
    useReactivePagination({
      forwardOrderQuery: todosRef.orderBy("name", "asc"),
      reverseOrderQuery: todosRef.orderBy("name", "desc"),
      limit: 5,
    });

  useEffect(() => {
    listen();
  }, []);

  useEffect(() => {
    const todos = sortBy(
      queryDocSnaps.map(
        (queryDocSnap) =>
          ({
            id: queryDocSnap.id,
            ref: queryDocSnap.ref,
            ...queryDocSnap.data(),
          } as Todo)
      ),
      "name"
    );
    setTodos(todos);
  }, [queryDocSnaps]);

  useUnmount(() => detachListeners());

  const [loading, setLoading] = useState(false);
  const handleLoadMore = async () => {
    if (loading) return;
    setLoading(true);
    await listenMore();
    setLoading(false);
  };

  return (
    <div>
      <button onClick={listenMore}>listenMoreDocs</button>
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
