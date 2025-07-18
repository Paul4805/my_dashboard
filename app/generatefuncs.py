import re
from app.models.user_connection import UserConnection
from sqlalchemy.orm import Session
from openai import OpenAI
from dotenv import load_dotenv
import os
from app.generate_helper import clean_sql
import json
from decimal import Decimal
from datetime import date, datetime
import json
import re


load_dotenv()  # Load from .env
api_key = os.getenv("DEEPSEEK_API_KEY")


client = OpenAI(api_key=api_key)

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)


def generate_sql_from_prompt(user_prompt, schema_description, database_type):
    
    """
    Converts natural language questions to raw SQL queries using LLM via RunPod.

    Args:
        user_prompt (str): User's question in plain English.
        schema_description (str): Database table/column schema.

    Returns:
        str: Cleaned raw SQL query string (no explanation, no formatting).
    """
    # Construct a strict prompt
    prompt = f"""
You are a professional AI SQL assistant.

Your job is to generate a syntactically correct SQL query for a {database_type} database,
given the schema and user question.

### SCHEMA ###
{schema_description}

### INSTRUCTIONS ###
- Generate ONLY the SQL query.
- DO NOT include explanations, comments, markdown formatting, or any intro like "Here's your query".
- Ensure the SQL follows {database_type} syntax precisely.
- For **PostgreSQL**, always wrap table names and column names with double quotes (e.g., "ProductName").
- Respect case-sensitivity exactly as shown in the schema.
- Do not make up columns or tables not present in the schema.
- If filters, conditions, or joins are needed, infer them from the schema and question.
- Use aliases or aggregations where relevant.

### QUESTION ###
{user_prompt}
"""

    # Call the model (DeepSeek/Llama etc.)
    sqlquery = client.chat.completions.create(
        model="gpt-4.1",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    # Extract only SQL from response
    sqlquery = clean_sql(sqlquery.choices[0].message.content.strip())
    return sqlquery


def generate_echarts_config(user_prompt, results, chart_type):
    """
    Generates visualization specifications using predefined JSON templates
    
    Args:
        user_prompt: The visualization request
        results: Data to visualize
        chart_type: Chart type ('pie', 'bar', 'line', etc.)
        
    Returns:
        dict: Valid ECharts configuration JSON
    """
    chart_type = chart_type or "bar"

    # Templates
    bar_chart_template = {
            "title": "Top 5 Products Sold",
            "xAxisData": ["Product A", "Product B", "Product C", "Product D", "Product E"],
            "seriesData": [
                {"name": "Total Sold", "type": "bar", "data": [14, 13, 12, 11, 10]}
            ]
        }
    line_chart_template = {
            "title": "Monthly Sales Trend",
            "xAxisData": ["Jan", "Feb", "Mar", "Apr"],
            "seriesData": [
                {"name": "Total Sales", "type": "line", "data": [12, 19, 8, 15]}
            ]
        }
    pie_chart_template = {
            "title": "Product Distribution",
            "seriesData": [
                {"name": "Product A", "value": 35},
                {"name": "Product B", "value": 25},
                {"name": "Product C", "value": 40}
            ]
        }

    # Choose template
    if chart_type == "line":
        template = line_chart_template
    elif chart_type == "pie":
        template = pie_chart_template
    else:
        template = bar_chart_template

    prompt = f"""
You are a chart generation assistant.
Question: {user_prompt}
Chart type: {chart_type}
Data: {results}

Use this JSON template:
{template}

Instructions:
1. Fill in the template with the provided data
2. Return ONLY valid JSON
3. No explanations or additional text
4. Include appropriate colors if the template has color fields
5. Make labels descriptive

Please use chart labels in the language of the user prompt.
"""

    response = client.chat.completions.create(
        model="gpt-4.1",
        messages=[{
            "role": "user",
            "content": prompt
        }]
    )

    content = response.choices[0].message.content.strip()

    # Clean triple backtick-wrapped JSON
    cleaned = re.sub(r"^```json\s*|\s*```$", "", content.strip(), flags=re.IGNORECASE)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
       
        return {}
    

def generate_forecast_config(user_prompt, forecast_result, period, chart_type="line"):
    """
    Generates forecast visualization config in a simplified single-series format:
    {
        "title": "Some Title",
        "xAxisData": [...],
        "seriesData": [
            {"name": "Total Sales", "type": "line", "data": [...]}
        ]
    }
    """
   
    x_axis_data = []
    combined_data = []

    historical_data = []
    forecast_data = []

    historical_dates = []
    forecast_dates = []

    for item in forecast_result:
        date_str = item['date'].strftime('%Y-%m-%d')
        value = float(item['value']) if isinstance(item['value'], Decimal) else item['value']

        if item['type'] == 'historical':
            historical_data.append(value)
            historical_dates.append(date_str)
        else:
            forecast_data.append(value)
            forecast_dates.append(date_str)

    # Trim to ensure equal period entries
    historical_data = historical_data[-period:]
    forecast_data = forecast_data[:period]
    historical_dates = historical_dates[-period:]
    forecast_dates = forecast_dates[:period]

    # Combine x-axis and data
    x_axis_data = historical_dates + forecast_dates
    combined_data = historical_data + forecast_data

    return {
        "title": f"Forecast: {user_prompt[:50]}..." if len(user_prompt) > 50 else user_prompt,
        "xAxisData": x_axis_data,
        "seriesData": [
            {
                "name": "Total Forecast",  # You can change this as needed
                "type": chart_type,
                "data": combined_data
            }
        ]
    }



def classify_intent_with_llm(user_prompt):
    """
    Determines the type of analysis requested using LLM.

    Args:
        user_prompt (str): User's original query

    Returns:
        str: One of ['visualization', 'anomaly_detection', 'prediction', 'forecasting', 'clustering']
    """
    prompt = f"""
You are an AI assistant for a no-code data analysis platform. 
Your job is to classify the user's request into one of these categories:

1. visualization - The user wants to generate a chart or visual
2. anomaly_detection - The user wants to find anomalies or outliers
3. prediction - The user wants to predict a value or outcome
4. forecasting - The user wants to forecast future trends or values
5. clustering - The user wants to group similar data points

User's Request: {user_prompt}

Respond with ONLY the intent name, no explanations.
"""

    response = client.chat.completions.create(
        model="gpt-4.1",
        messages=[{"role": "user", "content": prompt}]
    )

    intent = response.choices[0].message.content.strip().lower()

    # Fallback validation
    allowed_intents = ["visualization", "anomaly_detection", "prediction", "forecasting", "clustering"]
    if intent not in allowed_intents:
        intent = "visualization"  # Default fallback to visualization

    return intent






def generate_sql_from_prompt_for_prophet(prompt, schema, db_type):
    """
    Generates SQL queries specifically optimized for Prophet forecasting,
    preparing data in the required ds (date) and y (metric) format.
    
    Args:
        prompt (str): User's forecasting question in plain English
        schema (str): Database table/column schema
        db_type (str): Type of database (e.g., 'postgresql', 'mysql')
        
    Returns:
        str: SQL query that outputs data in Prophet-ready format (ds, y)
    """
    
    # Enhanced prompt with Prophet-specific requirements
    prophet_prompt = f"""
    The following is a request for time-series forecasting using Facebook Prophet:
    {prompt}
    
    Generate a SQL query that:
    1. Identifies the date column (rename to 'ds') and metric column (rename to 'y')
    2. Aggregates data to daily level (or other appropriate time granularity)
    3. Ensures no gaps in the time series (continuous dates)
    4. Sorts chronologically by date
    5. Handles NULLs appropriately (fill or filter)
    6. Returns exactly two columns: 'ds' (date) and 'y' (numeric value)
    
    The output must be compatible with Prophet's requirements:
    - 'ds' must be a date/datetime type
    - 'y' must be numeric
    - No missing dates in the series
    """
    
    # Use the existing function with our enhanced Prophet prompt
    base_sql = generate_sql_from_prompt(prophet_prompt, schema, db_type)
    
    # Additional processing to ensure Prophet compatibility
    if "ds" not in base_sql.lower() or "y" not in base_sql.lower():
        # If the query doesn't explicitly format for Prophet, wrap it
        prophet_wrapper = f"""
        WITH base_data AS (
            {base_sql}
        )
        SELECT
            date_column AS ds,
            value_column AS y
        FROM base_data
        ORDER BY ds
        """
        return clean_sql(prophet_wrapper)
    
    return base_sql

def askai(user_message: str) -> str:
    try:
        response = client.chat.completions.create(
            model="gpt-4.1",  # or "gpt-3.5-turbo" if needed
            messages=[
                {
                    "role": "system",
                    "content": "You are an AI assistant for data dashboard users. Answer queries clearly and helpfully."
                },
                {
                    "role": "user",
                    "content": user_message
                }
            ],
            temperature=0.7
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        
        return "Sorry, I'm currently unable to respond."
    

def get_period(user_prompt):
    """
    Determines the forecast period in days using LLM.

    Args:
        user_prompt (str): User's original query

    Returns:
        int: Forecast period in days
    """
    prompt = f"""
You are an AI assistant for a no-code data analysis platform. 
Your job is to find the period the user wants the forecast for, in days.

User's Request: {user_prompt}

Respond with ONLY the period in days, no explanations and only number.
"""

    response = client.chat.completions.create(
        model="gpt-4.1",
        messages=[{"role": "user", "content": prompt}]
    )

    period_str = response.choices[0].message.content.strip()
    
    try:
        period = int(period_str)
        return period
    except ValueError:
        raise ValueError(f"Invalid period received from LLM: '{period_str}'")
