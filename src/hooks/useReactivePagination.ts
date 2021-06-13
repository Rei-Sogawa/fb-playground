import firebase from "firebase/app";
import "firebase/firestore";
import { useState } from "react";

type UseReactivePagination = (option: {
  forwardOrderQuery: firebase.firestore.Query;
  reverseOrderQuery: firebase.firestore.Query;
  limit: number;
}) => {
  error: firebase.firestore.FirestoreError | undefined;
  hasMore: boolean;
  docSnaps: firebase.firestore.QueryDocumentSnapshot[];
  listen: () => void;
  listenMore: () => void;
  detachListeners: () => void;
};

const useReactivePagination: UseReactivePagination = ({
  forwardOrderQuery,
  reverseOrderQuery,
  limit,
}) => {
  const [error, setError] =
    useState<firebase.firestore.FirestoreError | undefined>(undefined);

  const [docSnaps, setDocSnaps] = useState<
    firebase.firestore.QueryDocumentSnapshot[]
  >([]);
  const [boundary, setBoundary] =
    useState<firebase.firestore.QueryDocumentSnapshot | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);

  const [listeners, setListeners] = useState<(() => void)[]>([]);

  const listen = async () => {
    const forwardOrderSnap = await forwardOrderQuery.limit(limit).get();
    const _boundary = forwardOrderSnap.docs[forwardOrderSnap.docs.length - 1];

    if (!_boundary) {
      return;
    }

    setBoundary(_boundary);
    setHasMore(forwardOrderSnap.docs.length === limit);

    const listener = reverseOrderQuery
      .startAt(_boundary)
      .onSnapshot(handleSnapshot, setError);
    setListeners((prev) => [...prev, listener]);
  };

  const listenMore = async () => {
    if (!boundary) return;

    const forwardOrderSnap = await forwardOrderQuery
      .startAfter(boundary)
      .limit(limit)
      .get();
    const prevBoundary = boundary;
    const _boundary = forwardOrderSnap.docs[forwardOrderSnap.docs.length - 1];

    if (!_boundary) {
      setHasMore(false);
      return;
    }

    setBoundary(_boundary);
    setHasMore(forwardOrderSnap.docs.length === limit);

    const listener = reverseOrderQuery
      .startAt(_boundary)
      .endBefore(prevBoundary)
      .onSnapshot(handleSnapshot, setError);
    setListeners((prev) => [...prev, listener]);
  };

  const detachListeners = () => {
    listeners.forEach((listener) => listener());
    setListeners([]);
  };

  const handleSnapshot = (
    reverseOrderSnap: firebase.firestore.QuerySnapshot
  ) => {
    reverseOrderSnap
      .docChanges()
      .reverse()
      .forEach((change) => {
        if (change.type === "added") {
          setDocSnaps((prev) => [...prev, change.doc]);
        } else if (change.type === "modified") {
          setDocSnaps((prev) => [
            ...prev.map((queryDocSnap) =>
              queryDocSnap.id === change.doc.id ? change.doc : queryDocSnap
            ),
          ]);
        } else if (change.type === "removed") {
          setDocSnaps((prev) => [
            ...prev.filter((queryDocSnap) => queryDocSnap.id !== change.doc.id),
          ]);
        }
      });
  };

  return {
    error,
    hasMore,
    docSnaps,
    listen,
    listenMore,
    detachListeners,
  };
};

export default useReactivePagination;
