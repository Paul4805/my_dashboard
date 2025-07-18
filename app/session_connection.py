from typing import Dict, Any, Optional
import threading

class SessionConnectionManager:
    def __init__(self):
        self.lock = threading.Lock()
        self._cache: Dict[str, Dict[str, Dict[str, Any]]] = {}
        # Structure: { session_id: { db_id: { "connection": ..., "schema": ... } } }

    def set_connection(self, session_id: str, db_id: str, connection: Any, schema: str):
        with self.lock:
            if session_id not in self._cache:
                self._cache[session_id] = {}
            self._cache[session_id][db_id] = {
                "connection": connection,
                "schema": schema
            }
          

    def get_connection(self, session_id: str, db_id: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            result = self._cache.get(session_id, {}).get(db_id)
           
            return result

    def remove_connection(self, session_id: str, db_id: str):
        with self.lock:
            if session_id in self._cache and db_id in self._cache[session_id]:
                try:
                    self._cache[session_id][db_id]["connection"].close()
                except Exception as e:
                    print(f"[WARN] Could not close connection for session_id='{session_id}', db_id='{db_id}': {e}")
                del self._cache[session_id][db_id]
               

            if not self._cache[session_id]:
                del self._cache[session_id]
              

    def clear_session(self, session_id: str):
        with self.lock:
            if session_id in self._cache:
                for db_id, data in self._cache[session_id].items():
                    try:
                        data["connection"].close()
                    except Exception as e:
                        print(f"[WARN] Failed to close connection for session_id='{session_id}', db_id='{db_id}': {e}")
                del self._cache[session_id]
                

# Singleton instance
session_conn_manager = SessionConnectionManager()
