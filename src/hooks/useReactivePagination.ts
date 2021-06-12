import firebase from "firebase/app";
import "firebase/firestore";
import { useState } from "react";

// [エッジケース]
// - 最初から server 側の doc が 0 個
// - 残りの server 側の doc が 0 個

function useReactivePagination<
  T extends {
    id: string;
    ref: firebase.firestore.DocumentReference<firebase.firestore.DocumentData>;
  }
>(
  forwardOrderQuery: firebase.firestore.Query<firebase.firestore.DocumentData>,
  reverseOrderQuery: firebase.firestore.Query<firebase.firestore.DocumentData>,
  size: number,
  sortFn: (a: T, b: T) => number
) {
  const [initialized, setInitialized] = useState(false);
  const [hasMoreDocs, setHasMoreDocs] = useState(false);
  const [docs, setDocs] = useState<T[]>([]);
  const [startPoint, setStartPoint] =
    useState<
      firebase.firestore.QueryDocumentSnapshot<firebase.firestore.DocumentData>
    >();
  const [listeners, setListeners] = useState<(() => void)[]>([]);

  const listenDocs = async () => {
    const forwardOrderSnap = await forwardOrderQuery.limit(size).get();
    const _startPoint = forwardOrderSnap.docs[forwardOrderSnap.docs.length - 1];
    if (!_startPoint) return;
    setStartPoint(_startPoint);
    setHasMoreDocs(true);

    const listener = reverseOrderQuery
      .startAt(_startPoint)
      .onSnapshot((reverseOrderSnap) => {
        reverseOrderSnap
          .docChanges()
          .reverse()
          .forEach((change) => {
            if (change.type === "added") {
              addDoc(change.doc);
              sortDocs();
            } else if (change.type === "modified") {
              modifyDoc(change.doc);
              sortDocs();
            } else if (change.type === "removed") {
              removeDoc(change.doc);
            }
          });
      });
    setListeners((prev) => [...prev, listener]);

    setInitialized(true);
  };

  const listenMoreDocs = async () => {
    if (!startPoint) return;

    const forwardOrderSnap = await forwardOrderQuery
      .startAfter(startPoint)
      .limit(size)
      .get();
    const endPoint = startPoint;
    const _startPoint = forwardOrderSnap.docs[forwardOrderSnap.docs.length - 1];
    if (!_startPoint) {
      setHasMoreDocs(false);
      return;
    }
    setStartPoint(_startPoint);
    setHasMoreDocs(true);

    const listener = reverseOrderQuery
      .startAt(_startPoint)
      .endBefore(endPoint)
      .onSnapshot((reverseOrderSnap) => {
        reverseOrderSnap
          .docChanges()
          .reverse()
          .forEach((change) => {
            if (change.type === "added") {
              addDoc(change.doc);
              sortDocs();
            } else if (change.type === "modified") {
              modifyDoc(change.doc);
              sortDocs();
            } else if (change.type === "removed") {
              removeDoc(change.doc);
            }
          });
      });
    setListeners((prev) => [...prev, listener]);
  };

  const detachListeners = () => {
    listeners.forEach((listener) => listener());
  };

  const addDoc = (
    doc: firebase.firestore.DocumentChange<firebase.firestore.DocumentData>["doc"]
  ) => {
    setDocs((prev) => [
      ...prev,
      {
        id: doc.id,
        ref: doc.ref,
        ...doc.data(),
      } as T,
    ]);
  };

  const modifyDoc = (
    doc: firebase.firestore.DocumentChange<firebase.firestore.DocumentData>["doc"]
  ) => {
    setDocs((prev) => [
      ...prev.map((prevDoc) =>
        prevDoc.id === doc.id
          ? ({
              id: doc.id,
              ref: doc.ref,
              ...doc.data(),
            } as T)
          : prevDoc
      ),
    ]);
  };

  const removeDoc = (
    doc: firebase.firestore.DocumentChange<firebase.firestore.DocumentData>["doc"]
  ) => {
    setDocs((prev) => [...prev.filter((prevDoc) => prevDoc.id !== doc.id)]);
  };

  const sortDocs = () => setDocs((prev) => prev.sort(sortFn));

  return {
    initialized,
    hasMoreDocs,
    docs,
    endPointDoc: startPoint,
    listenDocs,
    listenMoreDocs,
    detachListeners,
  };
}

export default useReactivePagination;
