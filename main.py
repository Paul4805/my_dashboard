from fastapi import FastAPI
from app.api import signup  # import your signup module
from app.database import Base, engine
from app.models.user import User  # Ensure this import exists
from app.models.user_connection import UserConnection 
from fastapi.staticfiles import StaticFiles
from app.api import login  # import your login module
from app.api import logout  # Uncomment if you have a logout module
from app.api import dashboard  # import your dashboard module
from app.api import bihome
from app.api import history
from app.api import data
from app.api import settings
from app.api import bidashboard
from app.api import landing
from app.api import dashboardeditor
from app.api import generate
from app.api import dummy_return
from app.api import save
from app.api import delete
from app.api import thumbnail
from app.api import askai
from app.api import wip
from app.api import html_generation
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import RedirectResponse
from fastapi import Request
from fastapi.middleware import Middleware
from fastapi import HTTPException
import jinja2

from jinja2 import Environment
from starlette.templating import Jinja2Templates
from markupsafe import escape

templates = Jinja2Templates(directory="templates")


class AuthRedirectMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            if response.status_code == 401:
                return RedirectResponse("/login")
            return response
        except HTTPException as e:
            if e.status_code == 401:
                return RedirectResponse("/login")
            raise e


app = FastAPI(middleware=[Middleware(AuthRedirectMiddleware)])

app.mount("/static", StaticFiles(directory="static"), name="static")

# Register the router
app.include_router(landing.router)
app.include_router(signup.router)
app.include_router(login.router)
app.include_router(logout.router) 
app.include_router(dashboard.router)
app.include_router(bihome.router)
app.include_router(history.router)
app.include_router(data.router)
app.include_router(settings.router)
app.include_router(bidashboard.router)
app.include_router(dashboardeditor.router)
app.include_router(generate.router)
app.include_router(dummy_return.router)
app.include_router(save.router)
app.include_router(delete.router)
app.include_router(thumbnail.router)
app.include_router(askai.router)
app.include_router(wip.router)
app.include_router(html_generation.router)

Base.metadata.create_all(bind=engine)