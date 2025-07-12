import { useState, useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import './App.css';

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    localStorage.setItem('entries', JSON.stringify(entries));
    renderChart();
  }, [entries]);

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

  const renderChart = () => {
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
  };

  return (
    <div className="tracker">
      <h1>10,000 Hours Tracker (React)</h1>
      <form onSubmit={addEntry} className="entry-form">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
        <input
          type="number"
          step="0.1"
          min="0"
          placeholder="Hours"
          value={hours}
          onChange={e => setHours(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>

      <h2>Total Hours: {totalHours}</h2>
      <div className="progress-bar">
        <div className="progress" style={{ width: `${(totalHours / 10000) * 100}%` }} />
      </div>

      <canvas ref={chartRef} />

      <table className="entries">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Hours</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <tr key={entry.id}>
              <td>{entry.date}</td>
              <td>{entry.description}</td>
              <td>{entry.hours}</td>
              <td>
                <button onClick={() => deleteEntry(entry.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
