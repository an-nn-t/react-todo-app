import React from "react";
import type { Todo } from "./types";

type Props = {
  todos: Todo[];
};

const TodoList = (props: Props) => {
  const todos = props.todos;
  return (
    <div className="flex flex-col gap-y-1">
      <div>
        {todos[0].name} 優先度: {todos[0].priority}
      </div>
      <div>
        {todos[1].name} 優先度: {todos[1].priority}
      </div>
      <div>
        {todos[2].name} 優先度: {todos[2].priority}
      </div>
    </div>
  );
};

export default TodoList;