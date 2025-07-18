from fastapi import APIRouter, Request, Form, Depends, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from app.models.user import User
from app.database import get_db
from passlib.context import CryptContext
from app.session_manager import create_session
from app.session_connection import session_conn_manager  # import manager

router = APIRouter()
templates = Jinja2Templates(directory="templates")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

@router.get("/login", response_class=HTMLResponse)
def login_form(request: Request):
    session_id = request.cookies.get("session_id")

    # Clear server-side session if exists
    if session_id:
        session_conn_manager.clear_session(session_id)

    # Prepare template response and remove session cookie
    response = templates.TemplateResponse("login.html", {"request": request})
    response.delete_cookie("session_id")
    return response

@router.post("/login")
def login_user(
    request: Request,
    response: Response,
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == username).first()
   

    if not user or not verify_password(password, user.hashed_password):
        return templates.TemplateResponse("login.html", {
            "request": request,
            "error": "Invalid username or password"
        })

    session_id = create_session(user.id)

    response = RedirectResponse(url="/dashboard", status_code=302)
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=60 * 60 * 24,
    )
    return response
