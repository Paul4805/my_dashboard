import { getFullChartConfig } from './save.js';
import { makeDraggableAndResizable } from './drag_resize.js';
import { addWidgetButton } from './widget_manager.js';

// Main Chart.js rendering function
export function renderChartToCanvas(chartData, chartType = 'bar', shouldSave = true) {
  if (typeof Chart === 'undefined') {
    
    return;
  }

  const widgetId = chartData?.id || `widget-${Date.now()}`;
  const chartTitle = chartData?.title || 'Untitled Chart';

  // Create chart container
  const chartContainer = document.createElement('div');
  chartContainer.classList.add('chart-widget', 'small-chart');
  chartContainer.dataset.widgetId = widgetId;

  // Create canvas
  const canvas = document.createElement('canvas');
  chartContainer.appendChild(canvas);

  // Styling
  chartContainer.style.width = chartData.width || '200px';
  chartContainer.style.height = chartData.height || '150px';
  chartContainer.style.left = chartData.left || '20px';
  chartContainer.style.top = chartData.top || '20px';
  chartContainer.setAttribute('data-x', chartData.left || 0);
  chartContainer.setAttribute('data-y', chartData.top || 0);

  document.getElementById('dashboardCanvas').appendChild(chartContainer);

  const existingWidgets = document.querySelectorAll('.chart-widget').length;
  chartContainer.style.zIndex = 10 + existingWidgets;

  // Prepare data
  let labels, datasetData;
  if (chartType === 'pie') {
    labels = chartData.seriesData.map(item => item.name);
    datasetData = chartData.seriesData.map(item => item.value);
  } else {
    labels = chartData.xAxisData || chartData.seriesData[0].data.map((_, i) => `Item ${i + 1}`);
    datasetData = chartData.seriesData[0].data;
  }

  // Colors
  const backgroundColors = [
    'rgba(54, 162, 235, 0.7)',
    'rgba(255, 99, 132, 0.7)',
    'rgba(75, 192, 192, 0.7)',
    'rgba(255, 159, 64, 0.7)',
    'rgba(153, 102, 255, 0.7)'
  ];

  // Chart config
  // Chart config
  const config = {
    type: chartType,
    data: {
      labels: labels,
      datasets: [{
        label: chartType !== 'pie' ? (chartData.seriesData[0].name || 'Value') : '',
        data: datasetData,
        backgroundColor: chartType === 'pie' 
          ? chartData.seriesData.map(item => item.backgroundColor || backgroundColors[0]) 
          : (Array.isArray(chartData.seriesData[0].backgroundColor) 
              ? chartData.seriesData[0].backgroundColor 
              : chartData.seriesData[0].backgroundColor || backgroundColors[0]),
        borderColor: chartType === 'pie' 
          ? chartData.seriesData.map(item => item.borderColor || 'rgba(54, 162, 235, 1)') 
          : (Array.isArray(chartData.seriesData[0].borderColor) 
              ? chartData.seriesData[0].borderColor 
              : chartData.seriesData[0].borderColor || 'rgba(54, 162, 235, 1)'),
        borderWidth: 1,
        pointBackgroundColor: 'rgba(54, 162, 235, 1)',
        tension: chartType === 'line' ? 0.4 : 0
      }]
    },
    options: getChartOptions(chartType, chartTitle, chartData.xAxisLabel || '', chartData.yAxisLabel || '')
  };

  const chart = new Chart(canvas, config);
  chartContainer._chartInstance = chart;

  makeDraggableAndResizable(chartContainer, chart);
  addWidgetButton(chartType, chartTitle, chartContainer, chartData);

  // ✅ Only save if shouldSave is true
  if (shouldSave) {
    const fullConfig = getFullChartConfig(chart);
   
    const saved = JSON.parse(sessionStorage.getItem('widgets') || '[]');
    saved.push({
      id: widgetId,
      type: chartType,
      config: getFullChartConfig(chart),
      width: chartContainer.style.width || '200px',
      height: chartContainer.style.height || '150px',
      left: chartContainer.style.left || '20px',
      top: chartContainer.style.top || '20px'
    });
    sessionStorage.setItem('widgets', JSON.stringify(saved));
   
  }


  return chartContainer;
}


// Chart options configuration
function getChartOptions(chartType, title, xAxisLabel = '', yAxisLabel = '') {
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: chartType === 'pie',
        position: 'right',
        labels: { 
          boxWidth: 10, 
          font: { size: 8 }, 
          padding: 5 
        }
      },
      title: {
        display: true,
        text: title,
        font: { size: 10 },
        padding: { top: 5, bottom: 5 }
      },
      tooltip: {
        bodyFont: { size: 9 },
        titleFont: { size: 9 },
        padding: 8,
        displayColors: chartType === 'pie',
        callbacks: {
          label: function(context) {
            return `${context.label}: ${context.raw}`;
          }
        }
      }
    }
  };

  if (chartType === 'bar' || chartType === 'line') {
    return {
      ...commonOptions,
      scales: {
        x: {
          title: {
            display: !!xAxisLabel, // Only display if label exists
            text: xAxisLabel,
            font: {
              size: 9
            }
          },
          ticks: { 
            maxRotation: 45, 
            minRotation: 45, 
            font: { size: 8 } 
          },
          grid: { display: false }
        },
        y: {
          title: {
            display: !!yAxisLabel, // Only display if label exists
            text: yAxisLabel,
            font: {
              size: 9
            }
          },
          beginAtZero: true,
          ticks: { font: { size: 8 } },
          grid: { color: 'rgba(0, 0, 0, 0.05)' }
        }
      },
      elements: { 
        bar: { 
          borderRadius: 2 
        } 
      }
    };
  }

  if (chartType === 'line') {
    return {
      ...commonOptions,
      scales: {
        x: {
          title: {
            display: !!xAxisLabel,
            text: xAxisLabel,
            font: {
              size: 9
            }
          },
          ticks: { font: { size: 8 } }, 
          grid: { display: false } 
        },
        y: {
          title: {
            display: !!yAxisLabel,
            text: yAxisLabel,
            font: {
              size: 9
            }
          },
          ticks: { font: { size: 8 } } 
        }
      },
      elements: {
        line: { 
          borderWidth: 2, 
          fill: false 
        },
        point: { 
          radius: 3, 
          hoverRadius: 5 
        }
      }
    };
  }

  return commonOptions;
}