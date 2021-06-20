import { useEffect, useState } from "react";
import { useMount, useUnmount } from "react-use";

import { db } from "../../firebaseApp";
import { Todo } from "../../models";
import useCollectionByChunk from "../../hooks/useCollectionByChunk";

const todosRef = db.collection("todos");

const useTodos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const { docs, boundary, hasMore, listen, listenMore, detachListeners } = useCollectionByChunk({
    forwardOrderQuery: todosRef.orderBy("name", "asc"),
    reverseOrderQuery: todosRef.orderBy("name", "desc"),
    size: 5,
  });
  const [calledListen, setCalledListen] = useState(false);

  useMount(() => {
    listen();
    setCalledListen(true);
  });
  useUnmount(() => detachListeners());

  useEffect(() => {
    const _todos = docs.map((doc) => ({ id: doc.id, ref: doc.ref, ...doc.data() } as Todo));
    setTodos(_todos);
  }, [docs]);

  useEffect(() => {
    console.log(boundary);
    console.log(calledListen);
  }, [boundary, calledListen]);

  return {
    todos,
    hasMore,
    listenMore,
  };
};

export default useTodos;
