/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';

import { UserWarning } from './UserWarning';
import * as service from './api/todos';
import { Todo } from './types/Todo';
import { TodoItem } from './components/TodoItem/TodoItem';
import { Footer } from './components/Footer';
import { Filter } from './types/Filter';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loadingIds, setLoadingIds] = useState<number[]>([]);
  const [filterTodos, setFilterTodos] = useState<Filter>(Filter.ALL);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);

  const [todoTitle, setTodoTitle] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    service
      .getTodos()
      .then(setTodos)
      .catch(() => setErrorMessage('Unable to load todos'));
  }, []);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage('');
      }, 3000);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [errorMessage]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef, isSubmitting]);

  if (!service.USER_ID) {
    return <UserWarning />;
  }

  const filteredTodos = todos.filter(todo => {
    switch (filterTodos) {
      case Filter.ACTIVE:
        return !todo.completed;

      case Filter.COMPLETED:
        return todo.completed;

      default:
        return true;
    }
  });

  const todosAmount = todos.filter(todo => !todo.completed).length;
  const completedTodos = todos.filter(todo => todo.completed);

  // #region todoOperations

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('');
    setTodoTitle(event.target.value);
  };

  const updateTodo = (updatedTodo: Todo) => {
    return service
      .updateTodos(updatedTodo)
      .then(() => {
        setTodos(currentTodos =>
          currentTodos.map(todo =>
            todo.id === updatedTodo.id ? updatedTodo : todo,
          ),
        );
      })
      .catch(error => {
        setErrorMessage('Unable to update a todo');
        throw error;
      });
  };

  const addTodo = ({ title }: { title: string }) => {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setErrorMessage('Title should not be empty');

      return;
    }

    const newTempTodo: Todo = {
      id: 0,
      userId: service.USER_ID,
      title: trimmedTitle,
      completed: false,
    };

    setTempTodo(newTempTodo);
    setIsSubmitting(true);

    service
      .createTodos({
        userId: service.USER_ID,
        title: trimmedTitle,
        completed: false,
      })
      .then(newTodo => {
        setTodos(currentTodos => [...currentTodos, newTodo]);
        setTodoTitle('');
      })
      .catch(() => {
        setErrorMessage('Unable to add a todo');
      })
      .finally(() => {
        setTempTodo(null);
        setIsSubmitting(false);

        if (inputRef.current) {
          inputRef.current.focus();
        }
      });
  };

  const deleteTodo = (todoId: number) => {
    return service
      .deleteTodos(todoId)
      .then(() => {
        setTodos(currentTodos =>
          currentTodos.filter(todo => todo.id !== todoId),
        );
      })
      .catch(() => {
        setErrorMessage('Unable to delete a todo');
      })
      .finally(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      });
  };

  const deleteCompleted = (completed: Todo[]) => {
    setLoadingIds(prevIds => [...prevIds, ...completed.map(todo => todo.id)]);

    Promise.all(
      completed.map(todo =>
        service.deleteTodos(todo.id).then(() => {
          setTodos(currentTodos => currentTodos.filter(t => t.id !== todo.id));
        }),
      ),
    )
      .catch(() => {
        setErrorMessage('Unable to delete a todo');
      })
      .finally(() => {
        setLoadingIds(prevIds =>
          prevIds.filter(id => !completed.some(todo => todo.id === id)),
        );
      });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    addTodo({ title: todoTitle });
  };

  const handleButtonClose = () => {
    setErrorMessage('');
  };

  const toggleAllTodos = () => {
    const allCompleted = todos.every(todo => todo.completed);
    const newStatus = !allCompleted;

    const todosToUpdate = todos.filter(todo => todo.completed !== newStatus);

    setLoadingIds(prevIds => [
      ...prevIds,
      ...todosToUpdate.map(todo => todo.id),
    ]);

    Promise.all(
      todosToUpdate.map(todo =>
        service
          .updateTodos({ ...todo, completed: newStatus })
          .then(updatedTodo => {
            setTodos(currentTodos =>
              currentTodos.map(t =>
                t.id === updatedTodo.id ? updatedTodo : t,
              ),
            );
          }),
      ),
    )
      .catch(() => {
        setErrorMessage('Unable to update a todo');
      })
      .finally(() => {
        setLoadingIds(prevIds =>
          prevIds.filter(id => !todosToUpdate.some(todo => todo.id === id)),
        );
      });
  };

  // #endregion

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {!!todos.length && (
            <button
              type="button"
              className={classNames('todoapp__toggle-all', {
                active: completedTodos.length === todos.length,
              })}
              data-cy="ToggleAllButton"
              onClick={toggleAllTodos}
            />
          )}

          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={todoTitle}
              onChange={handleTitleChange}
              disabled={isSubmitting}
            />
          </form>
        </header>

        <section className="todoapp__main" data-cy="TodoList">
          {filteredTodos.map(todo => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onDelete={deleteTodo}
              onUpdate={updateTodo}
              isLoading={loadingIds.includes(todo.id)}
            />
          ))}
          {tempTodo && <TodoItem todo={tempTodo} />}
        </section>

        {todos.length !== 0 && (
          <Footer
            todosAmount={todosAmount}
            filterTodos={filterTodos}
            setFilterTodos={setFilterTodos}
            completedTodos={completedTodos}
            deleteCompleted={deleteCompleted}
          />
        )}
      </div>

      <div
        data-cy="ErrorNotification"
        className={classNames(
          'notification is-danger is-light has-text-weight-normal',
          {
            hidden: !errorMessage,
          },
        )}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={handleButtonClose}
        />
        {errorMessage}
      </div>
    </div>
  );
};
