import React from 'react';
import { useApp } from '../contexts/AppContext';
import EntriesTab from './EntriesTab';
import TasksTab from './TasksTab';
import CalendarTab from './CalendarTab';

function TabSection() {
  const { state, actions } = useApp();

  const tabs = [
    { id: 'entries', label: 'Learning Entries', component: EntriesTab },
    { id: 'tasks', label: 'Tasks', component: TasksTab },
    { id: 'calendar', label: 'Calendar', component: CalendarTab },
  ];

  const activeTabData = tabs.find(tab => tab.id === state.activeTab);
  const ActiveComponent = activeTabData?.component;

  return (
    <section className="card">
      <div className="card-header">
        <div className="flex border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-button px-4 py-2 font-medium border-b-2 border-transparent hover:border-gray-300 ${
                state.activeTab === tab.id ? 'active' : ''
              }`}
              onClick={() => actions.setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="tab-content">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </section>
  );
}

export default TabSection;