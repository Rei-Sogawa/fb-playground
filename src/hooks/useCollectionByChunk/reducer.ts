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
  hasMore: boolean;
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
    }
  | {
      type: "updateHasMore";
      payload: { hasMore: boolean };
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
  hasMore: false,
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
  const { forwardOrderQuery, reverseOrderQuery, size, snaps, listeners, subscribing } = state;
  if (subscribing) return;
  if (snaps.length !== 0 || listeners.length !== 0) return;

  dispatch({ type: "startSubscribe" });
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
  const { forwardOrderQuery, reverseOrderQuery, size, snaps, boundary, listeners, subscribing } =
    state;
  if (subscribing) return;
  if (!boundary) return;
  if (snaps.length === 0 || listeners.length === 0 || snaps.length !== listeners.length) return;

  dispatch({ type: "startSubscribe" });
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

const watchNextDoc = (dispatch: Dispatch<Action>, state: State) => {
  return state.forwardOrderQuery
    .startAfter(state.boundary)
    .limit(1)
    .onSnapshot(
      (snap) => dispatch({ type: "updateHasMore", payload: { hasMore: snap.docs.length === 1 } }),
      (error) => dispatch({ type: "catchError", payload: { error } })
    );
};

const watchFirstDoc = (dispatch: Dispatch<Action>, state: State) => {
  return state.forwardOrderQuery.limit(1).onSnapshot(
    (snap) => snap.docs.length === 1 && subscribe(dispatch, state),
    (error) => dispatch({ type: "catchError", payload: { error } })
  );
};

export const action = {
  subscribe,
  subscribeMore,
  watchNextDoc,
  watchFirstDoc,
};

const docs = (snaps: State["snaps"]) => snaps.map((snap) => snap.docs.reverse()).flat();

export const selector = {
  docs,
};
