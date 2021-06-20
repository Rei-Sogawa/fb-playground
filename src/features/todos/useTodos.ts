import { useEffect, useState } from "react";

import { db } from "../../firebaseApp";
import { Todo } from "../../models";
import useCollectionByChunk from "../../hooks/useCollectionByChunk";

const todosRef = db.collection("todos");

const useTodos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const { docs, hasMore, subscribeMore } = useCollectionByChunk({
    forwardOrderQuery: todosRef.orderBy("name", "asc"),
    reverseOrderQuery: todosRef.orderBy("name", "desc"),
    size: 5,
  });

  useEffect(() => {
    const _todos = docs.map((doc) => ({ id: doc.id, ref: doc.ref, ...doc.data() } as Todo));
    setTodos(_todos);
  }, [docs]);

  return {
    todos,
    hasMore,
    listenMore: subscribeMore,
  };
};

export default useTodos;
