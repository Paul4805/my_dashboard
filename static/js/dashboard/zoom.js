let currentZoom = 60;
let initialCenterX = 0;
let initialCenterY = 0;

function setupZoom() {
  const zoomRange = document.getElementById('zoomRange');
  const zoomValue = document.getElementById('zoomValue');
  const zoomWrapper = document.getElementById('zoomWrapper');
  const canvasArea = document.getElementById('canvasArea');
  
  // Set initial zoom to 60%
  zoomRange.value = 60;
  zoomValue.textContent = '60%';
  zoomWrapper.style.transformOrigin = 'top left';
  zoomWrapper.style.transform = 'scale(0.6)';
  
  // Ensure horizontal scrollbar is visible when needed
  canvasArea.style.overflowX = 'auto';
  
  // Calculate initial center position
  calculateInitialCenter();
  
  // Set initial position
  adjustCanvasPosition();

  zoomRange.addEventListener('input', (e) => {
    currentZoom = parseInt(e.target.value);
    zoomValue.textContent = `${currentZoom}%`;
    
    // Apply zoom transform with center origin
    zoomWrapper.style.transformOrigin = 'center center';
    zoomWrapper.style.transform = `scale(${currentZoom / 100})`;
    
    // Adjust position after zoom
    adjustCanvasPosition();
  });

  // Initialize zoom
  zoomRange.dispatchEvent(new Event('input'));
  
  // Add scroll event listener to maintain proper boundaries
  canvasArea.addEventListener('scroll', maintainScrollBoundaries);
  
  // Handle window resize
  window.addEventListener('resize', () => {
    calculateInitialCenter();
    adjustCanvasPosition();
  });
}

function calculateInitialCenter() {
  const canvasArea = document.getElementById('canvasArea');
  const canvas = document.getElementById('dashboardCanvas');
  
  // Get the current dimensions
  const canvasWidth = parseInt(canvas.style.width) || 595;
  const canvasHeight = parseInt(canvas.style.height) || 842;
  
  // Calculate the center position
  initialCenterX = (canvasArea.clientWidth - canvasWidth) / 2;
  initialCenterY = (canvasArea.clientHeight - canvasHeight) / 2;
}

function adjustCanvasPosition() {
  const canvasArea = document.getElementById('canvasArea');
  const scrollBuffer = canvasArea.querySelector('.scroll-buffer');
  const zoomWrapper = document.getElementById('zoomWrapper');
  const canvas = document.getElementById('dashboardCanvas');
  
  // Get the current dimensions
  const canvasWidth = parseInt(canvas.style.width) || 595;
  const canvasHeight = parseInt(canvas.style.height) || 842;
  const scaleFactor = currentZoom / 100;
  
  // Calculate scaled dimensions
  const scaledWidth = canvasWidth * scaleFactor;
  const scaledHeight = canvasHeight * scaleFactor;
  
  // Set buffer size to ensure scrollbars appear when needed
  // Add extra padding to ensure there's space to scroll horizontally
  scrollBuffer.style.width = `${Math.max(canvasArea.clientWidth, scaledWidth + 400)}px`;
  scrollBuffer.style.height = `${Math.max(canvasArea.clientHeight, scaledHeight + 200)}px`;
  
  // Position the canvas in the center of the viewport
  scrollBuffer.style.display = 'flex';
  scrollBuffer.style.justifyContent = 'center';
  scrollBuffer.style.alignItems = 'center';
  
  // Ensure the canvas stays centered during zoom
  requestAnimationFrame(() => {
    // Adjust scroll position to keep the canvas centered
    const scrollX = (scrollBuffer.offsetWidth - canvasArea.clientWidth) / 2;
    const scrollY = (scrollBuffer.offsetHeight - canvasArea.clientHeight) / 2;
    
    canvasArea.scrollTo({
      left: scrollX,
      top: scrollY,
      behavior: 'auto'
    });
  });
}

function maintainScrollBoundaries() {
  const canvasArea = document.getElementById('canvasArea');
  const scrollBuffer = canvasArea.querySelector('.scroll-buffer');
  
  // Prevent scrolling too far left (past the left sidebar)
  if (canvasArea.scrollLeft < 0) {
    canvasArea.scrollLeft = 0;
  }
  
  // Prevent scrolling too far right
  const maxScrollX = scrollBuffer.offsetWidth - canvasArea.clientWidth;
  if (canvasArea.scrollLeft > maxScrollX) {
    canvasArea.scrollLeft = maxScrollX;
  }
}

document.addEventListener('DOMContentLoaded', setupZoom);

// Export functions for use in other modules
export { setupZoom, adjustCanvasPosition };