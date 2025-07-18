import { renderChartToCanvas } from './render_chart.js';
import { saveDashboardState, initDashboardSaveSystem } from './save.js';
import { restoreDashboardState } from './restore.js';
import { clearDashboardSession } from './helper.js';
import { dashboardState } from './state.js';


// Updated generateDashboard function
async function generateDashboard() {
  const generateBtn = document.getElementById('generateDashboardBtn');
  const originalText = generateBtn.innerHTML;

  // Disable button and show loading
  generateBtn.disabled = true;
  generateBtn.innerHTML = `<span class="btn-icon">⏳</span> Generating...`;

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
    

    if (result.status === 'success') {
      const intent = result.intent;
      const outputFormat = result.output_format || 'visual';

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
    
    alert('Something went wrong.');
  } finally {
    // Restore button state
    generateBtn.disabled = false;
    generateBtn.innerHTML = originalText;
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
 

  try {
    
    const savedSize = JSON.parse(sessionStorage.getItem('canvasSize'));
   

    const canvas = document.getElementById('dashboardCanvas');
    const sizeSelect = document.getElementById('canvas-size');
    

    if (savedSize) {
      

      if (savedSize.type === 'a4') {
       
        canvas.style.width = '595px';
        canvas.style.height = '842px';
        sizeSelect.value = 'a4';
      } 
      else if (savedSize.type === 'a3') {
        
        canvas.style.width = '842px';
        canvas.style.height = '1191px';
        sizeSelect.value = 'a3';
      } 
      else if (savedSize.type === 'custom') {
      
        canvas.style.width = `${savedSize.width}px`;
        canvas.style.height = `${savedSize.height}px`;
        sizeSelect.value = 'custom';
        const customInputs = document.getElementById('custom-size-inputs');
        customInputs.style.display = 'block';
        document.getElementById('custom-width').value = savedSize.width;
        document.getElementById('custom-height').value = savedSize.height;
        
      }
    } else {
      
      sizeSelect.value = 'a4';
      handleCanvasSizeChange();
    }

    // Restore widgets if available
    // Replace the widget restoration block with:
   
    const savedWidgets = sessionStorage.getItem('widgets');

    if (savedWidgets) {
      try {
        const widgets = JSON.parse(savedWidgets);
        
        restoreDashboardState();
      } catch (e) {
        console.error('Failed to parse saved widgets:', e);
      }
    } 
    else if (dashboardState.isInitialServerLoad) {
      console.log('Waiting for server data restoration...');
    } 
    else {
      console.log('No saved widgets found');
    }

    // Center view
    
    const centerScroll = () => {
     

      if (canvasArea.scrollHeight > canvasArea.clientHeight ||
        canvasArea.scrollWidth > canvasArea.clientWidth) {
        const targetTop = (canvasArea.scrollHeight - canvasArea.clientHeight) / 2;
        const targetLeft = (canvasArea.scrollWidth - canvasArea.clientWidth) / 2;
      

        canvasArea.scrollTo({
          top: targetTop,
          left: targetLeft,
          behavior: 'auto'
        });
      } 
      else {
        console.log('No scrolling needed - content fits viewport');
      }
    };

   
    centerScroll();

    setTimeout(() => {
      
      centerScroll();
    }, 100);

  } catch (error) {
   
    document.getElementById('canvas-size').value = 'a4';
    handleCanvasSizeChange();
  }

  // Exit button handler

  const exitButton = document.querySelector('.editor-button.exit-button');
  if (exitButton) {
    exitButton.addEventListener('click', (e) => {
     
      e.preventDefault();
      clearDashboardSession();
     
      window.location.href = e.target.href;
    });
  } 
  else {
    console.warn('Exit button not found in DOM');
  }

  // Optional: Clear on any page unload
  
  document.querySelector('.editor-button.exit-button')?.addEventListener('click', (e) => {
    
    clearDashboardSession();
    window.location.href = e.target.href;
  });

 
});

document.addEventListener('DOMContentLoaded', () => {
  // Initialize dashboard save system
  initDashboardSaveSystem();
});

//zoom


// const zoomRange = document.getElementById('zoomRange');
// const zoomValueDisplay = document.getElementById('zoomValue');
// const zoomWrapper = document.getElementById('zoomWrapper');
// const canvasArea = document.getElementById('canvasArea');

// zoomRange.addEventListener('input', () => {
//   const zoom = zoomRange.value;
//   zoomWrapper.style.transform = `scale(${zoom / 100})`;
//   zoomValueDisplay.textContent = `${zoom}%`;

//   // Smooth scroll to center after zoom
//   setTimeout(() => {
//     canvasArea.scrollTo({
//       top: (canvasArea.scrollHeight - canvasArea.clientHeight) / 2,
//       left: (canvasArea.scrollWidth - canvasArea.clientWidth) / 2,
//       behavior: 'smooth'
//     });
//   }, 100);
// });

// const baseWidth = 595;
// const baseHeight = 842;
// const scale = zoom / 100;

// const scrollBuffer = document.querySelector('.scroll-buffer');

// // Dynamically update scroll-buffer size
// scrollBuffer.style.minWidth = `${baseWidth * scale + 200}px`;  // +200 for some buffer
// scrollBuffer.style.minHeight = `${baseHeight * scale + 200}px`;

const zoomRange = document.getElementById('zoomRange');
const zoomValueDisplay = document.getElementById('zoomValue');
const zoomWrapper = document.getElementById('zoomWrapper');
const canvasArea = document.getElementById('canvasArea');
const scrollBuffer = document.querySelector('.scroll-buffer');

zoomRange.addEventListener('input', () => {
  const zoom = zoomRange.value;
  const scale = zoom / 100;
  zoomWrapper.style.transform = `scale(${scale})`;
  zoomValueDisplay.textContent = `${zoom}%`;

  // Dynamically adjust scroll buffer to match zoomed size
  const baseWidth = 595;
  const baseHeight = 842;
  scrollBuffer.style.minWidth = `${baseWidth * scale + 200}px`;
  scrollBuffer.style.minHeight = `${baseHeight * scale + 200}px`;

  // Scroll to center
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

