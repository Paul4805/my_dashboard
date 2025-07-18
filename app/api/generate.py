from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.dependencies import get_current_user, get_db
from app.generatefuncs import generate_sql_from_prompt, generate_echarts_config, classify_intent_with_llm, generate_sql_from_prompt_for_prophet, generate_forecast_config,get_period
from app.generate_helper import detect_chart_type, detect_output_format, save_query_history, transform_sql_result_to_llm_json
from app.techniques import run_forecasting
from app.session_connection import session_conn_manager
from app.models.user import User

router = APIRouter()

# --- Main Route ---
from app.models import QueryHistory

@router.post("/dashboard/generate")
async def generate_dashboard(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    data = await request.json()
    prompt = data.get("prompt", "")
    db_id = data.get("db_id", "")

    session_id = request.cookies.get("session_id")
    if not session_id:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    cached = session_conn_manager.get_connection(session_id, db_id)
    if not cached:
        return JSONResponse(status_code=400, content={"error": "Connection not found in cache"})

    conn = cached["connection"]
    schema = cached["schema"]
    
    db_type = db_id.split(" - ")[0].strip().lower()

    # 🔥 NEW STEP: Let LLM classify the user's intent
    intent = classify_intent_with_llm(prompt)  # e.g., "visualization", "anomaly_detection", etc.

    cursor = conn.cursor()
    
    # For most intents, SQL is still needed
    if intent=="visualization":
        sql_query = generate_sql_from_prompt(prompt, schema, db_type)
       
        try:
            cursor.execute(sql_query)
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            transformed_data = transform_sql_result_to_llm_json(columns, rows)
           
        except Exception as e:
           
            save_query_history(db, current_user, prompt, sql_query, "failed", None)
            return JSONResponse(status_code=500, content={"error": "SQL execution failed"})
        chart_type = data.get("chart_type") or detect_chart_type(prompt)
        echarts_config = generate_echarts_config(prompt, transformed_data, chart_type)
        result_payload = {
            "chart_type": chart_type,
            "echarts_config": echarts_config
        }
        
    elif intent == "forecasting":
        sql_query_forcast = generate_sql_from_prompt_for_prophet(prompt, schema, db_type)
        
        try:
            cursor.execute(sql_query_forcast)
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            
            # Convert rows to list of dicts for easy processing
            data = [dict(zip(columns, row)) for row in rows]

            # Prophet expects two columns: 'ds' for datetime and 'y' for target value
            # Assuming your SQL query already returns columns with these names
            prophet_data = [{"ds": row["ds"], "y": row["y"]} for row in data]

           

        except Exception as e:
           
            save_query_history(db, current_user, prompt, sql_query_forcast, "failed", None)
            return JSONResponse(status_code=500, content={"error": "SQL execution for forecasting failed"})
        period=get_period(prompt)
        forecast_result = run_forecasting(prophet_data, prompt, period)
        output_format = detect_output_format(prompt)
       
        chart_type = "line"  # Forecasts are typically shown as line charts
        echarts_config = generate_forecast_config(prompt, forecast_result, period, chart_type)
      
        result_payload = {
            "chart_type": chart_type,
            "echarts_config": echarts_config
        }
        #else raise ValueError(f"Unsupported intent: {intent}")


    # 🔥 NEW STEP: Based on intent, apply respective logic
    status = "success"
    
    sql_query = sql_query if intent == "visualization" else sql_query_forcast

    # Save successful query
    save_query_history(db, current_user, prompt, sql_query, status, result_payload)

    
    return {
        "status": status,
        "intent": intent,
        **result_payload
    }