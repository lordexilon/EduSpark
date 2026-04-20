import os
import json
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL", "https://mckfscukxcqwntpjagar.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8")

def check_materials():
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    # Get recent materials
    res = supabase.table("materials").select("id, title, rag_status, created_at, metadata").order("created_at", desc=True).limit(5).execute()
    
    print("Recent Materials:")
    for mat in res.data:
        print(f"ID: {mat['id']} | Title: {mat['title']} | Status: {mat['rag_status']} | Created: {mat['created_at']}")
        if mat['rag_status'] == 'processing':
            # Count chunks
            chunk_res = supabase.table("course_content_chunks").select("id", count="exact").eq("metadata->>material_id", str(mat['id'])).execute()
            print(f"   -> Chunks inserted so far: {chunk_res.count}")

if __name__ == "__main__":
    check_materials()
