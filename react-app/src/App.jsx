import { useState, useEffect, useRef, useCallback } from 'react';
import { Chart } from 'chart.js/auto';

function App() {
  const [entries, setEntries] = useState(() => {
    const stored = localStorage.getItem('entries');
    return stored ? JSON.parse(stored) : [];
  });
  const [date, setDate] = useState('');
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    localStorage.setItem('entries', JSON.stringify(entries));
    renderChart();
  }, [entries, renderChart]);

  const addEntry = e => {
    e.preventDefault();
    if (!date || !hours) return;
    const newEntry = { id: Date.now(), date, hours: parseFloat(hours), description };
    setEntries([...entries, newEntry]);
    setDate('');
    setHours('');
    setDescription('');
  };

  const deleteEntry = id => {
    setEntries(entries.filter(e => e.id !== id));
  };

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);

  const renderChart = useCallback(() => {
    if (!chartRef.current) return;
    const ctx = chartRef.current.getContext('2d');
    const dataMap = {};
    entries.forEach(entry => {
      dataMap[entry.date] = (dataMap[entry.date] || 0) + entry.hours;
    });
    const labels = Object.keys(dataMap).sort();
    let cumulative = 0;
    const data = labels.map(d => {
      cumulative += dataMap[d];
      return { x: d, y: cumulative };
    });

    if (chartInstance.current) {
      chartInstance.current.data.labels = labels;
      chartInstance.current.data.datasets[0].data = data.map(p => p.y);
      chartInstance.current.update();
      return;
    }

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Cumulative Hours',
            data: data.map(p => p.y),
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1,
            fill: false,
          },
        ],
      },
      options: {
        scales: {
          x: { title: { display: true, text: 'Date' } },
          y: { title: { display: true, text: 'Hours' }, beginAtZero: true },
        },
      },
    });
  }, [entries]);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">10,000 Hours Tracker (React)</h1>
      <form onSubmit={addEntry} className="flex flex-wrap items-end gap-2">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
          className="border rounded p-2"
        />
        <input
          type="number"
          step="0.1"
          min="0"
          placeholder="Hours"
          value={hours}
          onChange={e => setHours(e.target.value)}
          required
          className="border rounded p-2 w-24"
        />
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="flex-1 border rounded p-2"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-3 py-2 rounded"
        >
          Add
        </button>
      </form>

      <h2 className="text-lg font-semibold">Total Hours: {totalHours}</h2>
      <div className="bg-gray-200 h-4 rounded w-full">
        <div
          className="bg-green-500 h-full rounded"
          style={{ width: `${(totalHours / 10000) * 100}%` }}
        />
      </div>

      <canvas ref={chartRef} className="w-full" />

      <table className="w-full border-collapse">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2 text-left">Date</th>
            <th className="border p-2 text-left">Description</th>
            <th className="border p-2 text-right">Hours</th>
            <th className="border p-2" />
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <tr key={entry.id}>
              <td className="border p-2">{entry.date}</td>
              <td className="border p-2">{entry.description}</td>
              <td className="border p-2 text-right">{entry.hours}</td>
              <td className="border p-2 text-center">
                <button
                  onClick={() => deleteEntry(entry.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
