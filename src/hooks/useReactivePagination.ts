import firebase from "firebase/app";
import "firebase/firestore";
import { useState } from "react";

type UseReactivePagination = (option: {
  forwardOrderQuery: firebase.firestore.Query;
  reverseOrderQuery: firebase.firestore.Query;
  limit: number;
}) => {
  loading: boolean;
  error: firebase.firestore.FirestoreError | undefined;
  hasMore: boolean;
  queryDocSnaps: firebase.firestore.QueryDocumentSnapshot[];
  listen: () => void;
  listenMore: () => void;
  detachListeners: () => void;
};

const useReactivePagination: UseReactivePagination = ({
  forwardOrderQuery,
  reverseOrderQuery,
  limit,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] =
    useState<firebase.firestore.FirestoreError | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [queryDocSnaps, setQueryDocSnaps] = useState<
    firebase.firestore.QueryDocumentSnapshot[]
  >([]);
  const [boundary, setBoundary] =
    useState<firebase.firestore.QueryDocumentSnapshot | undefined>(undefined);
  const [listeners, setListeners] = useState<(() => void)[]>([]);

  const listen = async () => {
    setLoading(true);

    const forwardOrderSnap = await forwardOrderQuery.limit(limit).get();
    const _boundary = forwardOrderSnap.docs[forwardOrderSnap.docs.length - 1];
    if (!_boundary) {
      setLoading(false);
      return;
    }

    setBoundary(_boundary);
    setHasMore(forwardOrderSnap.docs.length === limit);

    const listener = reverseOrderQuery
      .startAt(_boundary)
      .onSnapshot(handleSnapshot, setError);
    setListeners((prev) => [...prev, listener]);

    setLoading(false);
  };

  const listenMore = async () => {
    if (!boundary || !hasMore) return;
    setLoading(true);

    const forwardOrderSnap = await forwardOrderQuery
      .startAfter(boundary)
      .limit(limit)
      .get();

    const prevBoundary = boundary;
    const _boundary = forwardOrderSnap.docs[forwardOrderSnap.docs.length - 1];
    if (!_boundary) {
      setHasMore(false);
      setLoading(false);
      return;
    }

    setBoundary(_boundary);
    setHasMore(forwardOrderSnap.docs.length === limit);

    const listener = reverseOrderQuery
      .startAt(_boundary)
      .endBefore(prevBoundary)
      .onSnapshot(handleSnapshot, setError);
    setListeners((prev) => [...prev, listener]);

    setLoading(false);
  };

  const detachListeners = () => listeners.forEach((listener) => listener());

  const handleSnapshot = (
    reverseOrderSnap: firebase.firestore.QuerySnapshot
  ) => {
    reverseOrderSnap
      .docChanges()
      .reverse()
      .forEach((change) => {
        if (change.type === "added") {
          setQueryDocSnaps((prev) => [...prev, change.doc]);
        } else if (change.type === "modified") {
          setQueryDocSnaps((prev) => [
            ...prev.map((queryDocSnap) =>
              queryDocSnap.id === change.doc.id ? change.doc : queryDocSnap
            ),
          ]);
        } else if (change.type === "removed") {
          setQueryDocSnaps((prev) => [
            ...prev.filter((queryDocSnap) => queryDocSnap.id !== change.doc.id),
          ]);
        }
      });
  };

  return {
    loading,
    error,
    hasMore,
    queryDocSnaps,
    listen,
    listenMore,
    detachListeners,
  };
};

export default useReactivePagination;
