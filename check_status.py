import os
import json
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL", "https://mckfscukxcqwntpjagar.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8")

def check_status():
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    # Get recent processing documents
    res = supabase.table("processed_documents").select("id, title, processing_status, created_at, total_chunks, processed_by").order("created_at", desc=True).limit(5).execute()
    
    print("Recent Processed Documents:")
    for doc in res.data:
        print(f"ID: {doc['id']} | Title: {doc['title']} | Status: {doc['processing_status']} | Created: {doc['created_at']}")
        
        if doc['processing_status'] == 'processing':
            # Count chunks for this document
            # The chunks don't have a direct FK to processed_documents in the schema I saw in ingest.py, 
            # but they have sourceFileName in metadata
            chunk_res = supabase.table("course_content_chunks").select("id", count="exact").eq("metadata->>sourceFileName", doc['title']).execute()
            print(f"   -> Chunks inserted so far: {chunk_res.count}")

if __name__ == "__main__":
    check_status()
