import React, { useEffect, useRef, useState } from 'react';
import EasyMDE from 'easymde';
import { marked } from 'marked';
import { useApp } from '../contexts/AppContext';

function NoteEditor() {
  const { state, actions } = useApp();
  const textareaRef = useRef(null);
  const editorRef = useRef(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);

  const currentEntry = state.entries[state.editingEntryIndex];

  useEffect(() => {
    if (currentEntry) {
      setTitle(currentEntry.description);
      setDate(currentEntry.date);
    }
  }, [currentEntry]);

  useEffect(() => {
    if (textareaRef.current && !editorRef.current) {
      // Initialize EasyMDE
      editorRef.current = new EasyMDE({
        element: textareaRef.current,
        initialValue: currentEntry?.notes || '',
        spellChecker: false,
        status: false,
        autoDownloadFontAwesome: false,
        toolbar: [
          'bold', 'italic', 'heading', '|',
          'quote', 'unordered-list', 'ordered-list', '|',
          'link', 'image', '|',
          'preview', 'side-by-side', 'fullscreen', '|',
          'guide'
        ],
      });

      // Add custom paste handler for smart-link feature
      const cm = editorRef.current.codemirror;
      cm.on('paste', function (_, e) {
        const sel = cm.somethingSelected();
        if (sel) {
          const clipboardData = e.clipboardData || window.clipboardData;
          const pastedData = clipboardData.getData('text');

          const urlRegex = /^(https?:\/\/[^\s]+)$/;
          if (urlRegex.test(pastedData)) {
            e.preventDefault();
            const selectedText = cm.getSelection();
            cm.replaceSelection(`[${selectedText}](${pastedData})`);
            console.log(`Transformed "${selectedText}" into a link with URL: ${pastedData}`);
          }
        }
      });
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.toTextArea();
        editorRef.current = null;
      }
    };
  }, [currentEntry]);

  const handleSave = async () => {
    if (!currentEntry || !editorRef.current) {
      console.error('Cannot save: No entry selected or editor not initialized.');
      return;
    }

    try {
      const noteContent = editorRef.current.value();
      
      // Update entry with new values
      const updates = {
        description: title,
        date: date,
        notes: noteContent,
      };

      await actions.updateEntry(state.editingEntryIndex, updates);

      // Extract and create tasks from markdown
      await actions.createTasksFromMarkdown(noteContent, {
        ...currentEntry,
        ...updates,
      });

      // Exit editing mode
      actions.setEditing(false);
    } catch (error) {
      console.error('Failed to save notes:', error);
      alert('Failed to save notes. Please try again.');
    }
  };

  const handleCancel = () => {
    actions.setEditing(false);
  };

  const handleTitleClick = () => {
    setIsEditingTitle(true);
  };

  const handleDateClick = () => {
    setIsEditingDate(true);
  };

  const handleTitleSave = () => {
    setIsEditingTitle(false);
  };

  const handleDateSave = () => {
    setIsEditingDate(false);
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setTitle(currentEntry?.description || '');
      setIsEditingTitle(false);
    }
  };

  const handleDateKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleDateSave();
    } else if (e.key === 'Escape') {
      setDate(currentEntry?.date || '');
      setIsEditingDate(false);
    }
  };

  if (!currentEntry) {
    return (
      <div className="p-8 text-center">
        <p>No entry selected for editing.</p>
        <button className="btn btn-secondary mt-4" onClick={handleCancel}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <section className="fixed inset-0 z-50 p-6 flex flex-col" style={{ backgroundColor: 'var(--bg-color)' }}>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--text-color)' }}>
          Edit Note for{' '}
          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              className="inline-block bg-transparent border-b-2 border-blue-500 focus:outline-none"
              autoFocus
            />
          ) : (
            <span
              className="editable-title cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900 px-2 py-1 rounded"
              onClick={handleTitleClick}
            >
              {title}
            </span>
          )}
          <div className="inline-block ml-4">
            {isEditingDate ? (
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                onBlur={handleDateSave}
                onKeyDown={handleDateKeyDown}
                className="bg-transparent border-b-2 border-blue-500 focus:outline-none text-gray-600 dark:text-gray-400"
                autoFocus
              />
            ) : (
              <span
                className="editable-date cursor-pointer px-2 py-1 rounded text-sm"
                style={{ color: 'var(--dark-gray)' }}
                onClick={handleDateClick}
              >
                📅 {date}
              </span>
            )}
          </div>
        </h2>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <textarea
          ref={textareaRef}
          className="hidden"
        />
      </div>

      <div className="flex justify-end space-x-3 mt-4">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
        >
          Save Note
        </button>
      </div>

      <style jsx>{`
        .EasyMDEContainer {
          display: flex !important;
          flex-direction: column !important;
          flex-grow: 1 !important;
          overflow: hidden !important;
          height: 100% !important;
        }

        .CodeMirror {
          flex-grow: 1 !important;
          height: auto !important;
          min-height: 300px !important;
        }

        .CodeMirror-scroll {
          min-height: 300px !important;
        }
      `}</style>
    </section>
  );
}

export default NoteEditor;