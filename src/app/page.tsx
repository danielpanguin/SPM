'use client';

import { useState } from 'react';
import GanttChart from '@/components/ui/GanttChart';
import LoginSimulator from '@/components/forms/LoginSimulator';
import { UserProvider } from '@/hooks/useAuth';
import TaskDashboard from '@/components/tasks/TaskDashboard';

type MainTab = 'gantt' | 'tasks';

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [tab, setTab] = useState<MainTab>('gantt');

  return (
    <UserProvider>
      <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {/* Login + Top Bar */}
        <div
          className={`sticky top-0 z-50 border-b transition-colors ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between h-16 px-3 sm:px-6">
            {/* Tabs */}
            <div className="flex items-center gap-2">
              <TabButton
                active={tab === 'gantt'}
                onClick={() => setTab('gantt')}
                isDarkMode={isDarkMode}
              >
                Gantt
              </TabButton>
              <TabButton
                active={tab === 'tasks'}
                onClick={() => setTab('tasks')}
                isDarkMode={isDarkMode}
              >
                Tasks
              </TabButton>
            </div>

            <div className="flex items-center gap-4">
              <LoginSimulator isDarkMode={isDarkMode} />

              {/* Dark Mode Toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg border transition-colors ${
                  isDarkMode
                    ? 'border-gray-600 hover:bg-gray-700 text-gray-300'
                    : 'border-gray-300 hover:bg-gray-50 text-gray-600'
                }`}
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="p-3 sm:p-6">
          {tab === 'gantt' ? (
            <GanttChart isDarkMode={isDarkMode} />
          ) : (
            <div className={`${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
              <TaskDashboard />
            </div>
          )}
        </main>
      </div>
    </UserProvider>
  );
}

function TabButton({
  active,
  onClick,
  isDarkMode,
  children,
}: {
  active: boolean;
  onClick: () => void;
  isDarkMode: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
        active
          ? isDarkMode
            ? 'bg-gray-700 border-gray-600 text-white'
            : 'bg-white border-gray-300 text-gray-900'
          : isDarkMode
          ? 'border-transparent text-gray-300 hover:bg-gray-700'
          : 'border-transparent text-gray-600 hover:bg-gray-100',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
