import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { dbService } from '../services/database';

const AppContext = createContext();

const initialState = {
  entries: [],
  tasks: [],
  projects: {},
  currentProjectId: 'default',
  darkMode: false,
  autoCreateTasks: true,
  activeTab: 'entries',
  isLoading: true,
  currentDate: new Date(),
  chartTypeToggle: true,
  isEditing: false,
  editingEntryIndex: null,
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ENTRIES':
      return { ...state, entries: action.payload };
    
    case 'ADD_ENTRY':
      return { ...state, entries: [...state.entries, action.payload] };
    
    case 'UPDATE_ENTRY':
      const updatedEntries = [...state.entries];
      updatedEntries[action.payload.index] = action.payload.entry;
      return { ...state, entries: updatedEntries };
    
    case 'DELETE_ENTRY':
      return { 
        ...state, 
        entries: state.entries.filter((_, index) => index !== action.payload) 
      };
    
    case 'SET_TASKS':
      return { ...state, tasks: action.payload };
    
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };
    
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(task => 
          task.id === action.payload.id ? { ...task, ...action.payload.updates } : task
        ),
      };
    
    case 'DELETE_TASK':
      return { 
        ...state, 
        tasks: state.tasks.filter(task => task.id !== action.payload) 
      };
    
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload };
    
    case 'ADD_PROJECT':
      return { 
        ...state, 
        projects: { ...state.projects, [action.payload.id]: action.payload } 
      };
    
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: {
          ...state.projects,
          [action.payload.id]: { ...state.projects[action.payload.id], ...action.payload.updates }
        }
      };
    
    case 'DELETE_PROJECT':
      const { [action.payload]: deleted, ...remainingProjects } = state.projects;
      return { ...state, projects: remainingProjects };
    
    case 'SET_CURRENT_PROJECT':
      return { ...state, currentProjectId: action.payload };
    
    case 'SET_DARK_MODE':
      return { ...state, darkMode: action.payload };
    
    case 'SET_AUTO_CREATE_TASKS':
      return { ...state, autoCreateTasks: action.payload };
    
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    
    case 'SET_CURRENT_DATE':
      return { ...state, currentDate: action.payload };
    
    case 'SET_CHART_TYPE_TOGGLE':
      return { ...state, chartTypeToggle: action.payload };
    
    case 'SET_EDITING':
      return { 
        ...state, 
        isEditing: action.payload.isEditing,
        editingEntryIndex: action.payload.index || null
      };
    
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Initialize app
  useEffect(() => {
    async function initializeApp() {
      try {
        await dbService.init();
        
        // Load projects
        const projects = await dbService.loadProjects();
        dispatch({ type: 'SET_PROJECTS', payload: projects });
        
        // Load settings
        const settings = await dbService.loadSettings();
        dispatch({ type: 'SET_DARK_MODE', payload: settings.darkMode || false });
        dispatch({ type: 'SET_AUTO_CREATE_TASKS', payload: settings.autoCreateTasks !== false });
        dispatch({ type: 'SET_ACTIVE_TAB', payload: settings.activeTab || 'entries' });
        
        const currentProjectId = settings.currentProject || 'default';
        if (projects[currentProjectId]) {
          dispatch({ type: 'SET_CURRENT_PROJECT', payload: currentProjectId });
        }
        
        // Load entries and tasks for current project
        await loadProjectData(currentProjectId);
        
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        console.error('Failed to initialize app:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }

    initializeApp();
  }, []);

  // Apply theme
  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [state.darkMode]);

  // Load project data
  const loadProjectData = async (projectId) => {
    try {
      const entries = await dbService.loadEntries(projectId);
      const tasks = await dbService.loadTasks(projectId);
      dispatch({ type: 'SET_ENTRIES', payload: entries });
      dispatch({ type: 'SET_TASKS', payload: tasks });
    } catch (error) {
      console.error('Failed to load project data:', error);
    }
  };

  // Context actions
  const actions = {
    // Entry actions
    addEntry: async (entry) => {
      try {
        const newEntry = await dbService.addEntry(entry, state.currentProjectId);
        dispatch({ type: 'ADD_ENTRY', payload: newEntry });
        return newEntry;
      } catch (error) {
        console.error('Failed to add entry:', error);
        throw error;
      }
    },

    updateEntry: async (index, updates) => {
      try {
        const updatedEntry = { ...state.entries[index], ...updates };
        await dbService.updateEntry(updatedEntry, state.currentProjectId);
        dispatch({ type: 'UPDATE_ENTRY', payload: { index, entry: updatedEntry } });
        return updatedEntry;
      } catch (error) {
        console.error('Failed to update entry:', error);
        throw error;
      }
    },

    deleteEntry: async (index) => {
      try {
        await dbService.deleteEntry(state.entries[index]._id);
        dispatch({ type: 'DELETE_ENTRY', payload: index });
      } catch (error) {
        console.error('Failed to delete entry:', error);
        throw error;
      }
    },

    // Task actions
    addTask: async (task) => {
      try {
        const newTask = await dbService.addTask(task, state.currentProjectId);
        dispatch({ type: 'ADD_TASK', payload: newTask });
        return newTask;
      } catch (error) {
        console.error('Failed to add task:', error);
        throw error;
      }
    },

    updateTask: async (taskId, updates) => {
      try {
        await dbService.updateTask(taskId, updates);
        dispatch({ type: 'UPDATE_TASK', payload: { id: taskId, updates } });
      } catch (error) {
        console.error('Failed to update task:', error);
        throw error;
      }
    },

    deleteTask: async (taskId) => {
      try {
        await dbService.deleteTask(taskId);
        dispatch({ type: 'DELETE_TASK', payload: taskId });
      } catch (error) {
        console.error('Failed to delete task:', error);
        throw error;
      }
    },

    // Project actions
    createProject: async (name) => {
      try {
        const newProject = await dbService.createProject(name);
        dispatch({ type: 'ADD_PROJECT', payload: newProject });
        return newProject;
      } catch (error) {
        console.error('Failed to create project:', error);
        throw error;
      }
    },

    switchProject: async (projectId) => {
      try {
        dispatch({ type: 'SET_CURRENT_PROJECT', payload: projectId });
        await loadProjectData(projectId);
        await dbService.saveSettings({
          darkMode: state.darkMode,
          autoCreateTasks: state.autoCreateTasks,
          currentProject: projectId,
          activeTab: state.activeTab,
        });
      } catch (error) {
        console.error('Failed to switch project:', error);
        throw error;
      }
    },

    updateProject: async (projectId, updates) => {
      try {
        await dbService.updateProject(projectId, updates);
        dispatch({ type: 'UPDATE_PROJECT', payload: { id: projectId, updates } });
      } catch (error) {
        console.error('Failed to update project:', error);
        throw error;
      }
    },

    deleteProject: async (projectId) => {
      try {
        await dbService.deleteProject(projectId);
        dispatch({ type: 'DELETE_PROJECT', payload: projectId });
      } catch (error) {
        console.error('Failed to delete project:', error);
        throw error;
      }
    },

    // Settings actions
    setDarkMode: async (darkMode) => {
      dispatch({ type: 'SET_DARK_MODE', payload: darkMode });
      await dbService.saveSettings({
        darkMode,
        autoCreateTasks: state.autoCreateTasks,
        currentProject: state.currentProjectId,
        activeTab: state.activeTab,
      });
    },

    setAutoCreateTasks: async (autoCreateTasks) => {
      dispatch({ type: 'SET_AUTO_CREATE_TASKS', payload: autoCreateTasks });
      await dbService.saveSettings({
        darkMode: state.darkMode,
        autoCreateTasks,
        currentProject: state.currentProjectId,
        activeTab: state.activeTab,
      });
    },

    setActiveTab: async (activeTab) => {
      dispatch({ type: 'SET_ACTIVE_TAB', payload: activeTab });
      await dbService.saveSettings({
        darkMode: state.darkMode,
        autoCreateTasks: state.autoCreateTasks,
        currentProject: state.currentProjectId,
        activeTab,
      });
    },

    // UI actions
    setCurrentDate: (date) => {
      dispatch({ type: 'SET_CURRENT_DATE', payload: date });
    },

    setChartTypeToggle: (toggle) => {
      dispatch({ type: 'SET_CHART_TYPE_TOGGLE', payload: toggle });
    },

    setEditing: (isEditing, index = null) => {
      dispatch({ type: 'SET_EDITING', payload: { isEditing, index } });
    },

    // Utility actions
    extractTasksFromMarkdown: (noteContent, originEntry) => {
      if (!state.autoCreateTasks) return [];

      const taskRegex = /^\s*[-*+]\s+\[\s*\]\s+(.+)$/gim;
      const tasks = [];
      let match;

      while ((match = taskRegex.exec(noteContent)) !== null) {
        const taskDescription = match[1].trim();
        if (taskDescription) {
          tasks.push(taskDescription);
        }
      }

      return tasks.filter(taskDescription => 
        !state.tasks.find(task => 
          task.description.toLowerCase() === taskDescription.toLowerCase()
        )
      );
    },

    createTasksFromMarkdown: async (noteContent, originEntry) => {
      const newTasks = actions.extractTasksFromMarkdown(noteContent, originEntry);
      
      if (newTasks.length === 0) return;

      const taskPreview = newTasks.join('\n• ');
      const confirmed = confirm(
        `Found ${newTasks.length} new task(s) in your note:\n\n• ${taskPreview}\n\nWould you like to create these tasks?`
      );

      if (!confirmed) return;

      try {
        for (const taskDescription of newTasks) {
          const newTask = {
            description: taskDescription,
            completed: false,
            dateCreated: originEntry.date || new Date().toISOString().split('T')[0],
            originNoteId: originEntry._id,
            originNoteName: originEntry.description,
          };
          await actions.addTask(newTask);
        }
      } catch (error) {
        console.error('Failed to create tasks from markdown:', error);
      }
    },
  };

  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}