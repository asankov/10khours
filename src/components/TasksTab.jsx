import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';

function TasksTab() {
  const { state, actions } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const description = formData.description.trim();
    
    if (!description) {
      alert('Please enter a task description.');
      return;
    }

    try {
      const newTask = {
        description,
        completed: false,
        dateCreated: formData.date,
      };

      await actions.addTask(newTask);
      setFormData({
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add task:', error);
      alert('Failed to save task. Please try again.');
    }
  };

  const handleToggleComplete = async (taskId, completed) => {
    try {
      await actions.updateTask(taskId, { completed: !completed });
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task. Please try again.');
    }
  };

  const handleDeleteTask = async (taskId, description) => {
    if (confirm(`Are you sure you want to delete the task "${description}"?`)) {
      try {
        await actions.deleteTask(taskId);
      } catch (error) {
        console.error('Failed to delete task:', error);
        alert('Failed to delete task. Please try again.');
      }
    }
  };

  // Sort tasks: incomplete first, then by date created
  const sortedTasks = [...state.tasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1; // Incomplete tasks first
    }
    return new Date(b.dateCreated) - new Date(a.dateCreated); // Newest first
  });

  return (
    <>
      <div className="card-header flex justify-between items-center border-t-0">
        <div>
          <h2 className="text-xl font-semibold">Tasks</h2>
          <p className="text-sm text-gray-500">
            Manage your TODO list for this project
          </p>
        </div>
        <button
          className="btn btn-primary"
          style={{ backgroundColor: 'black' }}
          onClick={() => setShowAddForm(true)}
        >
          <span className="btn-icon">+</span> Add Task
        </button>
      </div>

      {/* Add Task Form */}
      {showAddForm && (
        <div className="border-t border-gray-200 p-4" style={{ backgroundColor: 'var(--form-bg)' }}>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-group md:col-span-2">
              <label htmlFor="task-description" className="form-label">Task Description</label>
              <input
                type="text"
                id="task-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                className="form-input"
                placeholder="What needs to be done?"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="task-date" className="form-label">Date</label>
              <input
                type="date"
                id="task-date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <button
                type="button"
                className="btn btn-secondary mr-2"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Add Task
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card-body p-0">
        <div className="divide-y divide-gray-200">
          {sortedTasks.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No tasks yet. Add your first task to get started!
            </div>
          ) : (
            sortedTasks.map((task) => {
              const dateCreated = new Date(task.dateCreated);
              const formattedDate = dateCreated.toLocaleDateString();

              let originNoteHtml = null;
              if (task.originNoteName) {
                originNoteHtml = (
                  <span className="text-gray-500 text-sm ml-2">
                    (From {task.originNoteName})
                  </span>
                );
              }

              return (
                <div key={task.id} className="task-item">
                  <div
                    className={`task-checkbox ${task.completed ? 'completed' : ''}`}
                    onClick={() => handleToggleComplete(task.id, task.completed)}
                  ></div>
                  <div className="task-content">
                    <div className={`task-description ${task.completed ? 'completed' : ''}`}>
                      {task.description}
                    </div>
                    <div className="task-date">
                      Created: {formattedDate}
                      {originNoteHtml}
                    </div>
                  </div>
                  <div className="task-actions">
                    <button
                      className="task-delete-btn"
                      onClick={() => handleDeleteTask(task.id, task.description)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

export default TasksTab;