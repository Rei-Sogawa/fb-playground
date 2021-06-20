import firebase from "firebase/app";
import "firebase/firestore";
import { useMemo } from "react";
import { useEffect, useState } from "react";

type UseCollectionByChunk = ({
  forwardOrderQuery,
  reverseOrderQuery,
  size,
}: {
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

const useCollectionByChunk: UseCollectionByChunk = ({
  forwardOrderQuery,
  reverseOrderQuery,
  size,
}) => {
  const [snaps, setSnaps] = useState<firebase.firestore.QuerySnapshot[]>([]);
  const [boundary, setBoundary] = useState<firebase.firestore.DocumentData>();
  const [hasMore, setHasMore] = useState(false);
  const [listeners, setListeners] = useState<(() => void)[]>([]);
  const [settingListener, setSettingListener] = useState(false);
  const [error, setError] = useState<firebase.firestore.FirestoreError>();

  const listen = async () => {
    if (snaps.length !== listeners.length) return;
    if (settingListener) return;

    setSettingListener(true);

    const forwardOrderSnap = await forwardOrderQuery.limit(size).get();
    const _boundary = forwardOrderSnap.docs[forwardOrderSnap.docs.length - 1];
    if (!_boundary) {
      setSettingListener(false);
      return;
    }
    setBoundary(_boundary);

    const idx = 0;
    const listener = reverseOrderQuery
      .startAt(_boundary)
      .onSnapshot((snap) => setSnaps((prev) => [snap, ...prev.slice(1)]), setError);
    setListeners((prev) => {
      if (prev[idx]) prev[idx]();
      return [...prev.slice(0, idx), listener, ...prev.slice(idx + 1)];
    });

    setSettingListener(false);
  };

  const listenMore = async () => {
    if (snaps.length !== listeners.length) return;
    if (settingListener || !boundary) return;

    setSettingListener(true);

    const forwardOrderSnap = await forwardOrderQuery.startAfter(boundary).limit(size).get();
    const prevBoundary = boundary;
    const _boundary = forwardOrderSnap.docs[forwardOrderSnap.docs.length - 1];
    if (!_boundary) {
      setSettingListener(false);
      return;
    }
    setBoundary(_boundary);

    const idx = snaps.length;
    const listener = reverseOrderQuery
      .startAt(_boundary)
      .endBefore(prevBoundary)
      .onSnapshot(
        (snap) => setSnaps((prev) => [...prev.slice(0, idx), snap, ...prev.slice(idx + 1)]),
        setError
      );
    setListeners((prev) => {
      if (prev[idx]) prev[idx]();
      return [...prev.slice(0, idx), listener, ...prev.slice(idx + 1)];
    });

    setSettingListener(false);
  };

  const detachListeners = () => {
    listeners.forEach((listener) => listener());
    setListeners([]);
  };

  useEffect(() => {
    if (boundary) {
      const listener = forwardOrderQuery
        .startAfter(boundary)
        .limit(1)
        .onSnapshot((snap) => {
          setHasMore(snap.docs.length === 1);
        });
      return () => listener();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundary]);

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
