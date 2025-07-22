import json
from pathlib import Path

def generate_html_string(json_input) -> str:
    # Step 1: Parse input safely
    if isinstance(json_input, str):
        try:
            decoded_json = json.loads(json_input)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON string: {str(e)}")
    elif isinstance(json_input, dict):
        decoded_json = json_input
    else:
        raise TypeError("Input must be a JSON string or a Python dict")

    # Step 2: Validate structure
    if not isinstance(decoded_json, dict):
        raise ValueError("Decoded JSON must be an object")
    if "widgets" not in decoded_json:
        raise ValueError("JSON must contain a 'widgets' array")

    # Step 3: Extract canvas size
    canvas_size = decoded_json.get("canvasSize", {"width": 1280, "height": 720})

    # Step 4: Generate the HTML
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Generated Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body {{
      margin: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background: #f5f5f5;
    }}
    #dashboard-container {{
      position: relative;
      background: white;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }}
    .chart-widget {{
      position: absolute;
    }}
  </style>
</head>
<body>
  <div id="dashboard-container"></div>

  <script>
    const savedData = {json.dumps(decoded_json, indent=4)};

    const container = document.getElementById('dashboard-container');
    container.style.width = (savedData.canvasSize?.width || 1280) + 'px';
    container.style.height = (savedData.canvasSize?.height || 720) + 'px';

    (savedData.widgets || []).forEach(widget => {{
      if (!widget.type) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'chart-widget';
      wrapper.style.left = widget.left || '0px';
      wrapper.style.top = widget.top || '0px';
      wrapper.style.width = widget.width || '200px';
      wrapper.style.height = widget.height || '150px';

      const canvas = document.createElement('canvas');
      canvas.width = parseFloat(widget.width) || 200;
      canvas.height = parseFloat(widget.height) || 150;
      wrapper.appendChild(canvas);
      container.appendChild(wrapper);

      const ctx = canvas.getContext('2d');
      const config = widget.config || {{}};

      let chartConfig = {{
        type: widget.type,
        data: {{}},
        options: {{
          responsive: false,
          maintainAspectRatio: false,
          plugins: {{
            title: {{
              display: !!config.title,
              text: config.title || ''
            }}
          }},
          scales: (['scatter','line','bar'].includes(widget.type)) ? {{
            x: {{ title: {{ display: !!config.xAxisLabel, text: config.xAxisLabel || '' }} }},
            y: {{ title: {{ display: !!config.yAxisLabel, text: config.yAxisLabel || '' }} }}
          }} : undefined
        }}
      }};

      try {{
        if (['pie','doughnut'].includes(widget.type)) {{
          chartConfig.data = {{
            labels: config.xAxisData || [],
            datasets: [{{
              data: (config.seriesData || []).map(d => d.value),
              backgroundColor: (config.seriesData || []).map(d => d.backgroundColor),
              borderColor: (config.seriesData || []).map(d => d.borderColor),
              borderWidth: 1
            }}]
          }};
        }} else if (widget.type === 'scatter') {{
          chartConfig.data = {{
            datasets: (config.seriesData || []).map(series => ({{
              label: series.name || '',
              data: (series.data || []).map(([x, y]) => ({{ x, y }})),
              backgroundColor: series.backgroundColor,
              borderColor: series.borderColor
            }}))
          }};
        }} else {{
          chartConfig.data = {{
            labels: config.xAxisData || [],
            datasets: (config.seriesData || []).map(series => ({{
              label: series.name || '',
              data: series.data || [],
              backgroundColor: series.backgroundColor,
              borderColor: series.borderColor
            }}))
          }};
        }}

        new Chart(ctx, chartConfig);
      }} catch (e) {{
        console.error('Error rendering chart:', e);
      }}
    }});
  </script>
</body>
</html>
"""
    return html_content


