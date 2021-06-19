import { CounterProvider, useCounter } from "./useCounterContext";

const Counter = () => {
  return (
    <CounterProvider>
      <Count />
      <Increment />
      <Decrement />
    </CounterProvider>
  );
};

const Count = () => {
  const { count } = useCounter();
  return <div>{count}</div>;
};

const Increment = () => {
  const { increment } = useCounter();
  return <button onClick={increment}>increment</button>;
};

const Decrement = () => {
  const { decrement } = useCounter();
  return <button onClick={decrement}>decrement</button>;
};

export default Counter;
