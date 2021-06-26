import { useRef } from "react";
import InfiniteScroll from "react-infinite-scroller";

import TodoNewForm from "./TodoNewForm";
import TodoEditForm from "./TodoEditForm";

import useTodos from "./useTodos";

const Todos = () => {
  const { todos, hasMore, listenMore, reset } = useTodos();
  const scrollParentRef = useRef(null);
  return (
    <div>
      <button onClick={reset}>reset</button>
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

export default Todos;
