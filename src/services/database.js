class DatabaseService {
  constructor() {
    this.db = null;
    this.dbReady = false;
    this.DB_NAME = 'LearningTrackerDB';
    this.DB_VERSION = 3;
    this.STORE_NAME = 'entries';
    this.SETTINGS_STORE = 'settings';
    this.PROJECTS_STORE = 'projects';
    this.TASKS_STORE = 'tasks';
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        this.dbReady = true;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        this.db = event.target.result;
        const oldVersion = event.oldVersion;
        console.log(`Upgrading IndexedDB schema from version ${oldVersion} to ${this.DB_VERSION}...`);

        // Create entries store
        if (!this.db.objectStoreNames.contains(this.STORE_NAME)) {
          const entriesStore = this.db.createObjectStore(this.STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });
          entriesStore.createIndex('date', 'date', { unique: false });
          entriesStore.createIndex('description', 'description', { unique: false });
          entriesStore.createIndex('projectId', 'projectId', { unique: false });
        } else if (oldVersion < 2) {
          const transaction = event.target.transaction;
          const entriesStore = transaction.objectStore(this.STORE_NAME);
          if (!entriesStore.indexNames.contains('projectId')) {
            entriesStore.createIndex('projectId', 'projectId', { unique: false });
          }
        }

        // Create settings store
        if (!this.db.objectStoreNames.contains(this.SETTINGS_STORE)) {
          this.db.createObjectStore(this.SETTINGS_STORE, { keyPath: 'key' });
        }

        // Create projects store
        if (!this.db.objectStoreNames.contains(this.PROJECTS_STORE)) {
          this.db.createObjectStore(this.PROJECTS_STORE, { keyPath: 'id' });
        }

        // Create tasks store
        if (!this.db.objectStoreNames.contains(this.TASKS_STORE)) {
          const tasksStore = this.db.createObjectStore(this.TASKS_STORE, {
            keyPath: 'id',
            autoIncrement: true,
          });
          tasksStore.createIndex('projectId', 'projectId', { unique: false });
          tasksStore.createIndex('completed', 'completed', { unique: false });
          tasksStore.createIndex('dateCreated', 'dateCreated', { unique: false });
        } else if (oldVersion < 3) {
          const transaction = event.target.transaction;
          const tasksStore = transaction.objectStore(this.TASKS_STORE);
          if (!tasksStore.indexNames.contains('projectId')) {
            tasksStore.createIndex('projectId', 'projectId', { unique: false });
          }
          if (!tasksStore.indexNames.contains('completed')) {
            tasksStore.createIndex('completed', 'completed', { unique: false });
          }
          if (!tasksStore.indexNames.contains('dateCreated')) {
            tasksStore.createIndex('dateCreated', 'dateCreated', { unique: false });
          }
        }

        console.log('IndexedDB schema created/updated');
      };
    });
  }

  // Entry operations
  async loadEntries(projectId = 'default') {
    return new Promise((resolve, reject) => {
      if (!this.dbReady || !this.db) {
        console.warn('Database not ready, waiting...');
        resolve([]);
        return;
      }

      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);

      if (store.indexNames.contains('projectId')) {
        const index = store.index('projectId');
        const request = index.getAll(projectId);

        request.onsuccess = () => {
          const loadedEntries = request.result || [];
          const entries = loadedEntries.map((entry) => ({
            date: entry.date,
            description: entry.description,
            hours: parseFloat(entry.hours),
            notes: entry.notes,
            _id: entry.id,
          }));
          console.log(`Loaded ${entries.length} entries for project ${projectId}:`, entries);
          resolve(entries);
        };

        request.onerror = () => {
          console.error('Failed to load entries:', request.error);
          reject(request.error);
        };
      } else {
        // Backward compatibility
        const request = store.getAll();

        request.onsuccess = () => {
          const loadedEntries = request.result || [];
          const entries = loadedEntries
            .filter(entry => !entry.projectId || entry.projectId === projectId)
            .map((entry) => ({
              date: entry.date,
              description: entry.description,
              hours: parseFloat(entry.hours),
              notes: entry.notes,
              _id: entry.id,
            }));
          console.log('Loaded entries (backward compatibility):', entries);
          resolve(entries);
        };

        request.onerror = () => {
          console.error('Failed to load entries:', request.error);
          reject(request.error);
        };
      }
    });
  }

  async addEntry(entry, projectId = 'default') {
    return new Promise((resolve, reject) => {
      if (!this.dbReady || !this.db) {
        reject(new Error('Database not ready'));
        return;
      }

      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);

      const entryData = {
        date: entry.date,
        description: entry.description,
        hours: entry.hours,
        notes: entry.notes,
        projectId: projectId,
      };

      const request = store.add(entryData);

      request.onsuccess = () => {
        const newEntry = { ...entry, _id: request.result };
        console.log('Entry added successfully:', newEntry);
        resolve(newEntry);
      };

      request.onerror = () => {
        console.error('Failed to add entry:', request.error);
        reject(request.error);
      };
    });
  }

  async updateEntry(entry, projectId = 'default') {
    return new Promise((resolve, reject) => {
      if (!this.dbReady || !this.db) {
        reject(new Error('Database not ready'));
        return;
      }

      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);

      const entryData = {
        id: entry._id,
        date: entry.date,
        description: entry.description,
        hours: entry.hours,
        notes: entry.notes,
        projectId: projectId,
      };

      const request = store.put(entryData);

      request.onsuccess = () => {
        console.log('Entry updated successfully:', entry);
        resolve(entry);
      };

      request.onerror = () => {
        console.error('Failed to update entry:', request.error);
        reject(request.error);
      };
    });
  }

  async deleteEntry(entryId) {
    return new Promise((resolve, reject) => {
      if (!this.dbReady || !this.db) {
        reject(new Error('Database not ready'));
        return;
      }

      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(entryId);

      request.onsuccess = () => {
        console.log('Entry deleted successfully:', entryId);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to delete entry:', request.error);
        reject(request.error);
      };
    });
  }

  // Task operations
  async loadTasks(projectId = 'default') {
    return new Promise((resolve, reject) => {
      if (!this.dbReady || !this.db) {
        console.warn('Database not ready, waiting...');
        resolve([]);
        return;
      }

      const transaction = this.db.transaction([this.TASKS_STORE], 'readonly');
      const store = transaction.objectStore(this.TASKS_STORE);
      const index = store.index('projectId');
      const request = index.getAll(projectId);

      request.onsuccess = () => {
        const loadedTasks = request.result || [];
        const tasks = loadedTasks.map((task) => ({
          id: task.id,
          description: task.description,
          completed: task.completed,
          dateCreated: task.dateCreated,
          projectId: task.projectId,
          originNoteId: task.originNoteId,
          originNoteName: task.originNoteName,
        }));
        console.log(`Loaded ${tasks.length} tasks for project ${projectId}:`, tasks);
        resolve(tasks);
      };

      request.onerror = () => {
        console.error('Failed to load tasks:', request.error);
        reject(request.error);
      };
    });
  }

  async addTask(task, projectId = 'default') {
    return new Promise((resolve, reject) => {
      if (!this.dbReady || !this.db) {
        reject(new Error('Database not ready'));
        return;
      }

      const transaction = this.db.transaction([this.TASKS_STORE], 'readwrite');
      const store = transaction.objectStore(this.TASKS_STORE);

      const taskData = {
        description: task.description,
        completed: task.completed || false,
        dateCreated: task.dateCreated || new Date().toISOString().split('T')[0],
        projectId: projectId,
        originNoteId: task.originNoteId,
        originNoteName: task.originNoteName,
      };

      const request = store.add(taskData);

      request.onsuccess = () => {
        const newTask = { ...taskData, id: request.result };
        console.log('Task added successfully:', newTask);
        resolve(newTask);
      };

      request.onerror = () => {
        console.error('Failed to add task:', request.error);
        reject(request.error);
      };
    });
  }

  async updateTask(taskId, updates) {
    return new Promise((resolve, reject) => {
      if (!this.dbReady || !this.db) {
        reject(new Error('Database not ready'));
        return;
      }

      const transaction = this.db.transaction([this.TASKS_STORE], 'readwrite');
      const store = transaction.objectStore(this.TASKS_STORE);

      // First get the existing task
      const getRequest = store.get(taskId);

      getRequest.onsuccess = () => {
        const existingTask = getRequest.result;
        if (!existingTask) {
          reject(new Error('Task not found'));
          return;
        }

        const updatedTask = { ...existingTask, ...updates };
        const putRequest = store.put(updatedTask);

        putRequest.onsuccess = () => {
          console.log('Task updated successfully:', updatedTask);
          resolve(updatedTask);
        };

        putRequest.onerror = () => {
          console.error('Failed to update task:', putRequest.error);
          reject(putRequest.error);
        };
      };

      getRequest.onerror = () => {
        console.error('Failed to get task for update:', getRequest.error);
        reject(getRequest.error);
      };
    });
  }

  async deleteTask(taskId) {
    return new Promise((resolve, reject) => {
      if (!this.dbReady || !this.db) {
        reject(new Error('Database not ready'));
        return;
      }

      const transaction = this.db.transaction([this.TASKS_STORE], 'readwrite');
      const store = transaction.objectStore(this.TASKS_STORE);
      const request = store.delete(taskId);

      request.onsuccess = () => {
        console.log('Task deleted successfully:', taskId);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to delete task:', request.error);
        reject(request.error);
      };
    });
  }

  // Project operations
  async loadProjects() {
    return new Promise((resolve, reject) => {
      if (!this.dbReady || !this.db) {
        console.warn('Database not ready for projects');
        resolve({});
        return;
      }

      const transaction = this.db.transaction([this.PROJECTS_STORE], 'readonly');
      const store = transaction.objectStore(this.PROJECTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const projectsArray = request.result || [];
        const projectsMap = {};

        projectsArray.forEach((project) => {
          projectsMap[project.id] = project;
        });

        // Ensure default project exists
        if (!projectsMap['default']) {
          projectsMap['default'] = {
            id: 'default',
            name: 'Default',
            createdAt: new Date().toISOString(),
          };
        }

        console.log('Loaded projects:', projectsMap);
        resolve(projectsMap);
      };

      request.onerror = () => {
        console.error('Failed to load projects:', request.error);
        reject(request.error);
      };
    });
  }

  async createProject(name) {
    const projectId = `project_${Date.now()}`;
    const newProject = {
      id: projectId,
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      if (!this.dbReady || !this.db) {
        reject(new Error('Database not ready'));
        return;
      }

      const transaction = this.db.transaction([this.PROJECTS_STORE], 'readwrite');
      const store = transaction.objectStore(this.PROJECTS_STORE);
      const request = store.add(newProject);

      request.onsuccess = () => {
        console.log('Project created successfully:', newProject);
        resolve(newProject);
      };

      request.onerror = () => {
        console.error('Failed to create project:', request.error);
        reject(request.error);
      };
    });
  }

  async updateProject(projectId, updates) {
    return new Promise((resolve, reject) => {
      if (!this.dbReady || !this.db) {
        reject(new Error('Database not ready'));
        return;
      }

      const transaction = this.db.transaction([this.PROJECTS_STORE], 'readwrite');
      const store = transaction.objectStore(this.PROJECTS_STORE);

      // First get the existing project
      const getRequest = store.get(projectId);

      getRequest.onsuccess = () => {
        const existingProject = getRequest.result;
        if (!existingProject) {
          reject(new Error('Project not found'));
          return;
        }

        const updatedProject = { ...existingProject, ...updates };
        const putRequest = store.put(updatedProject);

        putRequest.onsuccess = () => {
          console.log('Project updated successfully:', updatedProject);
          resolve(updatedProject);
        };

        putRequest.onerror = () => {
          console.error('Failed to update project:', putRequest.error);
          reject(putRequest.error);
        };
      };

      getRequest.onerror = () => {
        console.error('Failed to get project for update:', getRequest.error);
        reject(getRequest.error);
      };
    });
  }

  async deleteProject(projectId) {
    return new Promise((resolve, reject) => {
      if (!this.dbReady || !this.db) {
        reject(new Error('Database not ready'));
        return;
      }

      const transaction = this.db.transaction([this.PROJECTS_STORE, this.STORE_NAME, this.TASKS_STORE], 'readwrite');
      
      // Delete project
      const projectStore = transaction.objectStore(this.PROJECTS_STORE);
      projectStore.delete(projectId);

      // Delete all entries for this project
      const entriesStore = transaction.objectStore(this.STORE_NAME);
      if (entriesStore.indexNames.contains('projectId')) {
        const entriesIndex = entriesStore.index('projectId');
        const entriesRequest = entriesIndex.getAllKeys(projectId);
        
        entriesRequest.onsuccess = () => {
          const keys = entriesRequest.result;
          keys.forEach((key) => {
            entriesStore.delete(key);
          });
        };
      }

      // Delete all tasks for this project
      const tasksStore = transaction.objectStore(this.TASKS_STORE);
      const tasksIndex = tasksStore.index('projectId');
      const tasksRequest = tasksIndex.getAllKeys(projectId);
      
      tasksRequest.onsuccess = () => {
        const keys = tasksRequest.result;
        keys.forEach((key) => {
          tasksStore.delete(key);
        });
      };

      transaction.oncomplete = () => {
        console.log('Project and all related data deleted successfully:', projectId);
        resolve();
      };

      transaction.onerror = () => {
        console.error('Failed to delete project:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  // Settings operations
  async loadSettings() {
    return new Promise((resolve, reject) => {
      if (!this.dbReady || !this.db) {
        console.warn('Database not ready for settings');
        resolve({ darkMode: false, currentProject: 'default' });
        return;
      }

      const transaction = this.db.transaction([this.SETTINGS_STORE], 'readonly');
      const store = transaction.objectStore(this.SETTINGS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const settings = request.result || [];
        const settingsMap = {};

        settings.forEach((setting) => {
          settingsMap[setting.key] = setting.value;
        });

        const result = {
          darkMode: settingsMap.darkMode || false,
          currentProject: settingsMap.currentProject || 'default',
          autoCreateTasks: settingsMap.autoCreateTasks !== false,
          activeTab: settingsMap.activeTab || 'entries',
        };

        console.log('Loaded settings:', result);
        resolve(result);
      };

      request.onerror = () => {
        console.error('Failed to load settings:', request.error);
        resolve({ darkMode: false, currentProject: 'default' });
      };
    });
  }

  async saveSettings(settings) {
    return new Promise((resolve, reject) => {
      if (!this.dbReady || !this.db) {
        console.warn('Database not ready, cannot save settings');
        reject(new Error('Database not ready'));
        return;
      }

      const transaction = this.db.transaction([this.SETTINGS_STORE], 'readwrite');
      const store = transaction.objectStore(this.SETTINGS_STORE);

      const settingsKeys = Object.keys(settings);
      let saveCount = 0;

      settingsKeys.forEach((key) => {
        const request = store.put({
          key: key,
          value: settings[key],
        });

        request.onsuccess = () => {
          saveCount++;
          if (saveCount === settingsKeys.length) {
            console.log('Settings saved to IndexedDB:', settings);
            resolve();
          }
        };

        request.onerror = () => {
          console.error(`Failed to save setting ${key}:`, request.error);
          reject(request.error);
        };
      });
    });
  }
}

export const dbService = new DatabaseService();