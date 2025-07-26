from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.session_connection import session_conn_manager  # your session cache logic
from app.detailed_analysis import convert_to_dataframe, clean_features, handle_missing_values, perform_eda_analysis_streaming
import asyncio

router = APIRouter()

@router.get("/dashboard/detailed_analysis/stream")
async def detailed_analysis_stream(
    request: Request,
    table_name: str,
    db_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from fastapi.responses import StreamingResponse

    session_id = request.cookies.get("session_id")
    if not session_id:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    cached = session_conn_manager.get_connection(session_id, db_id)
    if not cached:
        return JSONResponse(status_code=400, content={"error": "Connection not found in cache"})

    conn = cached["connection"]

    df = convert_to_dataframe(conn, table_name)
    if df is None or df.empty:
        return JSONResponse(status_code=400, content={"error": "Failed to load data or data is empty"})

    df_cleaned = clean_features(df)
    df_cleaned = handle_missing_values(df_cleaned)

    async def streamer():
        for chunk in perform_eda_analysis_streaming(df_cleaned):
            yield chunk
            await asyncio.sleep(0.1)

    return StreamingResponse(streamer(), media_type="text/event-stream")



@router.get("/get_tables")
def get_tables(db_id: str, request: Request):
    session_id = request.cookies.get("session_id")
    cached = session_conn_manager.get_connection(session_id, db_id)
    if not cached:
        return {"tables": []}
    conn = cached["connection"]
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        )
        tables = [row[0] for row in cursor.fetchall()]
        return {"tables": tables}
    except Exception as e:
        return {"tables": [], "error": str(e)}
