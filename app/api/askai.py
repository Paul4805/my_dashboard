from fastapi import FastAPI, Request, APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.generatefuncs import askai
from app.database import get_db
from app.dependencies import get_current_user
from sqlalchemy.orm import Session
from app.models.user import User

router = APIRouter()


# Define the input model
class AIRequest(BaseModel):
    message: str

@router.post("/ask-ai")
async def handle_ask_ai(
    req: AIRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})

    response_text = askai(req.message, user_id=current_user.id)
    return JSONResponse(content={"response": response_text})