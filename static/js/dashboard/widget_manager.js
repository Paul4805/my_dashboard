import {saveDashboardState} from './save.js';
import {darkenColor} from './helper.js';
import {showNotification} from './helper.js';

export function addWidgetButton(chartType, chartTitle, targetElement = null, chartConfig = {}) {
  const btn = document.createElement('button');
  btn.className = 'widget-btn';
  btn.dataset.widgetId = targetElement?.dataset?.widgetId || '';

  const displayTitle = chartTitle || chartConfig?.title || 'Untitled';
  const displayType = chartType || 'chart';

  btn.textContent = `${displayType.toUpperCase()} - ${displayTitle}`;

  if (targetElement) {
    targetElement._widgetButton = btn;
    btn.addEventListener('click', () => {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetElement.style.outline = '2px solid #3498db';
      setTimeout(() => (targetElement.style.outline = ''), 1500);
      populateChartCustomization(displayType, chartConfig, targetElement);
    });
  }

  document.getElementById('widgetListBar').appendChild(btn);
  return btn;
}




function populateChartCustomization(chartType, config, chartElement) {
  const container = document.getElementById('chartCustomControls');
  container.dataset.targetId = chartElement.dataset.widgetId;

  const title = config?.title || '';
  const xAxis = config?.xAxisLabel || '';
  const yAxis = config?.yAxisLabel || '';
  const datasetName = config?.seriesData?.[0]?.name || 'Series';
  const fontSize = config?.fontSize || 10;

  container.innerHTML = `
    <div class="customization-header">
      <h4>Customize ${chartType.toUpperCase()}</h4>
      <button class="icon-btn" onclick="deleteCurrentWidget()">🗑️</button>
      </button>
    </div>
    <br>

    <label>Chart Title:</label>
    <input type="text" id="chart-title-input" value="${title}" /><br/>
    <br>
    <label>Title Font Size:</label>
    <input type="number" id="title-font-size-input" value="${fontSize}" min="8" max="30"/><br/>
    <br>
  `;

  if (chartType !== 'pie') {
    container.innerHTML += `
      <label>X-Axis Label:</label>
      <input type="text" id="xaxis-input" value="${xAxis}" /><br/>

      <label>Y-Axis Label:</label>
      <input type="text" id="yaxis-input" value="${yAxis}" /><br/>
    `;
  }

  container.innerHTML += `
    <label>Dataset Name:</label>
    <input type="text" id="dataset-name-input" value="${datasetName}" /><br/>

    <h5>Data Values & Colors:</h5>
    <div id="data-editor"></div>

    <button onclick="applyChartChanges('${chartType}')">Apply Changes</button>
  `;

  const dataEditor = document.getElementById('data-editor');

  if (chartType === 'pie') {
    config.seriesData.forEach((item, idx) => {
      const color = item.color || '#3498db';
      dataEditor.innerHTML += `
        <div style="margin-bottom:5px;">
          <input type="text" value="${item.name}" data-idx="${idx}" class="data-label-input" style="width:100px"/>
          <input type="number" value="${item.value}" data-idx="${idx}" class="data-value-input" style="width:60px"/>
          <input type="color" value="${color}" data-idx="${idx}" class="data-color-input"/>
        </div>
      `;
    });
  } else {
    const labels = config.xAxisData || config.seriesData[0].data.map((_, i) => `Item ${i + 1}`);
    config.seriesData[0].data.forEach((val, idx) => {
      const color = config.seriesData[0].barColors?.[idx] || '#3498db';
      dataEditor.innerHTML += `
        <div style="margin-bottom:5px;">
          <input type="text" value="${labels[idx]}" data-idx="${idx}" class="data-label-input" style="width:100px"/>
          <input type="number" value="${val}" data-idx="${idx}" class="data-value-input" style="width:60px"/>
          <input type="color" value="${color}" data-idx="${idx}" class="data-color-input"/>
        </div>
      `;
    });
  }
}

function deleteCurrentWidget() {
  const container = document.getElementById('chartCustomControls');
  const widgetId = container.dataset.targetId;
  
  if (!widgetId) {
    
    return;
  }

  // 1. Remove the widget from the DOM
  const widgetElement = document.querySelector(`.chart-widget[data-widget-id="${widgetId}"]`);
  if (widgetElement) {
    widgetElement.remove();
  }

  // 2. Remove the associated button from the widget list
  const widgetButton = document.querySelector(`.widget-btn[data-widget-id="${widgetId}"]`);
  if (widgetButton) {
    widgetButton.remove();
  }

  // 3. Remove from session storage
  const savedWidgets = JSON.parse(sessionStorage.getItem('widgets') || '[]');
  const updatedWidgets = savedWidgets.filter(widget => widget.id !== widgetId);
  sessionStorage.setItem('widgets', JSON.stringify(updatedWidgets));

  // 4. Clear the customization panel
  container.innerHTML = '';
  container.dataset.targetId = '';

  // Optional: Show confirmation message
  showNotification('Widget deleted successfully');
}

