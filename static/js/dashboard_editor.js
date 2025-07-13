const zoomRange = document.getElementById('zoomRange');
const zoomValueDisplay = document.getElementById('zoomValue');
const zoomWrapper = document.getElementById('zoomWrapper');
const canvasArea = document.getElementById('canvasArea');

zoomRange.addEventListener('input', () => {
  const zoom = zoomRange.value;
  zoomWrapper.style.transform = `scale(${zoom / 100})`;
  zoomValueDisplay.textContent = `${zoom}%`;

  // Smooth scroll to center after zoom
  setTimeout(() => {
    canvasArea.scrollTo({
      top: (canvasArea.scrollHeight - canvasArea.clientHeight) / 2,
      left: (canvasArea.scrollWidth - canvasArea.clientWidth) / 2,
      behavior: 'smooth'
    });
  }, 100);
});

window.addEventListener('DOMContentLoaded', () => {
  // Initial center scroll
  canvasArea.scrollTo({
    top: (canvasArea.scrollHeight - canvasArea.clientHeight) / 2,
    left: (canvasArea.scrollWidth - canvasArea.clientWidth) / 2
  });
});



function handleCanvasSizeChange() {
  const canvas = document.getElementById('dashboardCanvas');
  const customInputs = document.getElementById('custom-size-inputs');
  const size = document.getElementById('canvas-size').value;

  if (size === 'a4') {
    canvas.style.width = '595px';
    canvas.style.height = '842px';
    customInputs.style.display = 'none';
    sessionStorage.setItem('canvasSize', JSON.stringify({ type: 'a4' }));
  } else if (size === 'a3') {
    canvas.style.width = '842px';
    canvas.style.height = '1191px';
    customInputs.style.display = 'none';
    sessionStorage.setItem('canvasSize', JSON.stringify({ type: 'a3' }));
  } else if (size === 'custom') {
    customInputs.style.display = 'block';
  }
}

function applyCustomSize() {
  const width = document.getElementById('custom-width').value;
  const height = document.getElementById('custom-height').value;
  const canvas = document.getElementById('dashboardCanvas');

  if (width && height) {
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    sessionStorage.setItem('canvasSize', JSON.stringify({
      type: 'custom',
      width: width,
      height: height
    }));
  }
}



