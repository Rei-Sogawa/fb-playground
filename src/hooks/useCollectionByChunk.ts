import firebase from "firebase/app";
import "firebase/firestore";
import { useEffect, useMemo, useReducer, useState } from "react";
import { useUnmount } from "react-use";

type State = {
  snaps: firebase.firestore.QuerySnapshot[];
  boundary?: firebase.firestore.DocumentData;
  listeners: (() => void)[];
  subscribing: boolean;
  subscribingMore: boolean;
};

type Action =
  | {
      type: "SUBSCRIBE";
    }
  | {
      type: "SUBSCRIBED";
      payload?: {
        boundary: firebase.firestore.DocumentData;
        idx: number;
        listener: () => void;
      };
    }
  | {
      type: "SUBSCRIBE_MORE";
    }
  | {
      type: "SUBSCRIBED_MORE";
      payload?: {
        boundary: firebase.firestore.DocumentData;
        idx: number;
        listener: () => void;
      };
    }
  | {
      type: "UPDATE_SNAP";
      payload: {
        idx: number;
        snap: firebase.firestore.QuerySnapshot;
      };
    }
  | {
      type: "DETACH_LISTENERS";
    };

const initialState: State = {
  snaps: [],
  boundary: undefined,
  listeners: [],
  subscribing: false,
  subscribingMore: false,
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "SUBSCRIBE": {
      if (state.subscribing) {
        return state;
      } else {
        return { ...state, subscribing: true };
      }
    }
    case "SUBSCRIBED": {
      if (action.payload) {
        const { boundary, idx, listener } = action.payload;
        const prevListener = state.listeners[idx];
        if (prevListener) prevListener();
        return {
          ...state,
          boundary,
          listeners: [
            ...state.listeners.slice(0, idx),
            listener,
            ...state.listeners.slice(idx + 1),
          ],
          subscribing: false,
        };
      } else {
        return { ...state, subscribing: false };
      }
    }
    case "SUBSCRIBE_MORE": {
      if (
        state.subscribing ||
        state.subscribingMore ||
        state.snaps.length !== state.listeners.length
      ) {
        return state;
      } else {
        return { ...state, subscribingMore: true };
      }
    }
    case "SUBSCRIBED_MORE": {
      if (action.payload) {
        const { boundary, idx, listener } = action.payload;
        const prevListener = state.listeners[idx];
        if (prevListener) prevListener();
        return {
          ...state,
          boundary,
          listeners: [
            ...state.listeners.slice(0, idx),
            listener,
            ...state.listeners.slice(idx + 1),
          ],
          subscribingMore: false,
        };
      } else {
        return { ...state, subscribingMore: false };
      }
    }
    case "UPDATE_SNAP": {
      const { idx, snap } = action.payload;
      return {
        ...state,
        snaps: [...state.snaps.slice(0, idx), snap, ...state.snaps.slice(idx + 1)],
      };
    }
    case "DETACH_LISTENERS": {
      state.listeners.forEach((listener) => listener());
      return {
        ...state,
        listeners: [],
      };
    }
    default: {
      return state;
    }
  }
};

const useCollectionByChunk = ({
  forwardOrderQuery,
  reverseOrderQuery,
  size,
}: {
  forwardOrderQuery: firebase.firestore.Query;
  reverseOrderQuery: firebase.firestore.Query;
  size: number;
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { snaps, boundary, subscribing, subscribingMore } = useMemo(() => state, [state]);
  const docs = useMemo(() => snaps.map((snap) => snap.docs.reverse()).flat(), [snaps]);

  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<firebase.firestore.FirestoreError>();

  useEffect(() => {
    if (subscribing) {
      const effect = async () => {
        const forwardOrderSnap = await forwardOrderQuery.limit(size).get();
        const _boundary = forwardOrderSnap.docs[forwardOrderSnap.docs.length - 1];
        if (!_boundary) {
          dispatch({ type: "SUBSCRIBED" });
          return;
        }
        const idx = 0;
        const listener = reverseOrderQuery
          .startAt(_boundary)
          .onSnapshot(
            (snap) => dispatch({ type: "UPDATE_SNAP", payload: { idx, snap } }),
            setError
          );
        dispatch({ type: "SUBSCRIBED", payload: { boundary: _boundary, idx, listener } });
      };
      effect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribing]);

  useEffect(() => {
    if (subscribingMore) {
      const effect = async () => {
        const forwardOrderSnap = await forwardOrderQuery.startAfter(boundary).limit(size).get();
        const prevBoundary = boundary;
        const _boundary = forwardOrderSnap.docs[forwardOrderSnap.docs.length - 1];
        if (!_boundary) {
          dispatch({ type: "SUBSCRIBED_MORE" });
          return;
        }
        const idx = snaps.length;
        const listener = reverseOrderQuery
          .startAt(_boundary)
          .endBefore(prevBoundary)
          .onSnapshot(
            (snap) => dispatch({ type: "UPDATE_SNAP", payload: { idx, snap } }),
            setError
          );
        dispatch({
          type: "SUBSCRIBED_MORE",
          payload: {
            boundary: _boundary,
            idx,
            listener,
          },
        });
      };
      effect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribingMore]);

  useEffect(() => {
    if (boundary) {
      return forwardOrderQuery
        .startAfter(boundary)
        .limit(1)
        .onSnapshot((snap) => setHasMore(snap.docs.length === 1));
    } else {
      return forwardOrderQuery.limit(1).onSnapshot((snap) => {
        if (snap.docs.length === 1) dispatch({ type: "SUBSCRIBE" });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundary]);

  useUnmount(() => dispatch({ type: "DETACH_LISTENERS" }));

  const subscribeMore = () => dispatch({ type: "SUBSCRIBE_MORE" });

  return {
    docs,
    boundary,
    hasMore,
    error,
    subscribeMore,
  };
};

export default useCollectionByChunk;
