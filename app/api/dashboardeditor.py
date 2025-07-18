from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import HTMLResponse
from app.dependencies import get_current_user
from app.session_connection import session_conn_manager
from app.models.user_connection import UserConnection
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.dependencies import establish_connection, fetch_schema_description
from fastapi.templating import Jinja2Templates
from app.dependencies import init_user_connections
from app.models.dashboards import Dashboard


templates = Jinja2Templates(directory="templates")

router = APIRouter()

@router.get("/dashboardeditor", response_class=HTMLResponse)
async def dashboard_editor(
    request: Request,
    dashboard_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session_id = request.cookies.get("session_id")

    # Initialize all connections
    init_user_connections(session_id, current_user.id, db)

    # Fetch user connections for dropdown
    connections = db.query(UserConnection).filter(UserConnection.user_id == current_user.id).all()
    db_list = [f"{conn.db_type} - {conn.database}" for conn in connections]

    # Prepare variables for edit mode
    dashboard_data = None
    dashboard_name = None

    if dashboard_id:
        dashboard = db.query(Dashboard).filter(
            Dashboard.id == dashboard_id,
            Dashboard.user_id == current_user.id
        ).first()

        if dashboard:
            dashboard_data = dashboard.data
            dashboard_name = dashboard.name
        else:
            raise HTTPException(status_code=404, detail="Dashboard not found")

    return templates.TemplateResponse("dashboard/dashboard_editor.html", {
        "request": request,
        "db_list": db_list,
        "dashboard_data": dashboard_data,
        "dashboard_name": dashboard_name,
        "dashboard_id": dashboard_id
    })

@router.put("/dashboard/update/{dashboard_id}")
async def update_dashboard(dashboard_id: int, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        data = await request.json()
       

        widgets = data.get("widgets")
        canvas_size = data.get("canvasSize")

        if widgets is None or canvas_size is None:
          
            return {"error": "widgets and canvasSize are required."}

        # Fetch dashboard
        dashboard = db.query(Dashboard).filter(
            Dashboard.id == dashboard_id,
            Dashboard.user_id == current_user.id
        ).first()

        if not dashboard:
           
            return {"error": "Dashboard not found."}

        # Update data
        dashboard.data = {
            "widgets": widgets,
            "canvasSize": canvas_size
        }

        db.commit()
       
        return {"message": "Dashboard updated successfully."}

    except Exception as e:
        
        return {"error": "An error occurred while updating the dashboard."}




