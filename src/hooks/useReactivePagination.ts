import firebase from "firebase/app";
import "firebase/firestore";
import { useState } from "react";

function useReactivePagination<
  T extends {
    id: string;
    ref: firebase.firestore.DocumentReference<firebase.firestore.DocumentData>;
  }
>(
  forwardOrderRef: firebase.firestore.Query<firebase.firestore.DocumentData>,
  reverseOrderRef: firebase.firestore.Query<firebase.firestore.DocumentData>,
  size: number,
  sortFn: (a: T, b: T) => number
) {
  const [docs, setDocs] = useState<T[]>([]);
  const [start, setStart] =
    useState<
      firebase.firestore.QueryDocumentSnapshot<firebase.firestore.DocumentData>
    >();
  const [listeners, setListeners] = useState<(() => void)[]>([]);

  const listenDocs = async () => {
    const forwardOrderSnap = await forwardOrderRef.limit(size).get();
    const _start = forwardOrderSnap.docs[forwardOrderSnap.docs.length - 1];
    setStart(_start);
    if (!_start) return;
    const listener = reverseOrderRef
      .startAt(_start)
      .onSnapshot((reverseOrderSnap) => {
        reverseOrderSnap
          .docChanges()
          .reverse()
          .forEach((change) => {
            if (change.type === "added") {
              setDocs((prev) =>
                [
                  ...prev,
                  {
                    id: change.doc.id,
                    ref: change.doc.ref,
                    ...change.doc.data(),
                  } as T,
                ].sort(sortFn)
              );
            } else if (change.type === "modified") {
              setDocs((prev) =>
                [
                  ...prev.map((prevDoc) =>
                    prevDoc.id === change.doc.id
                      ? ({
                          id: change.doc.id,
                          ref: change.doc.ref,
                          ...change.doc.data(),
                        } as T)
                      : prevDoc
                  ),
                ].sort(sortFn)
              );
            } else if (change.type === "removed") {
              setDocs((prev) => [
                ...prev.filter((prevDoc) => prevDoc.id !== change.doc.id),
              ]);
            }
          });
      });
    setListeners((prev) => [...prev, listener]);
  };

  const listenMoreDocs = async () => {
    if (!start) return;
    const forwardOrderSnap = await forwardOrderRef
      .startAfter(start)
      .limit(size)
      .get();
    const _end = start;
    const _start = forwardOrderSnap.docs[forwardOrderSnap.docs.length - 1];
    setStart(_start);
    if (!_start) return;
    const listener = reverseOrderRef
      .startAt(_start)
      .endBefore(_end)
      .onSnapshot((reverseOrderSnap) => {
        reverseOrderSnap
          .docChanges()
          .reverse()
          .forEach((change) => {
            if (change.type === "added") {
              setDocs((prev) =>
                [
                  ...prev,
                  {
                    id: change.doc.id,
                    ref: change.doc.ref,
                    ...change.doc.data(),
                  } as T,
                ].sort(sortFn)
              );
            } else if (change.type === "modified") {
              setDocs((prev) =>
                [
                  ...prev.map((prevDoc) =>
                    prevDoc.id === change.doc.id
                      ? ({
                          id: change.doc.id,
                          ref: change.doc.ref,
                          ...change.doc.data(),
                        } as T)
                      : prevDoc
                  ),
                ].sort(sortFn)
              );
            } else if (change.type === "removed") {
              setDocs((prev) => [
                ...prev.filter((prevDoc) => prevDoc.id !== change.doc.id),
              ]);
            }
          });
      });
    setListeners((prev) => [...prev, listener]);
  };

  const detachListeners = () => {
    listeners.forEach((listener) => listener());
  };

  return {
    docs,
    listenDocs,
    listenMoreDocs,
    detachListeners,
  };
}

export default useReactivePagination;
