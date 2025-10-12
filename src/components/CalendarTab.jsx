import React from 'react';
import { useApp } from '../contexts/AppContext';

function CalendarTab() {
  const { state, actions } = useApp();

  const getLearningHoursForDate = (dateString) => {
    let totalHours = 0;
    state.entries.forEach((entry) => {
      if (entry.date === dateString) {
        totalHours += parseFloat(entry.hours);
      }
    });
    return totalHours;
  };

  const getWorkEntryForDate = (dateString) => {
    return state.entries.find(
      (entry) => entry.date === dateString && entry.description === 'Work'
    );
  };

  const handleWorkToggle = async (dateString, dayOfWeek) => {
    // Only allow work button on weekdays (Monday = 1, Friday = 5)
    if (dayOfWeek === 0 || dayOfWeek === 6) return;

    const workEntry = getWorkEntryForDate(dateString);
    
    try {
      if (workEntry) {
        // Delete the work entry
        const entryIndex = state.entries.findIndex(e => e._id === workEntry._id);
        if (entryIndex !== -1) {
          await actions.deleteEntry(entryIndex);
        }
      } else {
        // Add a new work entry
        await actions.addEntry({
          date: dateString,
          description: 'Work',
          hours: 8,
          notes: undefined,
        });
      }
    } catch (error) {
      console.error('Failed to toggle work entry:', error);
      alert('Failed to update work entry. Please try again.');
    }
  };

  const renderCalendar = () => {
    const firstDayOfMonth = new Date(
      state.currentDate.getFullYear(),
      state.currentDate.getMonth(),
      1
    );
    const lastDayOfMonth = new Date(
      state.currentDate.getFullYear(),
      state.currentDate.getMonth() + 1,
      0
    );
    const startDay = (firstDayOfMonth.getDay() + 6) % 7; // 0 for Monday, 1 for Tuesday, ..., 6 for Sunday
    const totalDays = lastDayOfMonth.getDate();

    const days = [];

    // Add empty divs for preceding days
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`}></div>);
    }

    // Add days of the month
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(
        state.currentDate.getFullYear(),
        state.currentDate.getMonth(),
        day
      );
      
      // Manually format to YYYY-MM-DD to avoid timezone issues with toISOString
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const dayOfMonth = date.getDate().toString().padStart(2, '0');
      const formattedDate = `${year}-${month}-${dayOfMonth}`;

      const hoursForDay = getLearningHoursForDate(formattedDate);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const isWorkingDay = dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
      const workEntry = getWorkEntryForDate(formattedDate);
      const hasWorkEntry = !!workEntry;

      const today = new Date();
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

      let dayClasses = 'p-2 border border-gray-200 rounded flex flex-col items-center justify-between min-h-[80px]';
      let dateClasses = 'font-bold text-lg';
      let hoursClasses = 'text-sm';

      if (hoursForDay > 0) {
        dayClasses += ' bg-black text-white';
        dateClasses += ' text-white';
        hoursClasses += ' text-white';
      } else {
        dayClasses += ' bg-white';
        dateClasses += ' text-black';
      }

      days.push(
        <div key={day} className={dayClasses}>
          <span className={dateClasses}>{day}</span>
          <span className={hoursClasses}>
            {hoursForDay > 0 ? `${hoursForDay} hrs` : ''}
          </span>
          {isWorkingDay && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleWorkToggle(formattedDate, dayOfWeek);
              }}
              className={`mt-1 px-2 py-1 text-xs rounded ${
                hasWorkEntry 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
              title={hasWorkEntry ? 'Remove Work entry' : 'Add Work entry (8 hrs)'}
            >
              Work
            </button>
          )}
        </div>
      );
    }

    return days;
  };

  const handlePrevMonth = () => {
    const newDate = new Date(state.currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    actions.setCurrentDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(state.currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    actions.setCurrentDate(newDate);
  };

  const currentMonthYear = state.currentDate.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-xl font-semibold">Learning Calendar</h2>
      </div>
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <button className="btn btn-secondary" onClick={handlePrevMonth}>
            &lt; Prev
          </button>
          <h3 className="text-lg font-semibold">{currentMonthYear}</h3>
          <button className="btn btn-secondary" onClick={handleNextMonth}>
            Next &gt;
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-gray-700 dark:text-gray-300 mb-2">
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
          <div>Sun</div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {renderCalendar()}
        </div>
      </div>
    </div>
  );
}

export default CalendarTab;