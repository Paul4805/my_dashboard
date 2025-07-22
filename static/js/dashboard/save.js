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

    console.log(`✅ Saved config for widget ${widget.dataset.widgetId}:`, config);
  });

  // Save widget data to sessionStorage
  sessionStorage.setItem('widgets', JSON.stringify(widgets));
  console.log('📦 Dashboard state saved to sessionStorage:', sessionStorage.getItem('widgets'));

  // Save canvas size to sessionStorage
  const canvas = document.getElementById('dashboardCanvas');
  const sizeSelect = document.getElementById('canvas-size');

  let canvasSize = {};

  if (sizeSelect.value === 'a4' || sizeSelect.value === 'a3'|| sizeSelect.value === 'webpage') {
    canvasSize = { type: sizeSelect.value };
  } else if (sizeSelect.value === 'custom') {
    const width = parseInt(document.getElementById('custom-width').value) || canvas.offsetWidth;
    const height = parseInt(document.getElementById('custom-height').value) || canvas.offsetHeight;
    canvasSize = { type: 'custom', width, height };
  }

  sessionStorage.setItem('canvasSize', JSON.stringify(canvasSize));
  console.log('📐 Canvas size saved to sessionStorage:', canvasSize);
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


export function getFullChartConfig(chart) {
  if (!chart) return {};

  const type = chart.config?.type;
  const isPieOrDoughnut = ['pie', 'doughnut'].includes(type);
  const isRadar = type === 'radar';

  const config = {
    title: chart.options?.plugins?.title?.text || '',
    xAxisLabel: chart.options?.scales?.x?.title?.text || '',
    yAxisLabel: chart.options?.scales?.y?.title?.text || '',
    fontSize: chart.options?.plugins?.title?.font?.size || 10,
    xAxisData: chart.data.labels || [],
    seriesData: []
  };

  if (isPieOrDoughnut) {
    const dataset = chart.data.datasets[0] || {};
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
  } else if (isRadar) {
    config.seriesData = chart.data.datasets.map((ds) => ({
      name: ds.label || '',
      data: ds.data || [],
      backgroundColor: ds.backgroundColor,
      borderColor: ds.borderColor
    }));
    // No x/y axes in radar chart
    config.xAxisLabel = '';
    config.yAxisLabel = '';
  } else {
    const dataset = chart.data.datasets[0] || {};
    config.seriesData = [{
      name: dataset.label || '',
      data: dataset.data || [],
      backgroundColor: Array.isArray(dataset.backgroundColor) 
        ? dataset.backgroundColor 
        : [dataset.backgroundColor],
      borderColor: Array.isArray(dataset.borderColor) 
        ? dataset.borderColor 
        : [dataset.borderColor]
    }];
  }

  console.log(`✅ Extracted config for ${type} chart:`, config);
  return config;
}



