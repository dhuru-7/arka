import requests
import time

prompts = [
    "I need a sequence diagram showing how the frontend sends a login request to the API, queries the database, and returns the token.",
    "Plan a gantt chart for next month's sprint with frontend, backend, and testing phases.",
    "Show me an ER diagram for a library management system with Books, Authors, and Members.",
    "Generate a pie chart displaying our server usage distribution across AWS, GCP, and Azure."
]

expected = [
    "sequence",
    "gantt",
    "erDiagram",
    "pie"
]

print("Testing 4 complex prompts on /api/suggest...")
success = 0
for idx, (prompt, exp) in enumerate(zip(prompts, expected)):
    try:
        start = time.time()
        res = requests.post("http://localhost:5000/api/suggest", json={"prompt": prompt})
        duration = time.time() - start
        
        if res.status_code == 200:
            category = res.json().get("category")
            if category == exp:
                print(f"[{idx+1}/5] PASS: {exp} (took {duration:.2f}s) - {prompt[:50]}...")
                success += 1
            else:
                print(f"[{idx+1}/5] FAIL: Expected {exp}, got {category} (took {duration:.2f}s) - {prompt[:50]}...")
        else:
            print(f"[{idx+1}/5] ERROR: API returned status {res.status_code}")
    except Exception as e:
        print(f"[{idx+1}/5] EXCEPTION: {e}")

print(f"Result: {success}/5 accurate.")
