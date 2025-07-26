import { getFullChartConfig } from './save.js';
import { makeDraggableAndResizable } from './drag_resize.js';
import { addWidgetButton } from './widget_manager.js';

// Main Chart.js rendering function
export function renderChartToCanvas(chartData, chartType = 'bar', shouldSave = true) {
  if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded!');
    return;
  }

  const widgetId = chartData?.id || `widget-${Date.now()}`;
  const chartTitle = chartData?.title || 'Untitled Chart';

  const chartContainer = document.createElement('div');
  chartContainer.classList.add('chart-widget', 'small-chart');
  chartContainer.dataset.widgetId = widgetId;

  const canvas = document.createElement('canvas');
  chartContainer.appendChild(canvas);

  chartContainer.style.width = chartData.width || '200px';
  chartContainer.style.height = chartData.height || '150px';
  chartContainer.style.left = chartData.left || '20px';
  chartContainer.style.top = chartData.top || '20px';
  chartContainer.setAttribute('data-x', chartData.left || 0);
  chartContainer.setAttribute('data-y', chartData.top || 0);

  document.getElementById('dashboardCanvas').appendChild(chartContainer);

  const existingWidgets = document.querySelectorAll('.chart-widget').length;
  chartContainer.style.zIndex = 10 + existingWidgets;

  let labels = [];
  let datasetData = [];

  // ⚡️ Handle labels/data differently for different chart types
  if (['pie', 'doughnut'].includes(chartType)) {
    labels = chartData.seriesData.map(item => item.name);
    datasetData = chartData.seriesData.map(item => item.value);
  } else if (chartType === 'scatter') {
    labels = [];  // No labels needed
    datasetData = chartData.seriesData[0].data; // [{x: , y: }, ...]
  } else if (chartType === 'radar') {
    if (Array.isArray(chartData.indicator)) {
      labels = chartData.indicator.map(i => i.name);
    } else if (Array.isArray(chartData.xAxisData)) {
      labels = chartData.xAxisData;
    } else {
      labels = [];
    }
    datasetData = chartData.seriesData?.[0]?.data || [];
  } else {
    labels = chartData.xAxisData || chartData.seriesData[0].data.map((_, i) => `Item ${i + 1}`);
    datasetData = chartData.seriesData[0].data;
  }

  const backgroundColors = [
    'rgba(54, 162, 235, 0.7)',
    'rgba(255, 99, 132, 0.7)',
    'rgba(75, 192, 192, 0.7)',
    'rgba(255, 159, 64, 0.7)',
    'rgba(153, 102, 255, 0.7)'
  ];

  const config = {
    type: chartType,
    data: {
      labels: labels,
      datasets: [{
        label: (chartType !== 'pie' && chartType !== 'doughnut') ? (chartData.seriesData[0].name || 'Value') : '',
        data: datasetData,
        backgroundColor: ['pie', 'doughnut'].includes(chartType)
          ? chartData.seriesData.map(item => item.backgroundColor || backgroundColors[0])
          : (Array.isArray(chartData.seriesData[0].backgroundColor)
            ? chartData.seriesData[0].backgroundColor
            : chartData.seriesData[0].backgroundColor || backgroundColors[0]),
        borderColor: ['pie', 'doughnut'].includes(chartType)
          ? chartData.seriesData.map(item => item.borderColor || 'rgba(54, 162, 235, 1)')
          : (Array.isArray(chartData.seriesData[0].borderColor)
            ? chartData.seriesData[0].borderColor
            : chartData.seriesData[0].borderColor || 'rgba(54, 162, 235, 1)'),
        borderWidth: 1,
        pointBackgroundColor: 'rgba(54, 162, 235, 1)',
        tension: chartType === 'line' ? 0.4 : 0,
        // Extra settings for scatter and radar
        showLine: chartType === 'scatter' ? false : undefined,
        fill: chartType === 'radar' ? true : false
      }]
    },
    options: getChartOptions(chartType, chartTitle, chartData.xAxisLabel || '', chartData.yAxisLabel || '')
  };

  const chart = new Chart(canvas, config);
  chartContainer._chartInstance = chart;

  makeDraggableAndResizable(chartContainer, chart);
  addWidgetButton(chartType, chartTitle, chartContainer, chartData);

  if (shouldSave) {
    const fullConfig = getFullChartConfig(chart);
    const saved = JSON.parse(sessionStorage.getItem('widgets') || '[]');
    saved.push({
      id: widgetId,
      type: chartType,
      config: fullConfig,
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
        display: ['pie', 'doughnut', 'radar'].includes(chartType),
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
        displayColors: ['pie', 'doughnut'].includes(chartType),
        callbacks: {
          label: function (context) {
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
            display: !!xAxisLabel,
            text: xAxisLabel,
            font: { size: 9 }
          },
          ticks: { font: { size: 8 }, maxRotation: 45, minRotation: 45 },
          grid: { display: false }
        },
        y: {
          title: {
            display: !!yAxisLabel,
            text: yAxisLabel,
            font: { size: 9 }
          },
          beginAtZero: true,
          ticks: { font: { size: 8 } },
          grid: { color: 'rgba(0, 0, 0, 0.05)' }
        }
      },
      elements: {
        bar: { borderRadius: 2 }
      }
    };
  }

  if (chartType === 'scatter') {
    return {
      ...commonOptions,
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: {
            display: !!xAxisLabel,
            text: xAxisLabel,
            font: { size: 9 }
          },
          ticks: { font: { size: 8 } }
        },
        y: {
          title: {
            display: !!yAxisLabel,
            text: yAxisLabel,
            font: { size: 9 }
          },
          ticks: { font: { size: 8 } }
        }
      }
    };
  }

  if (chartType === 'radar') {
    return {
      ...commonOptions,
      scales: {
        r: {
          angleLines: { display: true },
          suggestedMin: 0,
          suggestedMax: 100,
          pointLabels: { font: { size: 8 } },
          ticks: { backdropPadding: 2, font: { size: 8 } }
        }
      }
    };
  }

  return commonOptions; // pie, doughnut
}
