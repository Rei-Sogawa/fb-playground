import { IdAndRef } from ".";

export type TodoData = {
  name: string;
};

export type Todo = TodoData & IdAndRef;
