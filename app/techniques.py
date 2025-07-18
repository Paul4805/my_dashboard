from prophet import Prophet
import pandas as pd

def run_forecasting(data, user_prompt,period):
    """
    Runs Prophet forecasting on provided data.

    Args:
        data (list of dict): List with 'ds' and 'y' keys.
        user_prompt (str): Optional user prompt for logging/debugging.

    Returns:
        dict: Contains historical and forecasted data for line chart.
    """
    try:
        df = pd.DataFrame(data)
        df['ds'] = pd.to_datetime(df['ds'])
        
        model = Prophet()
        model.fit(df)

        # Forecast 30 future periods (you can customize this)
        future = model.make_future_dataframe(periods=period)
        forecast = model.predict(future)

        # Prepare historical data
        historical_data = df[['ds', 'y']].rename(columns={'ds': 'date', 'y': 'value'})
        historical_data['type'] = 'historical'

        # Prepare forecasted data
        forecast_data = forecast[['ds', 'yhat']].rename(columns={'ds': 'date', 'yhat': 'value'})
        forecast_data = forecast_data[forecast_data['date'] > df['ds'].max()]
        forecast_data['type'] = 'forecast'

        # Combine for chart
        combined_data = pd.concat([historical_data, forecast_data])

        chart_data = combined_data.to_dict(orient='records')

        
        return chart_data
    
    
    except Exception as e:
       
        return {
            "error": "Forecasting failed",
            "details": str(e)
        }