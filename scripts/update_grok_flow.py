import json
from sqlalchemy import create_engine, text

db_url = "postgresql://postgres:postgres@supabase_db_eduspark-lms-local:5432/langflow"
engine = create_engine(db_url)

old_key = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
new_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

with engine.connect() as conn:
    # 1. Fetch all flows
    result = conn.execute(text("SELECT id, name, data FROM flow"))
    rows = result.fetchall()
    
    updated_count = 0
    for row in rows:
        flow_id, flow_name, data = row
        if not data:
            continue
        
        # Convert JSON column/dict to string to do a global search/replace
        data_str = json.dumps(data)
        if old_key in data_str:
            print(f"Found old key in flow '{flow_name}' ({flow_id}). Replacing...")
            new_data_str = data_str.replace(old_key, new_key)
            new_data = json.loads(new_data_str)
            
            # Update back to the DB using the deserialized dict
            conn.execute(
                text("UPDATE flow SET data = :data WHERE id = :id"),
                {"data": json.dumps(new_data), "id": flow_id}
            )
            updated_count += 1
            print(f"Successfully updated flow '{flow_name}'.")
            
    conn.commit()
    print(f"Process finished. Total flows updated: {updated_count}")
