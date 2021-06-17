import firebase from "firebase/app";
import "firebase/firestore";
import { useEffect, useState } from "react";

type UseReactivePagination = (option: {
  forwardOrderQuery: firebase.firestore.Query;
  reverseOrderQuery: firebase.firestore.Query;
  size: number;
}) => {
  initialized: boolean;
  updating: boolean;
  error?: firebase.firestore.FirestoreError;
  hasMore: boolean;
  docSnaps: firebase.firestore.DocumentSnapshot[];
  listen: () => void;
  listenMore: () => void;
  detachListeners: () => void;
};

const useReactivePagination: UseReactivePagination = ({
  forwardOrderQuery,
  reverseOrderQuery,
  size,
}) => {
  const [initialized, setInitialized] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<firebase.firestore.FirestoreError>();

  const [docSnaps, setDocSnaps] = useState<firebase.firestore.DocumentSnapshot[]>([]);
  const [boundary, setBoundary] = useState<firebase.firestore.DocumentSnapshot>();
  const [hasMore, setHasMore] = useState(false);
  const [listeners, setListeners] = useState<(() => void)[]>([]);

  const listen = async () => {
    setUpdating(true);
    await _listen();
    setUpdating(false);
  };

  const _listen = async () => {
    const forwardOrderSnap = await forwardOrderQuery.limit(size).get();

    const _boundary = forwardOrderSnap.docs[forwardOrderSnap.docs.length - 1];
    if (!_boundary) {
      return;
    }
    setBoundary(_boundary);

    const listener = reverseOrderQuery.startAt(_boundary).onSnapshot(handleOnSnapshot, setError);
    setListeners((prev) => [...prev, listener]);

    setInitialized(true);
  };

  const listenMore = async () => {
    setUpdating(true);
    await _listenMore();
    setUpdating(false);
  };

  const _listenMore = async () => {
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
      .onSnapshot(handleOnSnapshot, setError);
    setListeners((prev) => [...prev, listener]);
  };

  const detachListeners = () => {
    listeners.forEach((listener) => listener());
    setListeners([]);
  };

  const handleOnSnapshot = (reverseOrderSnap: firebase.firestore.QuerySnapshot) => {
    reverseOrderSnap
      .docChanges()
      .reverse()
      .forEach((change) => {
        if (change.type === "added") {
          setDocSnaps((prev) => [...prev, change.doc]);
        } else if (change.type === "modified") {
          setDocSnaps((prev) => [
            ...prev.map((docSnap) => (docSnap.id === change.doc.id ? change.doc : docSnap)),
          ]);
        } else if (change.type === "removed") {
          setDocSnaps((prev) => [...prev.filter((docSnap) => docSnap.id !== change.doc.id)]);
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
    initialized,
    updating,
    error,
    hasMore,
    docSnaps,
    listen,
    listenMore,
    detachListeners,
  };
};

export default useReactivePagination;
