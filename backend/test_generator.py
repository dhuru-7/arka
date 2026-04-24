import requests
import json
import re

PROMPTS = [
    "create a flowchart for a online exam system where student first logs in then system checks if credintials are valid or not if not valid show error and ask login again but if valid then check if exam window time is open or closed if closed show message exam not availble if open then load question paper and start timer meanwhile system autosaves every 30 sec and if internet disconnect happends then pause timer and retry connection if reconnect success resume exam otherwise allow student to submit partial answers when timer reaches 0 submit automatically and show result page",
    "generate flowchart for a food delivery app where user opens app searches resturant selects item add to cart then system checks if item stock availble if not ask user remove or replace item if availble then user proceeds to checkout where app checks login status if not logged in ask login/signup then select payment method cod or online payment if online payment fails give retry or switch method if payment success send order to resturant resturant can accept or reject if rejected refund user if accepted start delivery assign rider and track order untill delivered",
    "draw a flowchart for a smart home security system when motion sensor detects movement system first checks time if it is daytime ignore small movements but if night time turn on camera and record video then analyze if human detected or pet detected if pet ignore if human send notification to owner if owner confirms unknown person trigger alarm and call police if owner marks safe person stop alarm and log entry",
    "make a complicated flowchart for a website signup process user enters email username password then system checks if email already exist if yes ask user login instead if no then validate password strength if weak show warning and ask new password if strong then send otp to email user enters otp system verifies if otp incorrect allow retry 3 times if still wrong cancel signup if correct create account then ask user setup profile or skip if skip redirect dashboard",
    "create flowchart for a ai code review tool where developer uploads code file system scans syntax errors first if syntax errors found return list and stop process if no syntax errors then run static analysis and check security vulnerabilities if critical vulnerability found mark build fail otherwise generate code quality score then ask developer if they want auto refactor if yes run ai refactor and show diff preview developer can accept or reject changes if accepted commit changes to repo and trigger ci pipeline"
]

import requests
import json
import re

PROMPTS = [
    "create a flowchart for a online exam system where student first logs in then system checks if credintials are valid or not if not valid show error and ask login again but if valid then check if exam window time is open or closed if closed show message exam not availble if open then load question paper and start timer meanwhile system autosaves every 30 sec and if internet disconnect happends then pause timer and retry connection if reconnect success resume exam otherwise allow student to submit partial answers when timer reaches 0 submit automatically and show result page",
    "generate flowchart for a food delivery app where user opens app searches resturant selects item add to cart then system checks if item stock availble if not ask user remove or replace item if availble then user proceeds to checkout where app checks login status if not logged in ask login/signup then select payment method cod or online payment if online payment fails give retry or switch method if payment success send order to resturant resturant can accept or reject if rejected refund user if accepted start delivery assign rider and track order untill delivered",
    "draw a flowchart for a smart home security system when motion sensor detects movement system first checks time if it is daytime ignore small movements but if night time turn on camera and record video then analyze if human detected or pet detected if pet ignore if human send notification to owner if owner confirms unknown person trigger alarm and call police if owner marks safe person stop alarm and log entry",
    "make a complicated flowchart for a website signup process user enters email username password then system checks if email already exist if yes ask user login instead if no then validate password strength if weak show warning and ask new password if strong then send otp to email user enters otp system verifies if otp incorrect allow retry 3 times if still wrong cancel signup if correct create account then ask user setup profile or skip if skip redirect dashboard",
    "create flowchart for a ai code review tool where developer uploads code file system scans syntax errors first if syntax errors found return list and stop process if no syntax errors then run static analysis and check security vulnerabilities if critical vulnerability found mark build fail otherwise generate code quality score then ask developer if they want auto refactor if yes run ai refactor and show diff preview developer can accept or reject changes if accepted commit changes to repo and trigger ci pipeline"
]

def test_generation():
    with open("test_results.log", "w", encoding="utf-8") as f:
        f.write("Starting 5 complexity tests...\n")
        
        for i, prompt in enumerate(PROMPTS):
            f.write(f"\n--- TEST {i+1} ---\n")
            f.write(f"Prompt: {prompt[:80]}...\n")
            
            try:
                response = requests.post(
                    "http://127.0.0.1:5000/api/generate",
                    json={"prompt": prompt, "diagramType": "flowchart"},
                    timeout=60
                )
                response.raise_for_status()
                data = response.json()
                code = data.get("mermaid_code", "")
                
                # Print the code
                f.write("Generated Code:\n")
                f.write(code + "\n")
                
                # Simple static analysis for common errors
                f.write("\nAnalysis:\n")
                # Check for multiple arrows between same nodes
                edges = re.findall(r'(\w+)\s*(-+>)\s*(\w+)', code)
                edge_pairs = [f"{e[0]}->{e[2]}" for e in edges]
                from collections import Counter
                counts = Counter(edge_pairs)
                duplicates = {k: v for k, v in counts.items() if v > 1}
                if duplicates:
                    f.write(f"[WARN] FOUND MULTIPLE ARROWS BETWEEN SAME NODES: {duplicates}\n")
                else:
                    f.write("[OK] No duplicate edges found.\n")
                    
                # Check for unquoted text containing special characters
                unquoted_specials = re.findall(r'\[([^"\]]*?[,;:()][^"\]]*?)\]', code)
                if unquoted_specials:
                    f.write(f"[WARN] FOUND UNQUOTED SPECIAL CHARS IN LABELS: {unquoted_specials[:3]}\n")
                else:
                    f.write("[OK] Labels seem safe or quoted.\n")
                    
                # Check for invalid reserved keyword "end" used as node ID
                if re.search(r'(^|\n)end(\s*[-=]>|[\(\[\{])', code) or re.search(r'([\(\[\{])end([\)\]\}])', code) or re.search(r'([-=]>(?:\s*\|[^|]*\|)?\s*)end(\s|[\(\[\{\n]|$)', code):
                    f.write("[WARN] FOUND SINTAX ERROR: 'end' used as node ID!\n")
                else:
                    f.write("[OK] No illegal 'end' usage.\n")
                    
            except Exception as e:
                f.write(f"[ERROR] Error during generation: {e}\n")

if __name__ == "__main__":
    test_generation()
