from fastapi import APIRouter, Request, Form, Depends, UploadFile, File
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, inspect
import pandas as pd
import psycopg
from psycopg import OperationalError
from fastapi.responses import JSONResponse
from app.dependencies import get_current_user, encrypt_password
from app.models.user_connection import UserConnection
from app.models.user import User
from app.database import get_db
from fastapi.responses import RedirectResponse
from urllib.parse import urlencode
from urllib.parse import quote_plus
import sqlite3
import os

router = APIRouter()
templates = Jinja2Templates(directory="templates")


@router.get("/dashboard/data", response_class=HTMLResponse)
async def data_tab(
    request: Request,
    message: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        return RedirectResponse("/login?msg=session-expired")
    
    return templates.TemplateResponse("dashboard/data_tab.html", {
        "request": request,
        "message": message,
        "active_page": "data"
    })



@router.post("/dashboard/data", response_class=HTMLResponse)
async def handle_postgres_connection(
    request: Request,
    db_type: str = Form(...),
    host: str = Form(None),
    port: int = Form(None),
    database: str = Form(None),
    user: str = Form(None),
    password: str = Form(None),
    sslmode: str = Form(None),
    sqlite_file: UploadFile = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        if db_type.lower() == "postgresql":
            # Try to connect to PostgreSQL
            conn = psycopg.connect(
                host=host,
                port=port,
                dbname=database,
                user=user,
                password=password,
                sslmode=sslmode,
                connect_timeout=20
            )
            conn.close()

            # Check for existing connection
            existing_conn = db.query(UserConnection).filter_by(
                user_id=current_user.id,
                db_type=db_type,
                host=host,
                port=port,
                database=database,
                username=user
            ).first()

            if existing_conn:
                message = "🔄 Connection successful but already exists."
            else:
                new_conn = UserConnection(
                    user_id=current_user.id,
                    db_type=db_type,
                    host=host,
                    port=port,
                    database=database,
                    username=user,
                    encrypted_password=encrypt_password(password),
                    sslmode=sslmode
                )
                db.add(new_conn)
                db.commit()
                message = "✅ Connection successful!"
        # === SQLITE ===
        elif db_type.lower() == "sqlite":
            if not sqlite_file:
                raise ValueError("No SQLite file uploaded.")

            os.makedirs("uploaded_sqlite", exist_ok=True)
            filepath = os.path.join("uploaded_sqlite", sqlite_file.filename)

            with open(filepath, "wb") as f:
                f.write(await sqlite_file.read())

            # Test connection
            conn = sqlite3.connect(filepath)
            conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
            conn.close()

            existing_conn = db.query(UserConnection).filter_by(
                user_id=current_user.id,
                db_type="sqlite",
                database=filepath
            ).first()

            if existing_conn:
                message = "🔄 SQLite file uploaded but already exists."
            else:
                new_conn = UserConnection(
                    user_id=current_user.id,
                    db_type="sqlite",
                    database=filepath,
                    username="(sqlite)",  # placeholder
                    host=None,
                    port=None,
                    encrypted_password=None,
                    sslmode=None
                )
                db.add(new_conn)
                db.commit()
                message = "✅ SQLite file uploaded and connection saved."

        else:
            message = f"❌ Unsupported database type: {db_type}"

    except OperationalError as e:
        message = f"❌ PostgreSQL connection failed: {str(e)}"
    except sqlite3.Error as e:
        message = f"❌ SQLite connection failed: {str(e)}"
    except Exception as e:
        message = f"❌ Unexpected error: {str(e)}"

    # Redirect with message in query string
    params = urlencode({"message": message})
    return RedirectResponse(f"/dashboard/data?{params}", status_code=303)


from fastapi.responses import HTMLResponse

@router.get("/dashboard/data/previews", response_class=HTMLResponse)
async def get_data_previews(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        return RedirectResponse("/login?msg=session-expired", status_code=303)

    previews_by_db = []
    connections = db.query(UserConnection).filter_by(user_id=current_user.id).all()

    for conn in connections:
        try:
            db_type = conn.db_type.lower()
            
            # === Handle SQLite ===
            if db_type == "sqlite":
                engine_url = f"sqlite:///{conn.database}"
            else:
                username = quote_plus(conn.username or "")
                password = quote_plus(conn.get_decrypted_password() or "")
                engine_url = f"{db_type}://{username}:{password}@{conn.host}:{conn.port}/{conn.database}?sslmode={conn.sslmode}"

            engine = create_engine(engine_url)

            inspector = inspect(engine)
            tables = inspector.get_table_names()
            table_previews = []

            for table in tables:
                try:
                    df = pd.read_sql(f"SELECT * FROM {table} LIMIT 5", engine)
                    table_previews.append({
                        "name": table,
                        "html": df.to_html(classes="table table-sm table-bordered", index=False)
                    })
                except Exception as e:
                    table_previews.append({
                        "name": table,
                        "html": f"<p>Error previewing table {table}: {e}</p>"
                    })

            previews_by_db.append({
                "db_name": conn.database,
                "tables": table_previews
            })

        except Exception as e:
            previews_by_db.append({
                "db_name": conn.database,
                "tables": [{"name": "Error", "html": f"<p>Connection failed: {e}</p>"}]
            })

    return templates.TemplateResponse("dashboard/_data_preview_partial.html", {
        "request": request,
        "previews_by_db": previews_by_db
    })

