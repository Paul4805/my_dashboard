from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.responses import FileResponse
from app.generate_html_module import generate_html_string
import os
import traceback  # add this to capture stack trace
from fastapi.responses import StreamingResponse
from io import BytesIO
import psycopg2

router = APIRouter()

@router.get("/export_html/{dashboard_id}")
def export_dashboard_html(dashboard_id: int):
    try:
        # DB connection
        conn = psycopg2.connect(
            host="95.177.179.236",
            port=5400,
            dbname="my_dashboard",
            user="postgres",
            password="DbT!4485$"
        )
        cursor = conn.cursor()
        cursor.execute("SELECT data FROM dashboards WHERE id = %s;", (dashboard_id,))
        row = cursor.fetchone()
        cursor.close()
        conn.close()

        if not row:
            raise HTTPException(status_code=404, detail="Dashboard not found.")

        json_string = row[0]
        html_string = generate_html_string(json_string)

        file_stream = BytesIO(html_string.encode("utf-8"))

        return StreamingResponse(
            file_stream,
            media_type="text/html",
            headers={"Content-Disposition": f"attachment; filename=dashboard_{dashboard_id}.html"}
        )

    except Exception as e:
        print("🔥 ERROR:", e)
        traceback.print_exc()  # ✅ Add this line
        raise HTTPException(status_code=500, detail=str(e))