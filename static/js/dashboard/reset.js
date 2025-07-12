document.getElementById('resetCanvasBtn').addEventListener('click', function() {
    const canvas = document.getElementById('dashboardCanvas');
    const zoomWrapper = document.getElementById('zoomWrapper');
    
    // Clear all widgets from canvas
    canvas.innerHTML = '';
    
    // Reset zoom to default (60%)
    document.getElementById('zoomRange').value = 60;
    document.getElementById('zoomValue').textContent = '60%';
    zoomWrapper.style.transform = 'scale(0.6)';
    
    // Reset canvas size to default (A4)
    document.getElementById('canvas-size').value = 'a4';
    
    // Clear any custom size inputs
    document.getElementById('custom-width').value = '';
    document.getElementById('custom-height').value = '';
    
    // Clear any session data
    sessionStorage.removeItem('widgets');
    sessionStorage.removeItem('canvasSize');
    
    // Optional: Show confirmation message
    alert('Canvas has been reset to default state');
});