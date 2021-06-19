import React, { useEffect, useRef, useState } from "react";
import { useMount, useUnmount } from "react-use";
import InfiniteScroll from "react-infinite-scroller";
import { sortBy } from "lodash-es";

import { db } from "../firebaseApp";
import { Todo } from "../models";
import useReactivePagination from "../hooks/useReactivePagination";

const todosRef = db.collection("todos");

const Todos = () => {
  const { todos, hasMore, listenMore } = useTodos();
  const scrollParentRef = useRef(null);
  return (
    <div>
      <TodoNewForm />
      <br />
      <div
        style={{ height: "300px", width: "400px", border: "dotted", overflowY: "auto" }}
        ref={scrollParentRef}
      >
        <InfiniteScroll
          pageStart={0}
          loadMore={listenMore}
          hasMore={hasMore}
          useWindow={false}
          getScrollParent={() => scrollParentRef.current}
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
    </div>
  );
};

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

const useTodos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [calledListen, setCalledListen] = useState(false);
  const [calling, setCalling] = useState(false);

  const { docs, boundary, hasMore, listen, listenMore, detachListeners } = useReactivePagination({
    forwardOrderQuery: todosRef.orderBy("name", "asc"),
    reverseOrderQuery: todosRef.orderBy("name", "desc"),
    size: 5,
  });

  useMount(() => listen().then(() => setCalledListen(true)));
  useUnmount(() => detachListeners());

  useEffect(() => {
    const _todos = docs.map((doc) => ({ id: doc.id, ref: doc.ref, ...doc.data() } as Todo));
    setTodos(sortBy(_todos, "name"));
  }, [docs]);

  useEffect(() => {
    // listen 実行タイミングで、query を満たすデータが firestore になかった場合
    if (calledListen && !boundary) {
      const listener = todosRef.orderBy("name", "asc").onSnapshot((snap) => {
        const _todos = snap.docs.map(
          (doc) => ({ id: doc.id, ref: doc.ref, ...doc.data() } as Todo)
        );
        setTodos(sortBy(_todos, "name"));
      });
      return listener;
    }
  }, [calledListen, boundary]);

  const listenMoreSync = async () => {
    if (calling) return;
    setCalling(true);
    await listenMore();
    setCalling(false);
  };

  return {
    todos,
    hasMore,
    listenMore: listenMoreSync,
  };
};

export default Todos;
