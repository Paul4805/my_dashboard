import { renderChartToCanvas } from './render_chart.js';
import { saveDashboardState, initDashboardSaveSystem } from './save.js';
import { restoreDashboardState } from './restore.js';
import { clearDashboardSession } from './helper.js';
import { dashboardState } from './state.js';


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

      const chartContainer = renderChartToCanvas(widgetData.config, widgetData.type, false); // Set shouldSave to true

      chartContainer.style.left = widgetData.left || '20px';
      chartContainer.style.top = widgetData.top || '20px';
      chartContainer.style.width = widgetData.width || '200px';
      chartContainer.style.height = widgetData.height || '150px';

      chartContainer.dataset.x = parseFloat(widgetData.left) || 0;
      chartContainer.dataset.y = parseFloat(widgetData.top) || 0;
    });

    // Save the restored state
    saveDashboardState();
    dashboardState.isInitialServerLoad = false;

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

//DOMS


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
    // Replace the widget restoration block with:
    console.log('2. Checking for saved widgets...');
    const savedWidgets = sessionStorage.getItem('widgets');

    if (savedWidgets) {
      try {
        const widgets = JSON.parse(savedWidgets);
        console.log(`Found ${widgets.length} saved widgets:`, widgets);
        console.log('Starting widget restoration...');
        restoreDashboardState();
      } catch (e) {
        console.error('Failed to parse saved widgets:', e);
      }
    } else if (dashboardState.isInitialServerLoad) {
      console.log('Waiting for server data restoration...');
    } else {
      console.log('No saved widgets found');
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

//zoom


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

window.generateDashboard = generateDashboard;
window.restoreDashboardFromData = restoreDashboardFromData;

// Button Event Listeners after DOM ready
document.addEventListener('DOMContentLoaded', () => {
  
  const applyCustomSizeBtn = document.getElementById('applyCustomSizeBtn');
  const generateDashboardBtn = document.getElementById('generateDashboardBtn');
  const canvasSizeSelect = document.getElementById('canvas-size');

  if (applyCustomSizeBtn) {
    applyCustomSizeBtn.addEventListener('click', applyCustomSize);
  }

  if (generateDashboardBtn) {
    generateDashboardBtn.addEventListener('click', generateDashboard);
  }

  if (canvasSizeSelect) {
    canvasSizeSelect.addEventListener('change', handleCanvasSizeChange);
  }
});

