import { Dispatch } from "react";
import produce from "immer";
import firebase from "firebase/app";
import "firebase/firestore";

export type State = {
  forwardOrderQuery: firebase.firestore.Query;
  reverseOrderQuery: firebase.firestore.Query;
  size: number;
  snaps: firebase.firestore.QuerySnapshot[];
  boundary?: firebase.firestore.DocumentData;
  listeners: (() => void)[];
  subscribing: boolean;
  error?: firebase.firestore.FirestoreError;
};

type Action =
  | {
      type: "subscribed";
      payload: { boundary: firebase.firestore.DocumentData; idx: number; listener: () => void };
    }
  | {
      type: "updateSnap";
      payload: { idx: number; snap: firebase.firestore.QuerySnapshot };
    }
  | {
      type: "startSubscribe";
    }
  | {
      type: "finishSubscribe";
    }
  | {
      type: "catchError";
      payload: { error: firebase.firestore.FirestoreError };
    }
  | {
      type: "detachListeners";
    }
  | {
      type: "initialize";
      payload: Pick<State, "forwardOrderQuery" | "reverseOrderQuery" | "size">;
    };

export const initializer = ({
  forwardOrderQuery,
  reverseOrderQuery,
  size,
}: Pick<State, "forwardOrderQuery" | "reverseOrderQuery" | "size">): State => ({
  forwardOrderQuery,
  reverseOrderQuery,
  size,
  snaps: [],
  boundary: undefined,
  listeners: [],
  subscribing: false,
  error: undefined,
});

const reducer = (draft: State, action: Action): State | void => {
  switch (action.type) {
    case "subscribed": {
      const { boundary, idx, listener } = action.payload;
      if (draft.listeners[idx]) draft.listeners[idx]();
      draft.boundary = boundary;
      draft.listeners[idx] = listener;
      return;
    }
    case "updateSnap": {
      const { idx, snap } = action.payload;
      draft.snaps[idx] = snap;
      return;
    }
    case "startSubscribe": {
      draft.subscribing = true;
      return;
    }
    case "finishSubscribe": {
      draft.subscribing = false;
      return;
    }
    case "catchError": {
      draft.error = action.payload.error;
      return;
    }
    case "detachListeners": {
      draft.listeners.forEach((listener) => listener());
      return;
    }
    case "initialize": {
      return initializer(action.payload);
    }
    default: {
      return;
    }
  }
};

export default produce(reducer);

const subscribe = async (dispatch: Dispatch<Action>, state: State) => {
  const { subscribing } = state;
  if (subscribing) return;

  dispatch({ type: "startSubscribe" });
  const { forwardOrderQuery, reverseOrderQuery, size } = state;
  const forwardOrderSnap = await forwardOrderQuery.limit(size).get();
  const boundary = forwardOrderSnap.docs[forwardOrderSnap.docs.length - 1];
  if (!boundary) {
    dispatch({ type: "finishSubscribe" });
    return;
  }

  const idx = 0;
  const listener = reverseOrderQuery.startAt(boundary).onSnapshot(
    (snap) => dispatch({ type: "updateSnap", payload: { idx, snap } }),
    (error) => dispatch({ type: "catchError", payload: { error } })
  );
  dispatch({ type: "subscribed", payload: { boundary, idx, listener } });
  dispatch({ type: "finishSubscribe" });
};

const subscribeMore = async (dispatch: Dispatch<Action>, state: State) => {
  const { subscribing } = state;
  if (subscribing) return;

  dispatch({ type: "startSubscribe" });
  const { forwardOrderQuery, reverseOrderQuery, size, snaps, boundary } = state;
  if (!boundary) {
    dispatch({ type: "finishSubscribe" });
    return;
  }
  const forwardOrderSnap = await forwardOrderQuery.startAfter(boundary).limit(size).get();
  const newBoundary = forwardOrderSnap.docs[forwardOrderSnap.docs.length - 1];
  if (!newBoundary) {
    dispatch({ type: "finishSubscribe" });
    return;
  }

  const idx = snaps.length;
  const listener = reverseOrderQuery
    .startAt(newBoundary)
    .endBefore(boundary)
    .onSnapshot(
      (snap) => dispatch({ type: "updateSnap", payload: { idx, snap } }),
      (error) => dispatch({ type: "catchError", payload: { error } })
    );
  dispatch({ type: "subscribed", payload: { boundary: newBoundary, idx, listener } });
  dispatch({ type: "finishSubscribe" });
};

export const asyncAction = {
  subscribe,
  subscribeMore,
};
