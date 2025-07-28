import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';

function Header() {
  const { state, actions } = useApp();
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const settingsRef = useRef(null);
  const projectRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettingsDropdown(false);
      }
      if (projectRef.current && !projectRef.current.contains(event.target)) {
        setShowProjectDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCreateProject = async () => {
    setShowProjectDropdown(false);
    const projectName = prompt('Enter project name:');
    if (!projectName || !projectName.trim()) {
      return;
    }

    try {
      const newProject = await actions.createProject(projectName);
      await actions.switchProject(newProject.id);
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    }
  };

  const handleRenameProject = async (projectId, currentName) => {
    const newName = prompt(`Rename project "${currentName}" to:`, currentName);
    if (!newName || !newName.trim() || newName.trim() === currentName) {
      return;
    }

    try {
      await actions.updateProject(projectId, { name: newName.trim() });
    } catch (error) {
      console.error('Failed to rename project:', error);
      alert('Failed to rename project. Please try again.');
    }
  };

  const handleDeleteProject = async (projectId, projectName) => {
    if (Object.keys(state.projects).length <= 1) {
      alert('Cannot delete the last project.');
      return;
    }

    if (!confirm(`Are you sure you want to delete the project "${projectName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await actions.deleteProject(projectId);
      
      // Switch to default project if we deleted the current one
      if (projectId === state.currentProjectId) {
        const remainingProjects = Object.keys(state.projects).filter(id => id !== projectId);
        const targetProject = remainingProjects.includes('default') ? 'default' : remainingProjects[0];
        await actions.switchProject(targetProject);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project. Please try again.');
    }
  };

  const handleExport = () => {
    setShowSettingsDropdown(false);
    try {
      const exportData = {
        entries: state.entries,
        tasks: state.tasks,
        projects: state.projects,
        metadata: {
          exportDate: new Date().toISOString(),
          totalEntries: state.entries.length,
          totalHours: state.entries.reduce((sum, entry) => sum + entry.hours, 0).toFixed(1),
          currentProject: state.currentProjectId,
        },
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `10k-hours-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('Export completed successfully');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const handleImport = () => {
    setShowSettingsDropdown(false);
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    
    fileInput.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      try {
        const fileContent = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsText(file);
        });

        const importData = JSON.parse(fileContent);
        
        if (!importData.entries || !Array.isArray(importData.entries)) {
          throw new Error('Invalid file format. Please select a valid export file.');
        }

        const confirmMessage = `This will replace all existing data with the imported data.\n\nImport contains:\n- ${importData.entries?.length || 0} entries\n- ${importData.metadata?.totalHours || 0} total hours\n\nAre you sure you want to continue?`;

        if (!confirm(confirmMessage)) {
          return;
        }

        // TODO: Implement import functionality
        alert('Import functionality will be implemented in a future update.');
        
      } catch (error) {
        console.error('Import failed:', error);
        alert(`Failed to import data: ${error.message}`);
      }
    };

    fileInput.click();
  };

  const handleScanTasks = async () => {
    setShowSettingsDropdown(false);
    
    const potentialNewTasks = [];
    
    state.entries.forEach((entry) => {
      if (entry.notes) {
        const markdownTasks = actions.extractTasksFromMarkdown(entry.notes, entry);
        markdownTasks.forEach((taskDescription) => {
          potentialNewTasks.push({
            description: taskDescription,
            dateCreated: entry.date,
            originNoteId: entry._id,
            originNoteName: entry.description,
          });
        });
      }
    });

    if (potentialNewTasks.length === 0) {
      alert('No new tasks found in your existing notes.');
      return;
    }

    const taskPreview = potentialNewTasks.map(task => `• ${task.description}`).join('\n');
    const confirmed = confirm(
      `Found ${potentialNewTasks.length} new task(s) in your existing notes:\n\n${taskPreview}\n\nWould you like to create these tasks?`
    );

    if (!confirmed) return;

    try {
      for (const taskData of potentialNewTasks) {
        await actions.addTask(taskData);
      }
      alert(`Successfully created ${potentialNewTasks.length} tasks from your existing notes!`);
    } catch (error) {
      console.error('Failed to create tasks:', error);
      alert('Failed to create tasks. Please try again.');
    }
  };

  const currentProject = state.projects[state.currentProjectId];
  const hasMultipleProjects = Object.keys(state.projects).length > 1;

  return (
    <header className="site-header">
      <div className="site-branding flex items-center">
        <a href="#" className="site-title">10K Hours Tracker</a>
        <div className="project-selector relative ml-4" ref={projectRef}>
          <button
            className="project-button"
            onClick={() => setShowProjectDropdown(!showProjectDropdown)}
          >
            <span>{currentProject?.name || 'Default'}</span>
            <span className="project-arrow">▼</span>
          </button>
          <div className={`project-dropdown ${showProjectDropdown ? '' : 'hidden'}`}>
            <div>
              {Object.values(state.projects).map((project) => (
                <button
                  key={project.id}
                  className={`project-item ${project.id === state.currentProjectId ? 'active' : ''}`}
                  onClick={() => {
                    if (project.id !== state.currentProjectId) {
                      actions.switchProject(project.id);
                    }
                    setShowProjectDropdown(false);
                  }}
                >
                  <span className="project-name">{project.name}</span>
                  <span className="project-actions">
                    <span
                      className="project-rename"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRenameProject(project.id, project.name);
                      }}
                    >
                      ✏️
                    </span>
                    {hasMultipleProjects && (
                      <span
                        className="project-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id, project.name);
                        }}
                      >
                        🗑️
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
            <button className="create-project-item" onClick={handleCreateProject}>
              <span className="btn-icon">+</span> Create New Project
            </button>
          </div>
        </div>
      </div>
      
      <div className="auth-links flex items-center">
        {/* Dark Mode Toggle */}
        <div className="dark-mode-toggle flex items-center mr-4">
          <span className="text-sm mr-2">🌞</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={state.darkMode}
              onChange={(e) => actions.setDarkMode(e.target.checked)}
            />
            <span className="slider round"></span>
          </label>
          <span className="text-sm ml-2">🌙</span>
        </div>

        {/* Settings Dropdown */}
        <div className="relative mr-4" ref={settingsRef}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
          >
            <span className="btn-icon">⚙️</span>
          </button>
          <div className={`settings-dropdown ${showSettingsDropdown ? '' : 'hidden'}`}>
            <button className="dropdown-item" onClick={handleExport}>
              <span className="btn-icon">📥</span> Export Data
            </button>
            <button className="dropdown-item" onClick={handleImport}>
              <span className="btn-icon">📤</span> Import Data
            </button>
            <button className="dropdown-item" onClick={handleScanTasks}>
              <span className="btn-icon">🔍</span> Scan Notes for Tasks
            </button>
            <div className="dropdown-item" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <span><span className="btn-icon">🤖</span> Auto-create Tasks</span>
              <label className="switch" style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={state.autoCreateTasks}
                  onChange={(e) => actions.setAutoCreateTasks(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>
        </div>

        <a href="#" className="btn btn-secondary">Sign in</a>
        <a href="#" className="btn btn-primary">Sign up</a>
      </div>
    </header>
  );
}

export default Header;