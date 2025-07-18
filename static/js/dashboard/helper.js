

// Helper function to darken a color
export function darkenColor(color, percent) {
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
export function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}


export function clearDashboardSession() {
  sessionStorage.removeItem('widgets');
  sessionStorage.removeItem('canvasSize');
  
}

export function generateAndSendThumbnail(dashboardId) {
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