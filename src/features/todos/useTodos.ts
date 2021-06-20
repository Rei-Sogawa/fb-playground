import { useEffect, useState } from "react";
import { useMount, useUnmount } from "react-use";

import { db } from "../../firebaseApp";
import { Todo } from "../../models";
import useCollectionByChunk from "../../hooks/useCollectionByChunk";

const todosRef = db.collection("todos");

const useTodos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [calledListen, setCalledListen] = useState(false);

  const { docs, boundary, hasMore, listen, listenMore, detachListeners } = useCollectionByChunk({
    forwardOrderQuery: todosRef.orderBy("name", "asc"),
    reverseOrderQuery: todosRef.orderBy("name", "desc"),
    size: 5,
  });

  useMount(() => listen().then(() => setCalledListen(true)));
  useUnmount(() => detachListeners());

  useEffect(() => {
    const _todos = docs.map((doc) => ({ id: doc.id, ref: doc.ref, ...doc.data() } as Todo));
    setTodos(_todos);
  }, [docs]);

  useEffect(() => {
    // listen 実行タイミングで、query を満たすデータが firestore になかった場合は全購読する
    if (calledListen && !boundary) {
      const listener = todosRef.orderBy("name", "asc").onSnapshot((snap) => {
        const _todos = snap.docs.map(
          (doc) => ({ id: doc.id, ref: doc.ref, ...doc.data() } as Todo)
        );
        setTodos(_todos);
      });
      return listener;
    }
  }, [calledListen, boundary]);

  return {
    todos,
    hasMore,
    listenMore,
  };
};

export default useTodos;
