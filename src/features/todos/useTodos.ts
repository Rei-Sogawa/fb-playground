import { useEffect, useState } from "react";
import { useMount, useUnmount } from "react-use";
import { sortBy } from "lodash-es";

import { db } from "../../firebaseApp";
import { Todo } from "../../models";
import useReactivePagination from "../../hooks/useReactivePagination";

const todosRef = db.collection("todos");

const useTodos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [calledListen, setCalledListen] = useState(false);
  const [calling, setCalling] = useState(false);

  const { docs, boundary, hasMore, listen, listenMore, detachListeners } = useReactivePagination({
    forwardOrderQuery: todosRef.orderBy("name", "asc"),
    reverseOrderQuery: todosRef.orderBy("name", "desc"),
    size: 5,
  });

  useMount(() => {
    setCalling(true);
    listen()
      .then(() => setCalledListen(true))
      .finally(() => setCalling(false));
  });
  useUnmount(() => detachListeners());

  useEffect(() => {
    const _todos = docs.map((doc) => ({ id: doc.id, ref: doc.ref, ...doc.data() } as Todo));
    setTodos(sortBy(_todos, "name"));
  }, [docs]);

  useEffect(() => {
    // listen 実行タイミングで、query を満たすデータが firestore になかった場合は全購読する
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

export default useTodos;
