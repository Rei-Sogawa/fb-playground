import firebase from "firebase/app";
import "firebase/firestore";
import { useMemo } from "react";
import { useEffect, useState, useReducer } from "react";

type State = {
  snaps: firebase.firestore.QuerySnapshot[];
  boundary?: firebase.firestore.DocumentData;
  listeners: (() => void)[];
  loading: boolean;
  loadingMore: boolean;
};

type Action =
  | {
      type: "LISTEN";
    }
  | {
      type: "FINISH_LISTEN";
      payload?: {
        boundary: firebase.firestore.DocumentData;
        idx: number;
        listener: () => void;
      };
    }
  | {
      type: "LISTEN_MORE";
    }
  | {
      type: "FINISH_LISTEN_MORE";
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
  loading: false,
  loadingMore: false,
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "LISTEN": {
      return { ...state, loading: true };
    }
    case "FINISH_LISTEN": {
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
          loading: false,
        };
      } else {
        return { ...state, loading: false };
      }
    }
    case "LISTEN_MORE": {
      return { ...state, loadingMore: true };
    }
    case "FINISH_LISTEN_MORE": {
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
          loadingMore: false,
        };
      } else {
        return { ...state, loadingMore: false };
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
  const { snaps, boundary, listeners, loading, loadingMore } = useMemo(() => state, [state]);

  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<firebase.firestore.FirestoreError>();

  useEffect(() => {
    if (loading) {
      const effect = async () => {
        const forwardOrderSnap = await forwardOrderQuery.limit(size).get();
        const _boundary = forwardOrderSnap.docs[forwardOrderSnap.docs.length - 1];
        if (!_boundary) {
          dispatch({ type: "FINISH_LISTEN" });
          return;
        }
        const idx = 0;
        const listener = reverseOrderQuery
          .startAt(_boundary)
          .onSnapshot(
            (snap) => dispatch({ type: "UPDATE_SNAP", payload: { idx, snap } }),
            setError
          );
        dispatch({ type: "FINISH_LISTEN", payload: { boundary: _boundary, idx, listener } });
      };
      effect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    if (loadingMore) {
      const effect = async () => {
        const forwardOrderSnap = await forwardOrderQuery.startAfter(boundary).limit(size).get();
        const prevBoundary = boundary;
        const _boundary = forwardOrderSnap.docs[forwardOrderSnap.docs.length - 1];
        if (!_boundary) {
          dispatch({ type: "FINISH_LISTEN_MORE" });
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
          type: "FINISH_LISTEN_MORE",
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
  }, [loadingMore]);

  useEffect(() => {
    if (boundary) {
      return forwardOrderQuery
        .startAfter(boundary)
        .limit(1)
        .onSnapshot((snap) => setHasMore(snap.docs.length === 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundary]);

  const listen = () => dispatch({ type: "LISTEN" });
  const listenMore = () => {
    if (loading || loadingMore) return;
    if (snaps.length !== listeners.length) return;
    dispatch({ type: "LISTEN_MORE" });
  };
  const detachListeners = () => dispatch({ type: "DETACH_LISTENERS" });

  const docs = useMemo(() => snaps.map((snap) => snap.docs.reverse()).flat(), [snaps]);

  return {
    docs,
    boundary,
    hasMore,
    error,
    listen,
    listenMore,
    detachListeners,
  };
};

export default useCollectionByChunk;