function applyChartChanges() {
  const container = document.getElementById('chartCustomControls');
  const widgetId = container.dataset.targetId;
  const target = document.querySelector(`.chart-widget[data-widget-id="${widgetId}"]`);
  const chart = target._chartInstance;
  const chartType = chart.config.type;

  // Get input values
  const title = document.getElementById('chart-title-input').value;
  const fontSize = parseInt(document.getElementById('title-font-size-input').value) || 10;
  const xAxis = document.getElementById('xaxis-input')?.value || '';
  const yAxis = document.getElementById('yaxis-input')?.value || '';
  const datasetName = document.getElementById('dataset-name-input').value;

  // Get data values
  const labelInputs = document.querySelectorAll('.data-label-input');
  const valueInputs = document.querySelectorAll('.data-value-input');
  const colorInputs = document.querySelectorAll('.data-color-input');

  const labels = [];
  const data = [];
  const backgroundColors = [];
  const borderColors = [];

  labelInputs.forEach((input, idx) => {
    labels.push(input.value);
    data.push(parseFloat(valueInputs[idx].value) || 0);
    const color = colorInputs[idx].value;
    backgroundColors.push(color);
    // Create slightly darker version for border
    borderColors.push(darkenColor(color, 20));
  });

  // Update chart configuration
  chart.options.plugins.title = {
    display: true,
    text: title,
    font: {
      size: fontSize
    },
    padding: { top: 5, bottom: 5 }
  };

  if (chartType !== 'pie') {
    // Bar/Line chart configuration
    if (!chart.options.scales) {
      chart.options.scales = {};
    }
    
    // X-Axis
    chart.options.scales.x = {
      ...chart.options.scales.x,
      title: {
        display: !!xAxis,
        text: xAxis,
        font: { size: 9 }
      },
      ticks: { 
        maxRotation: 45, 
        minRotation: 45, 
        font: { size: 8 } 
      },
      grid: { display: false }
    };

    // Y-Axis
    chart.options.scales.y = {
      ...chart.options.scales.y,
      title: {
        display: !!yAxis,
        text: yAxis,
        font: { size: 9 }
      },
      beginAtZero: true,
      ticks: { font: { size: 8 } },
      grid: { color: 'rgba(0, 0, 0, 0.05)' }
    };

    // Update dataset
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].label = datasetName;
    chart.data.datasets[0].backgroundColor = backgroundColors;
    chart.data.datasets[0].borderColor = borderColors;
    chart.data.datasets[0].borderWidth = 1;
    
    if (chartType === 'line') {
      chart.data.datasets[0].tension = 0.4;
      chart.data.datasets[0].pointBackgroundColor = borderColors;
    }
  } else {
    // Pie chart configuration
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].backgroundColor = backgroundColors;
    chart.data.datasets[0].borderColor = borderColors;
    chart.data.datasets[0].borderWidth = 1;
    chart.data.datasets[0].label = datasetName;
    
    chart.options.plugins.legend = {
      display: true,
      position: 'right',
      labels: {
        boxWidth: 10,
        font: { size: 8 },
        padding: 5
      }
    };
  }

  // Update the chart
  chart.update();
  // Update button label - use the stored button reference
  if (target._widgetButton) {
    target._widgetButton.textContent = `${chartType.toUpperCase()} - ${title}`;
    target._widgetButton.title = title;
    target._widgetButton.dataset.widgetId = widgetId; // Ensure ID is current
  } else {
    // Fallback - find button by widget ID if reference was lost
    const btn = document.querySelector(`.widget-btn[data-widget-id="${widgetId}"]`);
    if (btn) {
      btn.textContent = `${chartType.toUpperCase()} - ${title}`;
      btn.title = title;
      // Store the reference for future updates
      target._widgetButton = btn;
    }
  }

  // Update sessionStorage
  saveDashboardState();

  
}

window.applyChartChanges = applyChartChanges;
window.deleteCurrentWidget = deleteCurrentWidget;