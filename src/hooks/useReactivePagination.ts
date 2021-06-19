import firebase from "firebase/app";
import "firebase/firestore";
import { useEffect, useState } from "react";

type UseReactivePagination = (option: {
  forwardOrderQuery: firebase.firestore.Query;
  reverseOrderQuery: firebase.firestore.Query;
  size: number;
}) => {
  docs: firebase.firestore.DocumentData[];
  boundary?: firebase.firestore.DocumentData;
  hasMore: boolean;
  error?: firebase.firestore.FirestoreError;
  listen: () => Promise<void>;
  listenMore: () => Promise<void>;
  detachListeners: () => void;
};

const useReactivePagination: UseReactivePagination = ({
  forwardOrderQuery,
  reverseOrderQuery,
  size,
}) => {
  const [error, setError] = useState<firebase.firestore.FirestoreError>();
  const [docs, setDocs] = useState<firebase.firestore.DocumentData[]>([]);
  const [boundary, setBoundary] = useState<firebase.firestore.DocumentData>();
  const [hasMore, setHasMore] = useState(false);
  const [listeners, setListeners] = useState<(() => void)[]>([]);

  const listen = async () => {
    const forwardOrderSnap = await forwardOrderQuery.limit(size).get();

    const _boundary = forwardOrderSnap.docs[forwardOrderSnap.docs.length - 1];
    if (!_boundary) {
      return;
    }
    setBoundary(_boundary);

    const listener = reverseOrderQuery.startAt(_boundary).onSnapshot(handleSnapshot, setError);
    setListeners((prev) => [...prev, listener]);
  };

  const listenMore = async () => {
    if (!boundary) return;

    const forwardOrderSnap = await forwardOrderQuery.startAfter(boundary).limit(size).get();

    const prevBoundary = boundary;
    const _boundary = forwardOrderSnap.docs[forwardOrderSnap.docs.length - 1];
    if (!_boundary) {
      return;
    }
    setBoundary(_boundary);

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

  const handleSnapshot = (reverseOrderSnap: firebase.firestore.QuerySnapshot) => {
    reverseOrderSnap
      .docChanges()
      .reverse()
      .forEach((change) => {
        if (change.type === "added") {
          setDocs((prev) => [...prev, change.doc]);
        } else if (change.type === "modified") {
          setDocs((prev) => [
            ...prev.map((docSnap) => (docSnap.id === change.doc.id ? change.doc : docSnap)),
          ]);
        } else if (change.type === "removed") {
          setDocs((prev) => [...prev.filter((docSnap) => docSnap.id !== change.doc.id)]);
        }
      });
  };

  useEffect(() => {
    if (boundary) {
      return forwardOrderQuery
        .startAfter(boundary)
        .limit(1)
        .onSnapshot((snap) => {
          setHasMore(snap.docs.length === 1);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundary]);

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

export default useReactivePagination;
