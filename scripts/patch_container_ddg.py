import os

path = "/app/.venv/lib/python3.14/site-packages/lfx_duckduckgo/components/duckduckgo/duck_duck_go_search_run.py"
if os.path.exists(path):
    content = open(path).read()
    if "except (ValueError, AttributeError) as e:" in content:
        content = content.replace(
            "except (ValueError, AttributeError) as e:",
            "except Exception as e:"
        )
        open(path, "w").write(content)
        print("Patched duck_duck_go_search_run.py successfully!")
    else:
        print("duck_duck_go_search_run.py already patched or modified.")
else:
    print(f"Path {path} not found.")
