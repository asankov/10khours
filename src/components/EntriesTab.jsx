import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';

function EntriesTab() {
  const { state, actions } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    hours: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [editingCell, setEditingCell] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const description = formData.description.trim();
    const hours = parseFloat(formData.hours);
    
    if (!description || isNaN(hours) || hours <= 0) {
      alert('Please enter a valid description and positive number of hours.');
      return;
    }

    try {
      const newEntry = {
        date: formData.date,
        description,
        hours,
        notes: undefined,
      };

      await actions.addEntry(newEntry);
      setFormData({
        description: '',
        hours: '',
        date: new Date().toISOString().split('T')[0],
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add entry:', error);
      alert('Failed to save entry. Please try again.');
    }
  };

  const handleDelete = async (index) => {
    const entry = state.entries[index];
    if (confirm(`Are you sure you want to delete the entry for "${entry.description}" on ${entry.date}?`)) {
      try {
        await actions.deleteEntry(index);
      } catch (error) {
        console.error('Failed to delete entry:', error);
        alert('Failed to delete entry. Please try again.');
      }
    }
  };

  const handleEdit = (index) => {
    if (state.isLoading) {
      return; // Don't allow editing while app is loading
    }
    if (index < 0 || index >= state.entries.length) {
      console.error('Invalid entry index:', index, 'Total entries:', state.entries.length);
      return;
    }
    actions.setEditing(true, index);
  };

  const handleCellClick = (index, field, currentValue) => {
    if (field === 'notes') {
      handleEdit(index);
      return;
    }

    setEditingCell({ index, field });
    setEditingValue(currentValue?.toString() || '');
  };

  const handleCellSave = async (index, field) => {
    try {
      let newValue = editingValue.trim();
      
      if (field === 'hours') {
        const numValue = parseFloat(newValue);
        if (isNaN(numValue) || numValue <= 0) {
          alert('Please enter a valid positive number for hours.');
          return;
        }
        newValue = numValue;
      } else if (field === 'description' && newValue === '') {
        alert('Description cannot be empty.');
        return;
      }

      await actions.updateEntry(index, { [field]: newValue });
      setEditingCell(null);
      setEditingValue('');
    } catch (error) {
      console.error('Failed to save edit:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditingValue('');
  };

  const handleKeyDown = (e, index, field) => {
    if (e.key === 'Enter') {
      handleCellSave(index, field);
    } else if (e.key === 'Escape') {
      handleCellCancel();
    }
  };

  const sortedEntries = [...state.entries].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <>
      <div className="card-header flex justify-between items-center border-t-0">
        <div>
          <h2 className="text-xl font-semibold">Learning Entries</h2>
          <p className="text-sm text-gray-500">
            Track your learning journey with detailed entries
          </p>
        </div>
        <button
          className="btn btn-primary"
          style={{ backgroundColor: 'black' }}
          onClick={() => setShowAddForm(true)}
        >
          <span className="btn-icon">+</span> Add Entry
        </button>
      </div>

      {/* Add Entry Form */}
      {showAddForm && (
        <div className="border-t border-gray-200 p-4" style={{ backgroundColor: 'var(--form-bg)' }}>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="form-group md:col-span-2">
              <label htmlFor="description" className="form-label">Description</label>
              <input
                type="text"
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                className="form-input"
                placeholder="What did you work on?"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="hours" className="form-label">Hours Spent</label>
              <input
                type="number"
                id="hours"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                required
                step="0.1"
                min="0.1"
                className="form-input"
                placeholder="e.g., 1.5"
              />
            </div>
            <div className="form-group">
              <label htmlFor="date" className="form-label">Date</label>
              <input
                type="date"
                id="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="md:col-span-4 flex justify-end">
              <button
                type="button"
                className="btn btn-secondary mr-2"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Add Entry
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card-body p-0">
        <table className="entries-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Hours</th>
              <th>Preview</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center text-gray-500">
                  No entries yet. Add one above!
                </td>
              </tr>
            ) : (
              sortedEntries.map((entry, sortedIndex) => {
                const originalIndex = state.entries.findIndex((e) => e._id === entry._id);
                
                
                // Simplified notes preview
                let notesPreviewHtml = (
                  <span className="text-gray-400 italic">No notes</span>
                );
                if (entry.notes) {
                  const split = entry.notes.split('\n');
                  const firstLine = split[0];
                  const snippet = firstLine.substring(0, 50);
                  const hasContinuation = firstLine.length > 50 || split.length > 1;
                  notesPreviewHtml = (
                    <span className={`font-mono text-xs ${hasContinuation ? 'notes-preview' : ''}`}>
                      {snippet}
                    </span>
                  );
                }

                return (
                  <tr key={entry._id || originalIndex}>
                    <td
                      className="editable-cell"
                      onClick={() => handleCellClick(originalIndex, 'date', entry.date)}
                    >
                      {editingCell?.index === originalIndex && editingCell?.field === 'date' ? (
                        <input
                          type="date"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleCellSave(originalIndex, 'date')}
                          onKeyDown={(e) => handleKeyDown(e, originalIndex, 'date')}
                          className="inline-edit-input"
                          autoFocus
                        />
                      ) : (
                        entry.date
                      )}
                    </td>
                    <td
                      className="editable-cell"
                      onClick={() => handleCellClick(originalIndex, 'description', entry.description)}
                    >
                      {editingCell?.index === originalIndex && editingCell?.field === 'description' ? (
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleCellSave(originalIndex, 'description')}
                          onKeyDown={(e) => handleKeyDown(e, originalIndex, 'description')}
                          className="inline-edit-input"
                          autoFocus
                        />
                      ) : (
                        entry.description
                      )}
                    </td>
                    <td
                      className="editable-cell"
                      onClick={() => handleCellClick(originalIndex, 'hours', entry.hours)}
                    >
                      {editingCell?.index === originalIndex && editingCell?.field === 'hours' ? (
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleCellSave(originalIndex, 'hours')}
                          onKeyDown={(e) => handleKeyDown(e, originalIndex, 'hours')}
                          className="inline-edit-input"
                          autoFocus
                        />
                      ) : (
                        entry.hours.toFixed(1)
                      )}
                    </td>
                    <td
                      className="editable-cell"
                      onClick={() => handleCellClick(originalIndex, 'notes', entry.notes)}
                    >
                      {notesPreviewHtml}
                    </td>
                    <td className="space-x-2">
                      <button
                        className="text-black-600 hover:text-gray-400 edit-btn"
                        onClick={() => handleEdit(originalIndex)}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        className="text-black-600 hover:text-red-600 delete-btn"
                        onClick={() => handleDelete(originalIndex)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default EntriesTab;