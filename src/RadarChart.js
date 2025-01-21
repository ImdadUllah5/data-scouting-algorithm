import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from 'chartjs-plugin-datalabels';
ChartJS.register(ChartDataLabels);


ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const CombinedBarChart = ({ playerData }) => {
  if (!playerData) {
    return <p>No player data available for the bar chart.</p>;
  }

  const { playerName, filteredData, ...metrics } = playerData;

  // Extract labels and values directly from metrics
  const combinedLabels = Object.keys(metrics);
  const combinedValues = Object.values(metrics);



  // Dynamic coloring based on value thresholds
  // Dynamic coloring based on value thresholds with gradient
  const getDynamicColor = (value, max) => {
    const ratio = value / max; // Calculate ratio of value to max
    const red = Math.min(255, Math.floor(255 * (1 - ratio))); // Higher ratio -> less red
    const green = Math.min(255, Math.floor(255 * ratio)); // Higher ratio -> more green
    return `rgb(${red}, ${green}, 0)`; // Create gradient color
  };


  const maxValue = Math.max(...combinedValues);
  // Generate data for the bar chart
  const data = {
    labels: combinedLabels,
    datasets: [
      {
        label: `${playerName} Percentile`,
        data: combinedValues,
        backgroundColor: combinedValues.map((value) => getDynamicColor(value, maxValue)), // Corrected Syntax
      },
    ],
  };


  const options = {
    responsive: true,
    indexAxis:"y", 
    maintainAspectRatio: true,
    aspectRatio: 1.5, // Increase for narrower width (default is 2)
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (tooltipItem) =>
            `${tooltipItem.dataset.label}: ${tooltipItem.raw}`, // Show actual values
        },
      },
      datalabels: {
        align: "start",
        anchor: "start",
        formatter: (value) => value,
        color: "black",
        font: {
          size: 12,
        },
        padding: {
          left: 10,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        
      },
      y: {
        ticks: {
          autoSkip: false,
          padding: 40,
        },
      },
    },
  };
  
  
  

  // Add a custom plugin to draw separating lines between the phases
  const separatorPlugin = {
    id: "phaseSeparator",
    beforeDraw: (chart) => {
      const { ctx, scales, chartArea } = chart;
      const { top, bottom } = scales.y; // Get Y-axis bounds
      const xStart = chartArea.left; // scales.y.left Extend the line to include the label area
      const xEnd = chartArea.right;
  
      const separatorIndices = [8, 20, 26]; // Indices where to draw the separator lines
  
      ctx.save();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)"; // Line color
      ctx.lineWidth = 4; // Line width
  
      separatorIndices.forEach((index) => {
        const yPosition = scales.y.getPixelForValue(index); // Get pixel position for the separator
        ctx.beginPath();
        ctx.moveTo(xStart, yPosition); // Extend to the start of the chart area (labels included)
        ctx.lineTo(xEnd, yPosition); // Extend to the end of the chart area
        ctx.stroke();
      });
  
      ctx.restore();
    },
  };
  

  // Register the plugin
  ChartJS.register(separatorPlugin);

  return (
    <div style={{ margin: "0px", width: "50%", maxWidth: "1000px" }}>

      <Bar data={data} options={options} />
    </div>
  );
};

export default CombinedBarChart;
