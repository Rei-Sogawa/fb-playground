import { createContext, ReactNode, useContext, useState } from "react";

type Value = {
  count: number;
  increment: () => void;
  decrement: () => void;
};

const CounterContext = createContext<Value | undefined>(undefined);

type Props = { children: ReactNode };

const CounterProvider = ({ children }: Props) => {
  const [count, setCount] = useState(0);
  const increment = () => setCount((prev) => prev + 1);
  const decrement = () => setCount((prev) => prev - 1);

  const value: Value = {
    count,
    increment,
    decrement,
  };

  return <CounterContext.Provider value={value}>{children}</CounterContext.Provider>;
};

const useCounter = () => {
  const value = useContext(CounterContext);
  if (!value) throw new Error("useCounter must be used within a CounterProvider");
  return { ...value };
};

export { CounterProvider, useCounter };
