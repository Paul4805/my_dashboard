import pandas as pd
import json 
import re
import numpy as np
from dotenv import load_dotenv
from openai import OpenAI
import os

load_dotenv()  # Load from .env
api_key = os.getenv("DEEPSEEK_API_KEY")


client = OpenAI(api_key=api_key)

#STEP 1
def convert_to_dataframe(conn, table_name):
    df= None
    try:
        query = "SELECT * FROM {}".format(table_name)
        df = pd.read_sql_query(query, conn)
        
    except Exception as e:
        print("Error", e)
    finally:
        if conn:
            conn.close()
    return df


#HELPER FUNCTION
def extract_json_from_response(response_text):
    # Try to extract from ```json ... ```
    match = re.search(r"```json(.*?)```", response_text, re.DOTALL)
    if match:
        json_str = match.group(1).strip()
    else:
        # Fallback: try to parse entire response as JSON
        json_str = response_text.strip()
    
    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        print("[ERROR] Could not parse the following content as JSON:")
        
        raise e
    
#STEP 2 CLEAN FEATURES 
def clean_features(df):
    sample_rows = df.head(5).to_dict(orient="records")
    columns = df.columns.tolist()

    # GPT prompt
    prompt = f"""
    You are a machine learning assistant helping with feature selection.

    Here are the first few rows of the dataset:
    {json.dumps(sample_rows, indent=2)}

    List of columns:
    {columns}

    "There is no specific target column."

    Please analyze the data and return a JSON object with:
    - "keep": a list of columns to keep
    - "drop": a list of columns to drop
    - "reasoning": short explanation for why these columns are selected

    Ensure the output is a valid JSON object.
    """


    chat_response = client.chat.completions.create(
        model="gpt-4",  # or "gpt-4o"
        messages=[
            {"role": "system", "content": "You are a helpful data analyst."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
    )

    response_content = chat_response.choices[0].message.content

    try:
        result = extract_json_from_response(response_content)
    except json.JSONDecodeError:
        print("[ERROR] GPT response is not valid JSON:\n", response_content)
        raise



    # Apply drops
    df_cleaned = df.drop(columns=result.get("drop", []), errors="ignore")
    return df_cleaned

# STEP 3 HANDLE MISSING VALUES(FILL WITH MEAN, MODE, MEDIAN, OR DROP)

def handle_missing_values(df_cleaned):
    # STEP 1: Check for missing values
    null_summary = df_cleaned.isnull().sum()
    null_summary = null_summary[null_summary > 0]  # only keep columns with missing values

    if null_summary.empty:
        
        return df_cleaned
    else:
        

        # STEP 2: Prepare GPT prompt
        null_info = null_summary.to_dict()
        sample_rows_with_nulls = df_cleaned[df_cleaned.isnull().any(axis=1)].head(5).to_dict(orient="records")


    prompt = f"""
    You are a machine learning assistant helping with data cleaning.

    Some columns in the dataset have missing (null) values.
    Here is a summary of missing values (column: count):
    {json.dumps(null_info, indent=2)}

    Here are a few sample rows with nulls:
    {json.dumps(sample_rows_with_nulls, indent=2)}

    Please return a JSON object suggesting how to handle missing values with this structure:
    - "drop_rows": true/false
    - "fill_strategies": {{
        "column_name": "mean" | "median" | "mode" | "drop"
    }}

    Only suggest "drop" in fill_strategies if it's absolutely necessary.

    Respond only with a valid JSON object enclosed in a markdown code block like this:
    ```json
    {{
    "drop_rows": false,
    "fill_strategies": {{
        "Age": "median",
        "Salary": "mean"
    }}
    }}

    Do not include any explanations or commentary.

    """

    chat_response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a helpful data analyst."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
    )

    response_content = chat_response.choices[0].message.content

    # STEP 3: Extract and apply the strategy
    try:
        strategy = extract_json_from_response(response_content)
    except json.JSONDecodeError:
        print("[ERROR] GPT response is not valid JSON:\n", response_content)
        raise

    if strategy.get("drop_rows"):
        df_cleaned = df_cleaned.dropna()
        
    else:
        for col, method in strategy.get("fill_strategies", {}).items():
            if method == "mean":
                df_cleaned[col] = df_cleaned[col].fillna(df_cleaned[col].mean())
            elif method == "median":
                df_cleaned[col] = df_cleaned[col].fillna(df_cleaned[col].median())
            elif method == "mode":
                df_cleaned[col] = df_cleaned[col].fillna(df_cleaned[col].mode()[0])
            elif method == "drop":
                df_cleaned = df_cleaned.drop(columns=[col])
                
        
    return df_cleaned

#STEP 4: GENERATE INSIGHTS
import seaborn as sns
import matplotlib.pyplot as plt
import pandas as pd
import os
import base64

model = "gpt-4o"

def perform_eda_analysis_streaming(df_cleaned):
    import json
    import base64
    import os
    import matplotlib.pyplot as plt
    import seaborn as sns

    numerical_cols = df_cleaned.select_dtypes(include="number").columns.tolist()
    categorical_cols = df_cleaned.select_dtypes(include=["object", "category", "bool"]).columns.tolist()

    def generate_visualizations(df):
        plots = []

        if len(numerical_cols) >= 2:
            plt.figure(figsize=(10, 8))
            sns.heatmap(df[numerical_cols].corr(), annot=True, cmap="coolwarm")
            plt.title("Correlation Heatmap")
            path = "viz_corr_heatmap.png"
            plt.tight_layout()
            plt.savefig(path)
            plots.append(path)
            plt.close()

        for col in numerical_cols[:5]:
            plt.figure()
            sns.histplot(df[col], kde=True)
            plt.title(f"Histogram of {col}")
            path = f"viz_hist_{col}.png"
            plt.savefig(path)
            plots.append(path)
            plt.close()

        if categorical_cols and numerical_cols:
            for col in numerical_cols[:3]:
                plt.figure()
                sns.boxplot(x=categorical_cols[0], y=col, data=df)
                plt.title(f"Boxplot of {col} by {categorical_cols[0]}")
                path = f"viz_box_{col}_by_{categorical_cols[0]}.png"
                plt.savefig(path)
                plots.append(path)
                plt.close()

        for col in categorical_cols[:3]:
            plt.figure()
            sns.countplot(x=col, data=df)
            plt.title(f"Count Plot of {col}")
            path = f"viz_count_{col}.png"
            plt.savefig(path)
            plots.append(path)
            plt.close()

        return plots

    def encode_image(image_path):
        with open(image_path, "rb") as img_file:
            return base64.b64encode(img_file.read()).decode("utf-8")

    def analyze_visual_with_gpt(image_path, custom_prompt=None):
        base64_image = encode_image(image_path)
        prompt = custom_prompt or f"""
You are a data scientist. Analyze the following plot and provide clear EDA insights.

- Identify patterns, relationships, outliers, or imbalances.
- Explain what the plot reveals about the data.
- ask question using the plot.
- provide answer to the question.
- reveal insights alone no need for analysis for forcasting and prediction.
- give insights in manner a non-technical person can understand.
- finally after analyzing all the plots, give your thoughs on how predictive analysis can be done on this data.

Title of this plot: {image_path}
        """

        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are an expert data analyst."},
                {"role": "user", "content": prompt},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()

    # Start the pipeline
    yield "data: 🔍 Generating visualizations...\n\n"
    plot_paths = generate_visualizations(df_cleaned)
    yield f"data: ✅ {len(plot_paths)} plots created.\n\n"

    for path in plot_paths:
        yield f"data: 🧠 Analyzing plot: {path}...\n\n"
        try:
            insights = analyze_visual_with_gpt(path)
            payload = json.dumps({
                "plot": path,
                "insight": insights
            })
            yield f"data: {payload}\n\n"
        except Exception as e:
            yield f"data: ERROR: Failed to analyze {path}: {str(e)}\n\n"

    for path in plot_paths:
        try:
            os.remove(path)
            yield f"data: 🗑️ Deleted temporary plot: {path}\n\n"
        except Exception as e:
            yield f"data: ⚠️ Could not delete {path}: {e}\n\n"

    yield "data: ✅ EDA completed.\n\n"
