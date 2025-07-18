import app.models.user as User
from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from app.dependencies import get_current_user, get_db
from app.models.dashboards import Dashboard

router = APIRouter()
templates = Jinja2Templates(directory="templates")



@router.post("/dashboard/thumbnail")
async def save_dashboard_thumbnail(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    

    dashboard_id = payload.get("dashboard_id")
    image_data = payload.get("image_data")

    if not dashboard_id or not image_data:
       
        raise HTTPException(status_code=400, detail="dashboard_id and image_data are required")

   

    dashboard = db.query(Dashboard).filter(
        Dashboard.id == dashboard_id,
        Dashboard.user_id == current_user.id
    ).first()

    if not dashboard:
       
        raise HTTPException(status_code=404, detail="Dashboard not found")

   
    dashboard.thumbnail = image_data

    db.commit()
    

    return {"message": "Thumbnail updated"}