// Updated generateDashboard function
async function generateDashboard() {
  const prompt = document.getElementById('dashboardPrompt').value.trim();
  const db_id = document.getElementById('db-select').value;
  const chart_type = document.getElementById('chart-type').value;

  const payload = {
    prompt: prompt,
    db_id: db_id,
    chart_type: chart_type || null
  };

  try {
    const response = await fetch('/dashboard/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const result = await response.json();
    console.log('Dashboard generation result:', result);

    if (result.status === 'success') {

      const intent = result.intent;
      const outputFormat = result.output_format || 'visual'; // For forecasting intent only

      if (intent === 'forecasting') {
        
        if (outputFormat === 'visual' || outputFormat === 'both') {
          renderChartToCanvas(result.echarts_config, "line");
        }

        if (outputFormat === 'text' || outputFormat === 'both') {
          renderTextOutput(result.forecast);
        }

      } else if (intent === 'visualization') {
        renderChartToCanvas(result.echarts_config, result.chart_type);

      } else {
        alert('Unsupported intent. Please try again.');
      }

    } else {
      alert('Dashboard generation failed. Please try again.');
    }

  } catch (error) {
    console.error('Error generating dashboard:', error);
    alert('Something went wrong.');
  }
}


// Main Chart.js rendering function
function renderChartToCanvas(chartData, chartType = 'bar', shouldSave = true) {
  if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded!');
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
    console.log('📦 Saving chart to sessionStorage with config:', fullConfig);
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
    console.log('📦 Dashboard state saved to sessionStorage:', sessionStorage.getItem('widgets'));
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


function getFullChartConfig(chart) {
  if (!chart) return {};

  const isPie = chart.config?.type === 'pie';
  const dataset = chart.data.datasets[0] || {};

  const config = {
    title: chart.options?.plugins?.title?.text || '',
    xAxisLabel: chart.options?.scales?.x?.title?.text || '',
    yAxisLabel: chart.options?.scales?.y?.title?.text || '',
    fontSize: chart.options?.plugins?.title?.font?.size || 10,
    xAxisData: chart.data.labels || [],
    seriesData: []
  };

  if (isPie) {
    config.seriesData = chart.data.labels.map((label, index) => ({
      name: label,
      value: dataset.data?.[index] || 0,
      backgroundColor: Array.isArray(dataset.backgroundColor) 
        ? dataset.backgroundColor[index] 
        : dataset.backgroundColor,
      borderColor: Array.isArray(dataset.borderColor) 
        ? dataset.borderColor[index] 
        : dataset.borderColor
    }));
  } else {
    config.seriesData = [{
      name: dataset.label || '',
      data: dataset.data || [],
      backgroundColor: Array.isArray(dataset.backgroundColor) 
        ? dataset.backgroundColor 
        : [dataset.backgroundColor], // Always store as array for consistency
      borderColor: Array.isArray(dataset.borderColor) 
        ? dataset.borderColor 
        : [dataset.borderColor]
    }];
  }

  console.log(`✅ Extracted config for ${chart.config?.type} chart:`, config);
  return config;
}





function makeDraggableAndResizable(target, chartInstance) {
  // Set initial z-index based on existing widgets
  const existingWidgets = document.querySelectorAll('.chart-widget').length;
  target.style.zIndex = 10 + existingWidgets;
  
  // Track the highest z-index to ensure new widgets stack properly
  let highestZIndex = 10 + existingWidgets;
  
  interact(target)
    .draggable({
      inertia: true,
      modifiers: [
        interact.modifiers.restrictRect({
          restriction: 'parent',
          endOnly: true
        })
      ],
      listeners: {
        start: function(event) {
          // Find the current highest z-index among all widgets
          const widgets = document.querySelectorAll('.chart-widget');
          highestZIndex = Math.max(...Array.from(widgets).map(w => 
            parseInt(window.getComputedStyle(w).zIndex) || 10
          ));
          
          // Set this widget to be on top
          event.target.style.zIndex = highestZIndex + 1;
          event.target.classList.add('active-widget');
        },
        move: function(event) {
          const x = (parseFloat(target.dataset.x) || 0) + event.dx;
          const y = (parseFloat(target.dataset.y) || 0) + event.dy;

          // Update actual position, not transform
          target.style.left = `${x}px`;
          target.style.top = `${y}px`;
          target.dataset.x = x;
          target.dataset.y = y;
        },
        end: function(event) {
          // Keep the widget on top after dragging
          event.target.style.zIndex = highestZIndex + 1;
          event.target.classList.remove('active-widget');
          saveDashboardState();
        }
      }
    })
    .resizable({
      edges: { left: true, right: true, bottom: true, top: true },
      listeners: {
        start: function(event) {
          event.target.classList.add('active-widget');
        },
        move: function(event) {
          // Update size and position
          event.target.style.width = `${event.rect.width}px`;
          event.target.style.height = `${event.rect.height}px`;
          event.target.style.left = `${parseFloat(event.target.dataset.x) + event.deltaRect.left}px`;
          event.target.style.top = `${parseFloat(event.target.dataset.y) + event.deltaRect.top}px`;
          
          if (chartInstance?.resize) {
            chartInstance.resize();
          }
        },
        end: function(event) {
          event.target.classList.remove('active-widget');
          
          saveDashboardState();
        }
      },
      modifiers: [
        interact.modifiers.restrictSize({
          min: { width: 150, height: 100 }
        })
      ],
      inertia: true
    });
}


function addWidgetButton(chartType, chartTitle, targetElement = null, chartConfig = {}) {
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
    console.error('No widget ID found for deletion');
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


// Helper function to darken a color
function darkenColor(color, percent) {
  // Handle both hex and rgb colors
  let r, g, b;
  
  if (color.startsWith('#')) {
    // Hex color
    r = parseInt(color.substring(1, 3), 16);
    g = parseInt(color.substring(3, 5), 16);
    b = parseInt(color.substring(5, 7), 16);
  } else if (color.startsWith('rgb')) {
    // RGB color
    const parts = color.match(/\d+/g);
    r = parseInt(parts[0]);
    g = parseInt(parts[1]);
    b = parseInt(parts[2]);
  } else {
    // Default to gray if color format is unknown
    return '#666666';
  }
  
  // Darken each component
  r = Math.max(0, Math.floor(r * (100 - percent) / 100));
  g = Math.max(0, Math.floor(g * (100 - percent) / 100));
  b = Math.max(0, Math.floor(b * (100 - percent) / 100));
  
  return `rgb(${r}, ${g}, ${b})`;
}


// Helper function to show notifications (optional)
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}


function saveDashboardState() {
  const widgets = [];
  document.querySelectorAll('.chart-widget').forEach(widget => {
    const chart = widget._chartInstance;
    const config = getFullChartConfig(chart);

    widgets.push({
      id: widget.dataset.widgetId,
      type: chart?.config?.type || 'bar',
      left: widget.style.left,
      top: widget.style.top,
      width: widget.style.width,
      height: widget.style.height,
      config: config
    });

    console.log(`✅ Saved config for widget ${widget.dataset.widgetId}:`, config);
  });
  
  sessionStorage.setItem('widgets', JSON.stringify(widgets));
  console.log('📦 Dashboard state saved to sessionStorage:', sessionStorage.getItem('widgets'));
}



// Updated restoreDashboardState
function restoreDashboardState() {
  const savedWidgets = JSON.parse(sessionStorage.getItem('widgets') || '[]');
  
  savedWidgets.forEach(widgetData => {
    try {
      if (!widgetData.config || !widgetData.type) return;

      const chartContainer = renderChartToCanvas(widgetData.config, widgetData.type, false);

      // Restore visual position and size
      chartContainer.style.left = widgetData.left || '20px';
      chartContainer.style.top = widgetData.top || '20px';
      chartContainer.style.width = widgetData.width || '200px';
      chartContainer.style.height = widgetData.height || '150px';

      // Crucial: Also sync dataset.x/y for interact.js
      chartContainer.dataset.x = parseFloat(widgetData.left) || 0;
      chartContainer.dataset.y = parseFloat(widgetData.top) || 0;

    } catch (error) {
      console.error('Error restoring widget:', widgetData?.id, error);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('=== DASHBOARD INITIALIZATION STARTED ===');
  
  try {
    console.log('1. Checking for saved canvas size...');
    console.log('Retrieving canvasSize from sessionStorage...',sessionStorage.getItem('canvasSize'));
    const savedSize = JSON.parse(sessionStorage.getItem('canvasSize'));
    console.log('Retrieved canvasSize from sessionStorage:', savedSize);
    
    const canvas = document.getElementById('dashboardCanvas');
    const sizeSelect = document.getElementById('canvas-size');
    console.log('Canvas element:', canvas);
    console.log('Size select element:', sizeSelect);

    if (savedSize) {
      console.log('Found saved canvas size configuration');
      
      if (savedSize.type === 'a4') {
        console.log('Setting A4 size (595x842px)');
        canvas.style.width = '595px';
        canvas.style.height = '842px';
        sizeSelect.value = 'a4';
      } else if (savedSize.type === 'a3') {
        console.log('Setting A3 size (842x1191px)');
        canvas.style.width = '842px';
        canvas.style.height = '1191px';
        sizeSelect.value = 'a3';
      } else if (savedSize.type === 'custom') {
        console.log(`Setting custom size (${savedSize.width}x${savedSize.height}px)`);
        canvas.style.width = `${savedSize.width}px`;
        canvas.style.height = `${savedSize.height}px`;
        sizeSelect.value = 'custom';
        const customInputs = document.getElementById('custom-size-inputs');
        customInputs.style.display = 'block';
        document.getElementById('custom-width').value = savedSize.width;
        document.getElementById('custom-height').value = savedSize.height;
        console.log('Custom inputs shown and populated:', customInputs);
      }
    } else {
      console.log('No saved canvas size found, defaulting to A4');
      sizeSelect.value = 'a4';
      handleCanvasSizeChange();
    }

    // Restore widgets if available
    const savedWidgets = sessionStorage.getItem('widgets');
    console.log('Saved widgets from sessionStorage:', sessionStorage.getItem('widgets'));
    console.log('2. Checking for saved widgets...');
    
    if (savedWidgets) {
      try {
        const widgets = JSON.parse(savedWidgets);
        console.log(`Found ${widgets.length} saved widgets:`, widgets);
        console.log('Starting widget restoration...');
        restoreDashboardState();
      } catch (e) {
        console.error('Failed to parse saved widgets:', e);
        console.log('Raw widgets data from storage:', savedWidgets);
      }
    } else {
      console.log('No saved widgets found in sessionStorage');
    }

    // Center view
    console.log('3. Centering canvas view...');
    const centerScroll = () => {
      console.log('Checking scroll dimensions...');
      console.log('Scroll height:', canvasArea.scrollHeight, 'Client height:', canvasArea.clientHeight);
      console.log('Scroll width:', canvasArea.scrollWidth, 'Client width:', canvasArea.clientWidth);
      
      if (canvasArea.scrollHeight > canvasArea.clientHeight || 
          canvasArea.scrollWidth > canvasArea.clientWidth) {
        const targetTop = (canvasArea.scrollHeight - canvasArea.clientHeight) / 2;
        const targetLeft = (canvasArea.scrollWidth - canvasArea.clientWidth) / 2;
        console.log(`Scrolling to position (top: ${targetTop}, left: ${targetLeft})`);
        
        canvasArea.scrollTo({
          top: targetTop,
          left: targetLeft,
          behavior: 'auto'
        });
      } else {
        console.log('No scrolling needed - content fits viewport');
      }
    };

    console.log('Initial centering attempt...');
    centerScroll();
    
    setTimeout(() => {
      console.log('Delayed centering attempt (after 100ms)...');
      centerScroll();
    }, 100);

  } catch (error) {
    console.error('!!! DASHBOARD INITIALIZATION ERROR !!!', error);
    console.log('Falling back to default A4 size');
    document.getElementById('canvas-size').value = 'a4';
    handleCanvasSizeChange();
  }

  // Exit button handler
  console.log('4. Setting up exit button handler...');
  const exitButton = document.querySelector('.exit-editor-btn');
  if (exitButton) {
    exitButton.addEventListener('click', (e) => {
      console.log('Exit button clicked - clearing session and navigating away');
      e.preventDefault();
      clearDashboardSession();
      console.log('Navigating to:', e.target.href);
      window.location.href = e.target.href;
    });
  } else {
    console.warn('Exit button not found in DOM');
  }

  // Optional: Clear on any page unload
  console.log('5. Setting up beforeunload handler...');
  document.querySelector('.exit-editor-btn')?.addEventListener('click', (e) => {
    console.log('Exit button clicked - clearing session');
    clearDashboardSession();
    window.location.href = e.target.href;
  });

  console.log('=== DASHBOARD INITIALIZATION COMPLETE ===');
});

document.addEventListener('DOMContentLoaded', () => {
  // Initialize dashboard save system
  initDashboardSaveSystem();
});

/**
 * Initializes all dashboard save-related functionality
 */
function initDashboardSaveSystem() {
  // Cache DOM elements
  const saveBtn = document.querySelector('.save-btn');
  const modal = document.getElementById('saveDashboardModal');
  const closeBtn = document.getElementById('closeSaveModal');
  const cancelBtn = document.getElementById('cancelSaveBtn');
  const confirmBtn = document.getElementById('confirmSaveBtn');
  const nameInput = document.getElementById('dashboardNameInput');
  const dashboardId = document.getElementById('dashboardId')?.value || '';

  // Event listeners
  saveBtn?.addEventListener('click', handleSaveClick);
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', handleModalBackdropClick);
  confirmBtn?.addEventListener('click', handleDashboardSave);
  nameInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleDashboardSave();
  });

  /**
   * Handles the main save button click
   */
  function handleSaveClick() {
    if (dashboardId) {
      updateDashboard(dashboardId);
    } else {
      openModal();
    }
  }

  /**
   * Opens the save modal and resets the form
   */
  function openModal() {
    if (!modal) return;
    modal.style.display = 'flex';
    nameInput.value = '';
    nameInput.focus();
  }

  /**
   * Closes the save modal
   */
  function closeModal() {
    if (modal) modal.style.display = 'none';
  }

  /**
   * Handles clicks on the modal backdrop
   * @param {Event} e - The click event
   */
  function handleModalBackdropClick(e) {
    if (e.target === modal) {
      closeModal();
    }
  }

  /**
   * Handles the dashboard save process
   */
  async function handleDashboardSave() {
    if (!validateSaveForm()) return;
    
    try {
      const response = await saveDashboardToServer();
      handleSaveResponse(response);
    } catch (error) {
      handleSaveError(error);
    }
  }

  /**
   * Validates the save form
   * @returns {boolean} True if valid, false otherwise
   */
  function validateSaveForm() {
    const dashboardName = nameInput.value.trim();
    if (!dashboardName) {
      alert('Please enter a dashboard name.');
      nameInput.focus();
      return false;
    }
    return true;
  }

  /**
   * Saves the dashboard to the server
   * @returns {Promise<Response>} The fetch response
   */
  async function saveDashboardToServer() {
    saveDashboardState(); // Ensure latest state is saved
    
    const payload = {
      name: nameInput.value.trim(),
      widgets: JSON.parse(sessionStorage.getItem('widgets') || '[]'),
      canvasSize: JSON.parse(sessionStorage.getItem('canvasSize') || '{}')
    };

    return await fetch('/dashboard/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  /**
   * Handles successful save response
   * @param {Response} response - The server response
   */
  async function handleSaveResponse(response) {
    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const data = await response.json();
    alert('Dashboard saved successfully!');
    closeModal();
    console.log('Dashboard saved:', data.dashboard_id);
    
    // Generate thumbnail after a slight delay to allow UI to update
    setTimeout(() => {
      generateAndSendThumbnail(data.dashboard_id);
    }, 100);
  }

  /**
   * Handles save errors
   * @param {Error} error - The error that occurred
   */
  function handleSaveError(error) {
    console.error('Save error:', error);
    alert(`Error saving dashboard: ${error.message}`);
  }
}

/**
 * Updates an existing dashboard
 * @param {string} dashboardId - The ID of the dashboard to update
 */
async function updateDashboard(dashboardId) {
  try {
    saveDashboardState(); // Ensure latest state is saved
    
    const payload = {
      widgets: JSON.parse(sessionStorage.getItem('widgets') || '[]'),
      canvasSize: JSON.parse(sessionStorage.getItem('canvasSize') || '{}')
    };

    const response = await fetch(`/dashboard/update/${dashboardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    alert('✅ Dashboard updated!');
    generateAndSendThumbnail(dashboardId);
  } catch (error) {
    console.error('Update failed:', error);
    alert('⚠️ Error updating dashboard. Please try again.');
  }
}


function updateDashboard(dashboardId) {
    saveDashboardState();
    const widgets = JSON.parse(sessionStorage.getItem('widgets') || '[]');
    const canvasSize = JSON.parse(sessionStorage.getItem('canvasSize') || '{}');

    const payload = {
        widgets: widgets,
        canvasSize: canvasSize
    };

    fetch(`/dashboard/update/${dashboardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (res.ok) {
            alert('✅ Dashboard updated!');
            generateAndSendThumbnail(dashboardId);
        } else {
            alert('⚠️ Update failed');
        }
    })
    .catch(err => {
        console.error('Update failed', err);
        alert('⚠️ Error updating dashboard.');
    });
}



function restoreDashboardFromData(dashboardData) {
  if (!dashboardData) return;

  try {
    const parsedData = typeof dashboardData === 'string' ? JSON.parse(dashboardData) : dashboardData;

    // Clear existing widgets first
    clearAllWidgets();

    // Restore canvas size
    const canvas = document.getElementById('dashboardCanvas');
    const sizeSelect = document.getElementById('canvas-size');

    if (parsedData.canvasSize) {
      if (parsedData.canvasSize.type === 'a4') {
        canvas.style.width = '595px';
        canvas.style.height = '842px';
        sizeSelect.value = 'a4';
      } else if (parsedData.canvasSize.type === 'a3') {
        canvas.style.width = '842px';
        canvas.style.height = '1191px';
        sizeSelect.value = 'a3';
      } else if (parsedData.canvasSize.type === 'custom') {
        canvas.style.width = `${parsedData.canvasSize.width}px`;
        canvas.style.height = `${parsedData.canvasSize.height}px`;
        sizeSelect.value = 'custom';
        document.getElementById('custom-size-inputs').style.display = 'block';
        document.getElementById('custom-width').value = parsedData.canvasSize.width;
        document.getElementById('custom-height').value = parsedData.canvasSize.height;
      }
    }

    // Clear session storage before restoring new widgets
    sessionStorage.removeItem('widgets');

    // Restore widgets
    parsedData.widgets?.forEach(widgetData => {
      if (!widgetData.config || !widgetData.type) return;

      const chartContainer = renderChartToCanvas(widgetData.config, widgetData.type, true); // Set shouldSave to true

      chartContainer.style.left = widgetData.left || '20px';
      chartContainer.style.top = widgetData.top || '20px';
      chartContainer.style.width = widgetData.width || '200px';
      chartContainer.style.height = widgetData.height || '150px';

      chartContainer.dataset.x = parseFloat(widgetData.left) || 0;
      chartContainer.dataset.y = parseFloat(widgetData.top) || 0;
    });

    // Save the restored state
    saveDashboardState();

  } catch (error) {
    console.error("Failed to restore dashboard from data:", error);
  }
  // New helper function to clear all widgets
  function clearAllWidgets() {
    // Remove from DOM
    document.querySelectorAll('.chart-widget').forEach(widget => widget.remove());
    document.querySelectorAll('.widget-btn').forEach(btn => btn.remove());
    
    // Clear customization panel if open
    const customizationPanel = document.getElementById('chartCustomControls');
    if (customizationPanel) {
      customizationPanel.innerHTML = '';
      customizationPanel.dataset.targetId = '';
    }
  }
}

function clearDashboardSession() {
  sessionStorage.removeItem('widgets');
  sessionStorage.removeItem('canvasSize');
  console.log('🧹 Dashboard session storage cleared');
}

function generateAndSendThumbnail(dashboardId) {
    html2canvas(document.getElementById('dashboardCanvas')).then(canvas => {
        const imageData = canvas.toDataURL("image/png");

        fetch('/dashboard/thumbnail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dashboard_id: dashboardId,
                image_data: imageData
            })
        })
        .then(res => {
            if (res.ok) {
                console.log('✅ Thumbnail saved to DB');
            } else {
                console.error('⚠️ Failed to save thumbnail');
            }
        })
        .catch(err => {
            console.error('❌ Error sending thumbnail:', err);
        });
    });
}




