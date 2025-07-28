import React from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import Header from './components/Header';
import ProgressSection from './components/ProgressSection';
import TabSection from './components/TabSection';
import './index.css';

function AppContent() {
  const { state } = useApp();

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: 'var(--text-color)' }}></div>
          <p className="mt-4" style={{ color: 'var(--dark-gray)' }}>Loading your 10k hours tracker...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <div className="container mx-auto p-4 md:p-8" style={{ maxWidth: '80%' }}>
        {!state.isEditing && (
          <>
            <ProgressSection />
            <TabSection />
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;