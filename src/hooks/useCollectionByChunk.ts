/* eslint-disable react-hooks/exhaustive-deps */

import firebase from "firebase/app";
import "firebase/firestore";
import { useEffect, useMemo, useReducer, useState } from "react";
import { useUnmount } from "react-use";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type State = {
  snaps: firebase.firestore.QuerySnapshot[];
  boundary?: firebase.firestore.DocumentData;
  listeners: (() => void)[];
  subscribing: boolean;
  subscribingMore: boolean;
};

const initialState: State = {
  snaps: [],
  boundary: undefined,
  listeners: [],
  subscribing: false,
  subscribingMore: false,
};

const collectionByChunk = createSlice({
  name: "collectionByChunk",
  initialState,
  reducers: {
    subscribe: (state) => {
      if (!state.subscribing) {
        state.subscribing = true;
      }
    },
    subscribed: (
      state,
      action: PayloadAction<
        | {
            boundary: firebase.firestore.DocumentData;
            idx: number;
            listener: () => void;
          }
        | undefined
      >
    ) => {
      if (action.payload) {
        const { boundary, idx, listener } = action.payload;
        if (state.listeners[idx]) state.listeners[idx]();
        state.boundary = boundary;
        state.listeners[idx] = listener;
      }
      state.subscribing = false;
    },
    subscribeMore: (state) => {
      if (
        !state.subscribing &&
        !state.subscribingMore &&
        state.snaps.length === state.listeners.length
      ) {
        state.subscribingMore = true;
      }
    },
    subscribedMore: (
      state,
      action: PayloadAction<
        | {
            boundary: firebase.firestore.DocumentData;
            idx: number;
            listener: () => void;
          }
        | undefined
      >
    ) => {
      if (action.payload) {
        const { boundary, idx, listener } = action.payload;
        if (state.listeners[idx]) state.listeners[idx]();
        state.boundary = boundary;
        state.listeners[idx] = listener;
      }
      state.subscribingMore = false;
    },
    updateSnap: (
      state,
      action: PayloadAction<{ idx: number; snap: firebase.firestore.QuerySnapshot }>
    ) => {
      const { idx, snap } = action.payload;
      state.snaps[idx] = snap;
    },
    detachListeners: (state) => {
      state.listeners.forEach((listener) => listener());
      state.listeners = [];
    },
  },
});

const { subscribe, subscribed, subscribeMore, subscribedMore, updateSnap, detachListeners } =
  collectionByChunk.actions;

const useCollectionByChunk = (options: {
  forwardOrderQuery: firebase.firestore.Query;
  reverseOrderQuery: firebase.firestore.Query;
  size: number;
}) => {
  const forwardOrderQuery = useMemo(() => options.forwardOrderQuery, []);
  const reverseOrderQuery = useMemo(() => options.reverseOrderQuery, []);
  const size = useMemo(() => options.size, []);

  const [state, dispatch] = useReducer(collectionByChunk.reducer, initialState);
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
          dispatch(subscribed());
          return;
        }
        const idx = 0;
        const listener = reverseOrderQuery
          .startAt(_boundary)
          .onSnapshot((snap) => dispatch(updateSnap({ idx, snap })), setError);
        dispatch(subscribed({ boundary: _boundary, idx, listener }));
      };
      effect();
    }
  }, [subscribing]);

  useEffect(() => {
    if (subscribingMore) {
      const effect = async () => {
        const forwardOrderSnap = await forwardOrderQuery.startAfter(boundary).limit(size).get();
        const prevBoundary = boundary;
        const _boundary = forwardOrderSnap.docs[forwardOrderSnap.docs.length - 1];
        if (!_boundary) {
          dispatch(subscribedMore());
          return;
        }
        const idx = snaps.length;
        const listener = reverseOrderQuery
          .startAt(_boundary)
          .endBefore(prevBoundary)
          .onSnapshot((snap) => dispatch(updateSnap({ idx, snap })), setError);
        dispatch(subscribedMore({ boundary: _boundary, idx, listener }));
      };
      effect();
    }
  }, [subscribingMore]);

  useEffect(() => {
    if (boundary) {
      return forwardOrderQuery
        .startAfter(boundary)
        .limit(1)
        .onSnapshot((snap) => setHasMore(snap.docs.length === 1));
    } else {
      return forwardOrderQuery.limit(1).onSnapshot((snap) => {
        if (snap.docs.length === 1) dispatch(subscribe());
      });
    }
  }, [boundary]);

  useUnmount(() => dispatch(detachListeners()));

  return {
    docs,
    boundary,
    hasMore,
    error,
    subscribeMore: () => dispatch(subscribeMore()),
  };
};

export default useCollectionByChunk;
