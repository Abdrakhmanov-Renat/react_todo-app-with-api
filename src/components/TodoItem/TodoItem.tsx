import classNames from 'classnames';
import { useEffect, useState } from 'react';
import { Todo } from '../../types/Todo';

interface Props {
  todo: Todo;
  onDelete?: (todoId: number) => Promise<void>;
  onUpdate?: (todo: Todo) => Promise<void>;
  isLoading?: boolean;
}

export const TodoItem: React.FC<Props> = ({
  todo,
  onDelete = () => Promise.resolve(),
  onUpdate = () => Promise.resolve(),
  isLoading,
}) => {
  const [isChecked, setIsChecked] = useState(todo.completed);
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [tempTitle, setTempTitle] = useState(todo.title);

  useEffect(() => {
    setIsChecked(todo.completed);
  }, [todo.completed]);

  // #region eventHandlers

  const handleChange = (changedTodo: Todo) => {
    setIsLocalLoading(true);

    onUpdate({ ...changedTodo, completed: !changedTodo.completed })
      .then(() => {
        setIsChecked(!changedTodo.completed);
      })
      .finally(() => {
        setIsLocalLoading(false);
      });
  };

  const handleDelete = () => {
    setIsLocalLoading(true);

    onDelete(todo.id).finally(() => {
      setIsLocalLoading(false);
    });
  };

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTempTitle(event.target.value);
  };

  const handleSubmit = () => {
    setIsLocalLoading(true);

    if (tempTitle.trim() === todo.title) {
      setIsLocalLoading(false);
      setIsEditing(false);

      return;
    }

    if (tempTitle.trim()) {
      onUpdate({ ...todo, title: tempTitle }).finally(() => {
        setIsLocalLoading(false);
      });
    } else {
      onDelete(todo.id).finally(() => {
        setIsLocalLoading(false);
      });
    }

    setIsEditing(false);
  };

  // #endregion

  const isTodoLoading = isLoading || isLocalLoading;

  return (
    <div
      data-cy="Todo"
      className={classNames('todo', {
        completed: isChecked,
      })}
    >
      {/* eslint-disable-next-line */}
      <label className="todo__status-label">
        <input
          data-cy="TodoStatus"
          type="checkbox"
          className="todo__status"
          checked={isChecked}
          onChange={() => {
            handleChange(todo);
          }}
          onDoubleClick={() => {
            setIsEditing(true);
          }}
        />
      </label>

      {!isEditing ? (
        <>
          <span
            data-cy="TodoTitle"
            className="todo__title"
            onDoubleClick={() => {
              setIsEditing(true);
            }}
          >
            {todo.title}
          </span>

          <button
            type="button"
            className="todo__remove"
            data-cy="TodoDelete"
            onClick={handleDelete}
          >
            ×
          </button>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <input
            data-cy="TodoTitleField"
            type="text"
            className="todo__title-field"
            placeholder="Empty todo will be deleted"
            value={tempTitle}
            onChange={handleTitleChange}
            onBlur={handleSubmit}
            autoFocus
          />
        </form>
      )}

      <div
        data-cy="TodoLoader"
        className={classNames('modal overlay', {
          'is-active': isTodoLoading || todo.id === 0,
        })}
      >
        <div className="modal-background has-background-white-ter" />
        <div className="loader" />
      </div>
    </div>
  );
};