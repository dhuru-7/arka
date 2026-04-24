import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_suggest_improvements():
    print("\n--- Testing /api/suggest_improvements ---")
    payload = {
        "prompt": "Add a database to the system",
        "mermaid_code": "graph TD\n  A[Frontend] --> B[API]",
        "diagramType": "flowchart",
        "vision_prompt": "1. The user wants a basic web app.\n2. Add a PostgreSQL database.\n3. Connect API to DB."
    }
    try:
        res = requests.post(f"{BASE_URL}/suggest_improvements", json=payload)
        if res.status_code == 200:
            data = res.json()
            print("Suggestions received:", data.get("suggestions"))
            return True
        else:
            print("Error:", res.status_code, res.text)
            return False
    except Exception as e:
        print("Exception:", e)
        return False

def test_interpret_refine():
    print("\n--- Testing /api/interpret_refine ---")
    payload = {
        "prompt": "Add a database to the system",
        "mermaid_code": "graph TD\n  A[Frontend] --> B[API]",
        "diagramType": "flowchart",
        "vision_prompt": "Architecture summary: Frontend, API."
    }
    try:
        res = requests.post(f"{BASE_URL}/interpret_refine", json=payload)
        if res.status_code == 200:
            data = res.json()
            print("Interpretation confirmation:", data.get("confirmation"))
            print("Technical instructions:", data.get("technical_instructions"))
            return True
        else:
            print("Error:", res.status_code, res.text)
            return False
    except Exception as e:
        print("Exception:", e)
        return False

if __name__ == "__main__":
    import time
    # Wait for backend to be ready
    for _ in range(5):
        try:
            requests.get("http://localhost:5000/")
            break
        except:
            time.sleep(2)
    
    if test_suggest_improvements() and test_interpret_refine():
        print("\n✅ New engine endpoints are functional.")
    else:
        print("\n❌ Errors in engine testing.")
