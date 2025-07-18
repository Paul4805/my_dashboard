from fastapi import Request, Depends, HTTPException
from sqlalchemy.orm import Session
from app.session_manager import get_user_id
from app.database import get_db
from app.models.user import User
from cryptography.fernet import Fernet
import os
from dotenv import load_dotenv

def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = get_user_id(session_id)
    if not user_id:
        raise HTTPException(status_code=401, detail="Session expired or invalid")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


# Ideally, store this securely (env variable or config file)
load_dotenv()
SECRET_KEY = os.getenv("ENCRYPTION_KEY").encode()
fernet = Fernet(SECRET_KEY)

def encrypt_password(plain_text: str) -> str:
    return fernet.encrypt(plain_text.encode()).decode()

def decrypt_password(encrypted_text: str) -> str:
    return fernet.decrypt(encrypted_text.encode()).decode()


import psycopg2
import pymysql
from app.dependencies import decrypt_password
from app.models.user_connection import UserConnection

def establish_connection(conn: UserConnection):
   

    password = decrypt_password(conn.encrypted_password)

    if conn.db_type.lower() == "postgresql":
        connection = psycopg2.connect(
            host=conn.host,
            port=conn.port,
            dbname=conn.database,
            user=conn.username,
            password=password,
            sslmode=conn.sslmode or "prefer"
        )
    elif conn.db_type.lower() == "mysql":
        connection = pymysql.connect(
            host=conn.host,
            port=conn.port,
            db=conn.database,
            user=conn.username,
            password=password,
            ssl={"ssl": {}} if conn.sslmode and conn.sslmode.lower() != "disable" else None
        )
    else:
        raise ValueError(f"Unsupported database type: {conn.db_type}")

   
    return connection


def fetch_schema_description(connection, db_type: str, db_name: str) -> str:
    
    cursor = connection.cursor()

    # Step 1: Get full schema with columns
    if db_type.lower() == "postgresql":
        cursor.execute("""
            SELECT table_name, column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public'
            ORDER BY table_name, ordinal_position
        """)
    elif db_type.lower() == "mysql":
        cursor.execute("""
            SELECT table_name, column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = %s
            ORDER BY table_name, ordinal_position
        """, (db_name,))
    else:
        raise ValueError(f"Unsupported DB type for schema fetch: {db_type}")

    rows = cursor.fetchall()

    # Step 2: Organize columns by table
    table_columns = {}
    for table, column, dtype in rows:
        table_columns.setdefault(table, []).append((column, dtype))

    schema_description = []
    total_columns = 0

    for table, columns in table_columns.items():
        schema_description.append(f"\n### Table: {table}")
        schema_description.append("Columns:")
        for column, dtype in columns:
            schema_description.append(f"- {column} ({dtype})")
            total_columns += 1

        # Step 3: Fetch example rows
        try:
            cursor.execute(f"SELECT * FROM {table} LIMIT 3")
            example_rows = cursor.fetchall()
            col_names = [desc[0] for desc in cursor.description]

            if example_rows:
                schema_description.append("Example rows:")
                for row in example_rows:
                    row_dict = dict(zip(col_names, row))
                    schema_description.append(f"- {row_dict}")
            else:
                schema_description.append("Example rows: [No data present]")
        except Exception as e:
            schema_description.append(f"Example rows: [Error fetching rows - {e}]")

    cursor.close()

   
    return "\n".join(schema_description)




def init_user_connections(session_id: str, user_id: int, db: Session):
    from app.models.user_connection import UserConnection
    from app.session_connection import session_conn_manager
  
    user_connections = db.query(UserConnection).filter(UserConnection.user_id == user_id).all()

    if not user_connections:
       
        return

    for conn in user_connections:
        db_id = f"{conn.db_type} - {conn.database}"
        

        if session_conn_manager.get_connection(session_id, db_id):
            
            continue

        try:
           
            connection = establish_connection(conn)
            schema = fetch_schema_description(connection, conn.db_type, conn.database)
            session_conn_manager.set_connection(session_id, db_id, connection, schema)
           
        except Exception as e:
            print(f"[ERROR] Failed to connect to {db_id}: {e}")

