import { useEffect } from "react";
import { useState } from "react";
import { useMemo, useReducer } from "react";

import reducer, { initializer, asyncAction, State } from "./reducer";

const useCollectionByChunk = ({
  forwardOrderQuery,
  reverseOrderQuery,
  size,
}: Pick<State, "forwardOrderQuery" | "reverseOrderQuery" | "size">) => {
  const [state, dispatch] = useReducer(
    reducer,
    { forwardOrderQuery, reverseOrderQuery, size },
    initializer
  );
  const [hasMore, setHasMore] = useState(false);

  const subscribe = () => asyncAction.subscribe(dispatch, state);
  const subscribeMore = () => asyncAction.subscribeMore(dispatch, state);
  const reset = ({
    forwardOrderQuery,
    reverseOrderQuery,
    size,
  }: Pick<State, "forwardOrderQuery" | "reverseOrderQuery" | "size">) => {
    dispatch({ type: "detachListeners" });
    dispatch({ type: "initialize", payload: { forwardOrderQuery, reverseOrderQuery, size } });
  };

  const docs = useMemo(() => state.snaps.map((snap) => snap.docs.reverse()).flat(), [state.snaps]);

  useEffect(() => {
    if (state.boundary) {
      return state.forwardOrderQuery
        .startAfter(state.boundary)
        .limit(1)
        .onSnapshot((snap) => setHasMore(snap.docs.length === 1));
    } else {
      return state.forwardOrderQuery.limit(1).onSnapshot((snap) => {
        if (snap.docs.length === 1) subscribe();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.boundary]);

  useEffect(() => {
    return () => dispatch({ type: "detachListeners" });
  }, []);

  return {
    docs,
    subscribe,
    subscribeMore,
    hasMore,
    error: state.error,
    reset,
  };
};

export default useCollectionByChunk;
