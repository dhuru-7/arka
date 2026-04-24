import requests
import json

def test_prompt(prompt, diagram_type="flowchart"):
    print(f"\nTesting prompt: {prompt}")
    url = "http://localhost:5000/api/vision"
    payload = {
        "prompt": prompt,
        "diagramType": diagram_type
    }
    try:
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        result = response.json()
        polished = result.get("polished_prompt", "")
        print(f"Polished length: {len(polished)}")
        print("First 100 chars:", polished[:100])
        print("Last 100 chars:", polished[-100:])
        
        # Check for 5 steps
        for i in range(1, 6):
            if f"{i}." in polished:
                print(f"Step {i} found.")
            else:
                print(f"Step {i} MISSING!")
                
        return polished
    except Exception as e:
        print(f"Error: {e}")
        return None

prompts = [
    "make a complex microservices architecture but keep it in 5 node. use redise cache, postgress db, api gate-way, and a worker. also add a user. some nodes are in private sub-nett, some in public. the worker is async.",
    "i want a flow chart for a shop. user logs in, then check if creds r ok. if yes go to home. if no show error. also if they want to reset passwd they can. then they see product and add to cart. then check out.",
    "gant for a project. start 2024-01-01. task 1 is planing for 5 day. then desgn for 10 day. then dev for 20 d. testing after dev for 7 day. and relase at end."
]

for p in prompts:
    test_prompt(p)
