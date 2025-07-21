import { renderChartToCanvas } from './render_chart.js';
import { dashboardState } from './state.js';

export function restoreDashboardState() {
  // Only restore from sessionStorage if not initial server load
  if (dashboardState.isInitialServerLoad) {
    console.log('Skipping session restore - initial server load');
    return;
  }

  const savedWidgets = JSON.parse(sessionStorage.getItem('widgets') || '[]');
  console.log(savedWidgets)
  
  if (!savedWidgets.length) {
    console.log('No widgets found in sessionStorage');
    return;
  }

  console.log(`Restoring ${savedWidgets.length} widgets from sessionStorage`);
  
  savedWidgets.forEach(widgetData => {
    try {
      if (!widgetData.config || !widgetData.type) {
        console.warn('Skipping widget - missing config or type', widgetData);
        return;
      }
      console.log(widgetData.config)
      console.log(widgetData.type)

      const chartContainer = renderChartToCanvas(
        widgetData.config, 
        widgetData.type, 
        false // shouldSave flag
      );

      // Restore position and dimensions
      Object.assign(chartContainer.style, {
        left: widgetData.left || '20px',
        top: widgetData.top || '20px',
        width: widgetData.width || '200px',
        height: widgetData.height || '150px'
      });

      // Maintain interact.js data attributes
      chartContainer.dataset.x = parseFloat(widgetData.left) || 0;
      chartContainer.dataset.y = parseFloat(widgetData.top) || 0;

    } catch (error) {
      console.error('Failed to restore widget:', widgetData?.id, error);
    }
  });
}
