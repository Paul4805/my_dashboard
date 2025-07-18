import { generateAndSendThumbnail } from './helper.js';



export function saveDashboardState() {
  const widgets = [];
  
  // Collect all widget data
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

  });

  // Save widget data to sessionStorage
  sessionStorage.setItem('widgets', JSON.stringify(widgets));

  // Save canvas size to sessionStorage
  const canvas = document.getElementById('dashboardCanvas');
  const sizeSelect = document.getElementById('canvas-size');

  let canvasSize = {};

  if (sizeSelect.value === 'a4' || sizeSelect.value === 'a3') {
    canvasSize = { type: sizeSelect.value };
  } else if (sizeSelect.value === 'custom') {
    const width = parseInt(document.getElementById('custom-width').value) || canvas.offsetWidth;
    const height = parseInt(document.getElementById('custom-height').value) || canvas.offsetHeight;
    canvasSize = { type: 'custom', width, height };
  }

  sessionStorage.setItem('canvasSize', JSON.stringify(canvasSize));
}


export function initDashboardSaveSystem() {
  // Cache DOM elements
  const saveBtn = document.querySelector('.editor-button.save-button');
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
   
    alert('⚠️ Error updating dashboard. Please try again.');
  }
}


export function getFullChartConfig(chart) {
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


  return config;
}


