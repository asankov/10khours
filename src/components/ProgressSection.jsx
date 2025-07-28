import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { useApp } from '../contexts/AppContext';

Chart.register(...registerables);

function ProgressSection() {
  const { state, actions } = useApp();
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const goalHours = 10000;

  const totalHours = state.entries.reduce((sum, entry) => sum + entry.hours, 0);
  const percentage = Math.min((totalHours / goalHours) * 100, 100);

  useEffect(() => {
    if (chartRef.current) {
      renderChart();
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [state.entries, state.chartTypeToggle, state.darkMode]);

  const renderChart = () => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    
    // Get theme colors
    const textColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--text-color')
      .trim() || '#111827';
    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--primary-color')
      .trim() || '#111827';

    // Sort entries by date ascending for the chart
    const sortedEntries = [...state.entries].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Aggregate hours per day for cleaner chart
    const dailyHours = {};
    sortedEntries.forEach((entry) => {
      dailyHours[entry.date] = (dailyHours[entry.date] || 0) + entry.hours;
    });

    // Create chart data points based on aggregated daily hours
    let runningTotal = 0;
    const sortedDates = Object.keys(dailyHours).sort((a, b) => new Date(a) - new Date(b));

    const labels = [];
    const cumulativeHoursData = [];
    const dataPoints = [];

    sortedDates.forEach((date) => {
      runningTotal += dailyHours[date];
      labels.push(date);
      cumulativeHoursData.push(runningTotal);

      dataPoints.push({
        x: new Date(date),
        y: runningTotal,
      });
    });

    // Configure options based on chart type
    const chartOptions = {
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: false,
            text: 'Cumulative Hours',
            color: textColor,
          },
          ticks: {
            color: textColor,
          },
          grid: {
            color: state.darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          },
        },
        x: {
          title: {
            display: true,
            text: 'Date',
            color: textColor,
          },
          ticks: {
            color: textColor,
          },
          grid: {
            color: state.darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          },
        },
      },
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textColor,
          },
        },
      },
    };

    // Add time scale specific options if needed
    if (state.chartTypeToggle) {
      chartOptions.scales.x.type = 'time';
      chartOptions.scales.x.time = {
        unit: 'day',
        displayFormats: {
          day: 'MMM dd',
        },
        tooltipFormat: 'MMM dd, yyyy',
      };
    }

    // Create the appropriate chart configuration
    const chartConfig = {
      type: 'line',
      options: chartOptions,
    };

    // Set data based on chart type
    if (state.chartTypeToggle) {
      chartConfig.data = {
        datasets: [
          {
            label: 'Cumulative Hours Spent',
            data: dataPoints,
            borderColor: primaryColor,
            backgroundColor: state.darkMode
              ? 'rgba(99, 102, 241, 0.1)'
              : 'rgba(17, 24, 39, 0.05)',
            tension: 0.1,
            fill: true,
          },
        ],
      };
    } else {
      chartConfig.data = {
        labels: labels,
        datasets: [
          {
            label: 'Cumulative Hours Spent',
            data: cumulativeHoursData,
            borderColor: primaryColor,
            backgroundColor: state.darkMode
              ? 'rgba(99, 102, 241, 0.1)'
              : 'rgba(17, 24, 39, 0.05)',
            tension: 0.1,
            fill: true,
          },
        ],
      };
    }

    // Create chart instance
    chartInstanceRef.current = new Chart(ctx, chartConfig);
  };

  return (
    <section className="card progress-card">
      <div className="card-body">
        <h2>Your Progress</h2>
        <p className="progress-subtitle">
          You've logged{' '}
          <span className="font-bold">{totalHours.toFixed(1)}</span>{' '}
          hours so far. Keep going!
        </p>

        <div className="progress-outer">
          <div 
            className="progress-inner" 
            style={{ width: `${percentage}%` }}
          ></div>
        </div>

        <div className="chart-controls flex justify-end items-center mt-6 mb-2">
          <span className="text-sm mr-2">Evenly spaced</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={state.chartTypeToggle}
              onChange={(e) => actions.setChartTypeToggle(e.target.checked)}
            />
            <span className="slider round"></span>
          </label>
          <span className="text-sm ml-2">Time-based</span>
        </div>

        <div className="chart-container mt-8">
          <canvas ref={chartRef}></canvas>
        </div>
      </div>
    </section>
  );
}

export default ProgressSection;