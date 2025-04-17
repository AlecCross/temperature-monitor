"use client";
import { useEffect, useState, useRef } from 'react';
import Chart from 'chart.js/auto';

export default function TemperatureDisplay() {
  const [temperatureData, setTemperatureData] = useState([]);
  const [chart, setChart] = useState(null);
  const [selectedSensors, setSelectedSensors] = useState([]);
  const [temperatureHistory, setTemperatureHistory] = useState({});
  const [ipAddress, setIpAddress] = useState('localhost');
  const [connectedIpAddress, setConnectedIpAddress] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const MAX_HISTORY_LENGTH = 5;
  const chartRef = useRef(null);
  const sensorColors = useRef({});

  useEffect(() => {
    if (connectedIpAddress) {
      connectToServer(connectedIpAddress);
    }
  }, [connectedIpAddress]);

  const connectToServer = (ip) => {
    setConnectionStatus('Connecting...');
    const ws = new WebSocket(`ws://${ip}:8080`);

    ws.onmessage = event => {
      const data = JSON.parse(event.data);
      setTemperatureData(data);
      updateTemperatureHistory(data);
      setConnectionStatus('Connected');
    };

    ws.onerror = error => {
      console.error('WebSocket error:', error);
      setConnectionStatus(`Error: ${error.message}`);
    };

    ws.onclose = () => {
      setConnectionStatus('Disconnected');
    };

    return () => ws.close();
  };

  useEffect(() => {
    if (Object.keys(temperatureHistory).length > 0) {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
      createChart();
    }
  }, [temperatureHistory, selectedSensors]);

  const updateTemperatureHistory = (data) => {
    const newHistory = { ...temperatureHistory };
    data.forEach(item => {
      if (!newHistory[item.type]) {
        newHistory[item.type] = [];
      }
      newHistory[item.type].push(item.temperature);
      if (newHistory[item.type].length > MAX_HISTORY_LENGTH) {
        newHistory[item.type].shift();
      }
    });
    setTemperatureHistory(newHistory);
  };

  const createChart = () => {
    const filteredSensors = Object.keys(temperatureHistory).filter(sensor =>
      selectedSensors.length === 0 || selectedSensors.includes(sensor)
    ).filter(sensor => {
      if (sensor.startsWith('modem-mmw') || sensor === 'modem-streamer-usr' || sensor.startsWith('pm8150l-bcl-lvl')) {
        const lastTemperature = temperatureHistory[sensor]?.[temperatureHistory[sensor].length - 1];
        return lastTemperature === undefined || lastTemperature >= -10;
      }
      return true;
    });

    const datasets = filteredSensors.map(sensor => {
      if (!sensorColors.current[sensor]) {
        sensorColors.current[sensor] = `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`;
      }
      return {
        label: sensor,
        data: temperatureHistory[sensor],
        borderColor: sensorColors.current[sensor],
        tension: 0.1
      };
    });

    const ctx = document.getElementById('temperatureChart').getContext('2d');
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array(MAX_HISTORY_LENGTH).fill('').map((_, index) => index + 1),
        datasets: datasets
      },
      options: {
        animation: false,
        scales: {
          y: {
            beginAtZero: false
          }
        }
      }
    });
    setChart(chartRef.current);
    setInterval(updateChart, 1000);
  };

  const updateChart = () => {
    if (chartRef.current) {
      chartRef.current.update();
    }
  };

  const handleSensorChange = (event) => {
    const sensor = event.target.value;
    if (event.target.checked) {
      setSelectedSensors([...selectedSensors, sensor]);
    } else {
      setSelectedSensors(selectedSensors.filter(s => s !== sensor));
    }
  };

  return (
    <div>
      <h1>Temperature Monitoring</h1>
      <div>
        <label>
          IP Address:
          <input
            type="text"
            value={ipAddress}
            onChange={(e) => setIpAddress(e.target.value)}
          />
        </label>
        <button onClick={() => setConnectedIpAddress(ipAddress)}>Connect</button>
      </div>
      <div>
        Status: {connectionStatus}
      </div>
      <div>
        <label>
          <input type="checkbox" value="battery" onChange={handleSensorChange} /> Battery
        </label>
        <label>
          <input type="checkbox" value="cpu-0-0-usr" onChange={handleSensorChange} /> CPU 1
        </label>
        <label>
          <input type="checkbox" value="cpu-1-7-usr" onChange={handleSensorChange} /> CPU 8
        </label>
        <label>
          <input type="checkbox" value="gpuss-0-usr" onChange={handleSensorChange} /> GPU
        </label>
      </div>
      <canvas id="temperatureChart" width="400" height="200"></canvas>
      <ul>
        {temperatureData.filter(item =>
          selectedSensors.length === 0 || selectedSensors.includes(item.type)
        ).filter(item => {
          if (item.type.startsWith('modem-mmw') || item.type === 'modem-streamer-usr' || item.type.startsWith('pm8150l-bcl-lvl')) {
            return item.temperature === undefined || item.temperature >= -10;
          }
          return true;
        }).map(item => (
          <li key={item.type}>
            {item.type}: {item.temperature}°C
          </li>
        ))}
      </ul>
    </div>
  );
}
