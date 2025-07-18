import { renderChartToCanvas } from './render_chart.js';
import { dashboardState } from './state.js';

export function restoreDashboardState() {
  // Only restore from sessionStorage if not initial server load
  if (dashboardState.isInitialServerLoad) {
    
    return;
  }

  const savedWidgets = JSON.parse(sessionStorage.getItem('widgets') || '[]');
  
  if (!savedWidgets.length) {
    
    return;
  }

 
  
  savedWidgets.forEach(widgetData => {
    try {
      if (!widgetData.config || !widgetData.type) {
        
        return;
      }

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
