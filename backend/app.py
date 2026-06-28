import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import requests
import json
import re
from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from dotenv import load_dotenv
try:
    import fitz  # PyMuPDF
    pymupdf_available = True
except ImportError:
    pymupdf_available = False
from diagram_agent import DiagramAgent
from mermaid_validator import validate_mermaid_code


# Reload env vars to ensure updates take effect
load_dotenv()

app = Flask(__name__)
CORS(app)

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "knowledge")

# Map diagram types to knowledge bank files
KNOWLEDGE_FILES = {
    "flowchart": "flowchart.md",
    "architecture": "architecture.md",
    "xy": "xy_chart.md",
    "pie": "pie_chart.md",
    "sequence": "sequence.md",
    "erDiagram": "er_diagram.md",
    "gantt": "gantt.md"
}


def agent_from_request(data):
    """Create a stateless agent from request settings. API keys are not stored."""
    provider = data.get("provider")
    model = data.get("model")
    api_key = data.get("apiKey")
    
    if not provider or provider == 'free':
        provider = 'sarvam'
        model = 'sarvam-30b'
        api_key = SARVAM_API_KEY
        if not api_key:
            raise RuntimeError("Sarvam API key (free tier) is not configured on the server. Please configure your own API key in Settings.")
            
    return DiagramAgent(api_key=api_key, provider=provider, model=model, knowledge_dir=KNOWLEDGE_DIR)


def load_knowledge(diagram_type):
    """Load the knowledge bank rules for a given diagram type."""
    filename = KNOWLEDGE_FILES.get(diagram_type)
    if not filename:
        return ""
    
    filepath = os.path.join(KNOWLEDGE_DIR, filename)
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        print(f"Knowledge file not found: {filepath}")
        return ""


@app.route('/api/agent/suggest', methods=['POST'])
def agent_suggest_diagram():
    data = request.json or {}
    user_prompt = data.get('prompt', '')
    if not user_prompt:
        return jsonify({"error": "No prompt provided"}), 400

    try:
        result = agent_from_request(data).suggest_type(user_prompt)
        return jsonify(result)
    except Exception as e:
        print(f"Agent suggest error: {e}")
        return jsonify({"error": f"Agent suggestion failed: {str(e)}"}), 500


@app.route('/api/agent/generate', methods=['POST'])
def agent_generate_diagram():
    data = request.json or {}
    user_prompt = data.get('prompt', '')
    diagram_type = data.get('diagramType', 'flowchart')
    if not user_prompt:
        return jsonify({"error": "No prompt provided"}), 400

    try:
        agent = agent_from_request(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    is_vercel = os.getenv('VERCEL') == '1' or 'VERCEL' in os.environ
    if is_vercel:
        try:
            steps = []
            def on_progress(step):
                steps.append(step)
            
            result = agent.generate(user_prompt, diagram_type, on_progress=on_progress)
            
            response_data = []
            for step in steps:
                response_data.append(json.dumps({"type": "progress", "content": step}) + "\n")
            response_data.append(json.dumps({"type": "result", "content": result}) + "\n")
            
            return Response("".join(response_data), mimetype='application/x-ndjson')
        except Exception as e:
            error_line = json.dumps({"type": "error", "content": str(e)}) + "\n"
            return Response(error_line, mimetype='application/x-ndjson')

    import queue
    import threading
    q = queue.Queue()

    def run_agent():
        try:
            def on_progress(step):
                q.put({"type": "progress", "content": step})
            
            result = agent.generate(user_prompt, diagram_type, on_progress=on_progress)
            q.put({"type": "result", "content": result})
        except Exception as e:
            q.put({"type": "error", "content": str(e)})
        finally:
            q.put(None)

    threading.Thread(target=run_agent).start()

    def event_stream():
        while True:
            item = q.get()
            if item is None:
                break
            yield json.dumps(item) + "\n"

    return Response(event_stream(), mimetype='application/x-ndjson')


@app.route('/api/agent/validate', methods=['POST'])
def agent_validate_diagram():
    data = request.json or {}
    code = data.get('mermaid_code', '')
    diagram_type = data.get('diagramType', 'flowchart')
    if not code:
        return jsonify({"error": "Missing mermaid_code"}), 400
    return jsonify(validate_mermaid_code(code, diagram_type))


@app.route('/api/agent/refine', methods=['POST'])
def agent_refine_diagram():
    data = request.json or {}
    user_prompt = data.get('prompt', '')
    mermaid_code = data.get('mermaid_code', '')
    diagram_type = data.get('diagramType', 'flowchart')
    if not user_prompt or not mermaid_code:
        return jsonify({"error": "Missing prompt or mermaid_code"}), 400

    try:
        agent = agent_from_request(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    is_vercel = os.getenv('VERCEL') == '1' or 'VERCEL' in os.environ
    if is_vercel:
        try:
            steps = []
            def on_progress(step):
                steps.append(step)
            
            result = agent.refine(
                user_prompt,
                mermaid_code,
                diagram_type,
                selected_context=data.get('selected_context', []),
                on_progress=on_progress
            )
            
            response_data = []
            for step in steps:
                response_data.append(json.dumps({"type": "progress", "content": step}) + "\n")
            response_data.append(json.dumps({"type": "result", "content": result}) + "\n")
            
            return Response("".join(response_data), mimetype='application/x-ndjson')
        except Exception as e:
            error_line = json.dumps({"type": "error", "content": str(e)}) + "\n"
            return Response(error_line, mimetype='application/x-ndjson')

    import queue
    import threading
    q = queue.Queue()

    def run_agent():
        try:
            def on_progress(step):
                q.put({"type": "progress", "content": step})
            
            result = agent.refine(
                user_prompt,
                mermaid_code,
                diagram_type,
                selected_context=data.get('selected_context', []),
                on_progress=on_progress
            )
            q.put({"type": "result", "content": result})
        except Exception as e:
            q.put({"type": "error", "content": str(e)})
        finally:
            q.put(None)

    threading.Thread(target=run_agent).start()

    def event_stream():
        while True:
            item = q.get()
            if item is None:
                break
            yield json.dumps(item) + "\n"

    return Response(event_stream(), mimetype='application/x-ndjson')


@app.route('/api/agent/chat', methods=['POST'])
def agent_chat():
    data = request.json or {}
    
    provider = data.get('provider')
    if not provider or provider == 'free':
        data['provider'] = 'sarvam'
        data['model'] = 'sarvam-30b'
        data['apiKey'] = SARVAM_API_KEY

    system_prompt = data.get('system_prompt', '')
    user_message = data.get('user_message', '')
    
    if not user_message:
        return jsonify({"error": "No user message provided"}), 400

    try:
        agent = agent_from_request(data)
        content = agent.call_model(system_prompt, user_message, temperature=0.2, max_tokens=650)
        return jsonify({"content": content})
    except Exception as e:
        print(f"Agent chat error: {e}")
        return jsonify({"error": f"Agent chat failed: {str(e)}"}), 500


@app.route('/api/agent/optimize-prompt', methods=['POST'])
def agent_optimize_prompt():
    data = request.json or {}
    user_prompt = data.get('prompt', '')
    if not user_prompt:
        return jsonify({"error": "No prompt provided"}), 400

    try:
        agent = agent_from_request(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    system_prompt = (
        "You are an expert prompt optimizer for generating high-quality Mermaid JS diagrams.\n"
        "Your task is to take the user's input prompt (which may have spelling mistakes, typos, or be extremely short/simple) and optimize it.\n\n"
        "Optimization rules:\n"
        "1. Correct all spelling, grammar, and structural mistakes.\n"
        "2. If the prompt is short (like 'water cycle' or 'photosynthesis'), rewrite it into a detailed, structured, step-by-step description of the flow, processes, components, and relationships. This detailed prompt will be used to generate a rich, accurate, and comprehensive diagram.\n"
        "3. Output ONLY the final optimized, expanded prompt itself.\n"
        "4. Do NOT include any explanations, introductions, headers, list of changes, markdown code blocks, or preamble.\n"
        "5. Start immediately with the optimized prompt text.\n\n"
        "Example 1:\n"
        "Input: photosintesis\n"
        "Output: A detailed process flowchart of Photosynthesis. It starts with light absorption by chlorophyll in the leaves. Carbon dioxide enters through the stomata, and water is absorbed by the roots. Under light energy, the light-dependent reactions produce ATP and NADPH while releasing Oxygen. Then, the light-independent Calvin Cycle uses ATP, NADPH, and Carbon Dioxide to synthesize Glucose (sugar).\n\n"
        "Example 2:\n"
        "Input: login logic with bad password\n"
        "Output: A flow diagram showing user login logic. The user enters their username and password. The system checks if the username exists. If no, show user not found error. If yes, check password. If password is incorrect, increment failed attempts, check if attempts exceed 3. If yes, lock account and notify user. If no, show incorrect password error and prompt retry. If password is correct, reset failed attempts counter, generate session token, and redirect to dashboard."
    )

    try:
        content = agent.call_model(system_prompt, user_prompt, temperature=0.3, max_tokens=1500)
        # Clean any accidental quotes around the output
        if content.startswith('"') and content.endswith('"'):
            content = content[1:-1].strip()
        elif content.startswith("'") and content.endswith("'"):
            content = content[1:-1].strip()
        return jsonify({"optimized_prompt": content})
    except Exception as e:
        print(f"Agent optimize prompt error: {e}")
        return jsonify({"error": f"Agent prompt optimization failed: {str(e)}"}), 500



@app.route('/api/suggest', methods=['POST'])
def suggest_diagram():
    return jsonify({
        "error": "This endpoint was retired. Use /api/agent/suggest with the user's selected provider and model."
    }), 410



@app.route('/api/generate', methods=['POST'])
def generate_diagram():
    data = request.json
    user_prompt = data.get('prompt', '')
    diagram_type = data.get('diagramType', 'flowchart')
    
    if not user_prompt:
        return jsonify({"error": "No prompt provided"}), 400

    # Load knowledge bank rules for this diagram type
    knowledge_rules = load_knowledge(diagram_type)

    headers = {
        "Authorization": f"Bearer {SARVAM_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Build system prompt based on diagram type with knowledge bank
    if diagram_type == "pie":
        system_prompt = (
            "You are an expert data visualization designer generating Mermaid JS diagrams.\n\n"
            "KNOWLEDGE BANK RULES (you MUST follow these):\n"
            f"{knowledge_rules}\n\n"
            "CRITICAL INSTRUCTIONS:\n"
            "- Output ONLY valid Mermaid JS pie chart code.\n"
            "- Do NOT wrap in markdown code blocks (no ```mermaid).\n"
            "- Do NOT include any explanation or text before/after the code.\n"
            "- Start with 'pie showData' on the first line.\n"
            "- Include a title.\n"
            "- Each slice: \"Label\" : value\n"
            "- Keep 3-8 categories.\n"
            "- Use realistic, proportional values.\n"
        )
    elif diagram_type == "xy":
        system_prompt = (
            "You are an expert data visualization designer generating Mermaid JS diagrams.\n\n"
            "KNOWLEDGE BANK RULES (you MUST follow these):\n"
            f"{knowledge_rules}\n\n"
            "CRITICAL INSTRUCTIONS:\n"
            "- Output ONLY valid Mermaid JS xychart-beta code.\n"
            "- Do NOT wrap in markdown code blocks (no ```mermaid).\n"
            "- Do NOT include any explanation or text before/after the code.\n"
            "- Start with 'xychart-beta' on the first line.\n"
            "- Include title, x-axis, y-axis, and at least one data series (bar or line).\n"
            "- Use realistic data values.\n"
            "- X-axis labels in brackets: [Label1, Label2, ...]\n"
            "- Values in brackets: [val1, val2, ...]\n"
        )
    elif diagram_type == "architecture":
        system_prompt = (
            "You are an expert systems architect generating Mermaid JS diagrams.\n\n"
            "KNOWLEDGE BANK RULES (you MUST follow these):\n"
            f"{knowledge_rules}\n\n"
            "CRITICAL INSTRUCTIONS:\n"
            "- Output ONLY valid Mermaid JS flowchart code (used for architecture diagrams).\n"
            "- Do NOT wrap in markdown code blocks (no ```mermaid).\n"
            "- Do NOT include any explanation or text before/after the code.\n"
            "- Start with 'flowchart LR' or 'flowchart TD'.\n"
            "- ALWAYS wrap node text in double quotes to prevent parser errors (e.g. A[\"Frontend API\"] or B{{\"Redis Cache\"}}).\n"
            "- CLEAN ARCHITECTURE LAYOUT: Divide the system into clear BLOCKS using subgraphs (e.g. 'Frontend', 'Backend', 'Data Layer').\n"
            "- Keep each subgraph SMALL - max 3-4 nodes per block.\n"
            "- Connect blocks with simple, clear arrows between them. Avoid crossing/tangling connections.\n"
            "- SIMPLICITY FIRST: Focus on the ESSENTIAL architectural components. Do not over-engineer.\n"
            "- If the prompt is simple, keep the diagram simple (4-8 nodes). Only expand for complex prompts.\n"
            "- Use a LINEAR left-to-right or top-to-bottom flow. Avoid circular dependencies or complex cross-connections.\n"
            "- Use cylinders [(\"text\")] for databases.\n"
            "- Use hexagons {{\"text\"}} for caches.\n"
            "- Use stadiums ([\"text\"]) for load balancers/gateways.\n"
            "- Label edges with protocols (REST, gRPC, WebSocket).\n"
            "- Keep between 4-15 nodes max unless the prompt explicitly asks for high detail.\n"
            "- Node IDs MUST be simple contiguous alphanumeric strings (e.g. gateway1, authService). NEVER use spaces in Node IDs.\n"
        )
    elif diagram_type == "sequence":
        system_prompt = (
            "You are an expert system interaction designer generating Mermaid JS sequence diagrams.\n\n"
            "KNOWLEDGE BANK RULES (you MUST follow these):\n"
            f"{knowledge_rules}\n\n"
            "CRITICAL INSTRUCTIONS:\n"
            "- Output ONLY valid Mermaid JS sequence diagram code.\n"
            "- Do NOT wrap in markdown code blocks (no ```mermaid).\n"
            "- Do NOT include any explanation or text before/after the code.\n"
            "- First line MUST be 'sequenceDiagram'.\n"
            "- ALWAYS declare ALL participants at the top using 'participant alias as Full Name' or 'actor alias as Full Name'.\n"
            "- Use 'actor' for human users and 'participant' for systems/services.\n"
            "- Participant aliases MUST be simple alphanumeric strings (no spaces, no hyphens, no special chars).\n"
            "- Use ->>+ and -->>- for activation/deactivation to show processing lifelines. Ensure activations are balanced: any '+' inside a block (alt, else, par, loop) must be deactivated with '-' before that block ends.\n"
            "- Keep to 3-6 participants maximum.\n"
            "- Message text after the colon MUST NOT contain colons, semicolons, or angle brackets.\n"
            "- Keep message text under 40 characters.\n"
            "- Use alt/else/end for conditional branching sparingly (max 1-2 blocks).\n"
            "- Parallel blocks MUST use brackets: 'par [Title]' (not 'par Title').\n"
            "- Show clear request-response pairs.\n"
            "- Every activate must have a matching deactivate.\n"
        )
    elif diagram_type == "erDiagram":
        system_prompt = (
            "You are an expert database architect generating Mermaid JS ER diagrams.\n\n"
            "KNOWLEDGE BANK RULES (you MUST follow these):\n"
            f"{knowledge_rules}\n\n"
            "CRITICAL INSTRUCTIONS:\n"
            "- Output ONLY valid Mermaid JS erDiagram code.\n"
            "- Do NOT wrap in markdown code blocks (no ```mermaid).\n"
            "- Do NOT include any explanation or text before/after the code.\n"
            "- First line MUST be 'erDiagram'.\n"
            "- Entity names MUST be single PascalCase words (no spaces, hyphens, or special chars). e.g. OrderItem, ShippingAddress.\n"
            "- Define 3-6 key attributes per entity (PK, FKs, and 2-3 important fields).\n"
            "- Attribute format: type name constraint (e.g. 'int id PK', 'string email UK', 'int userId FK').\n"
            "- Every relationship MUST have a quoted label after colon: Entity1 ||--o{ Entity2 : \"label\".\n"
            "- Use proper cardinality: ||--|| (one-to-one), ||--o{ (one-to-many), o{--o{ (many-to-many).\n"
            "- Keep entities to 4-10 for readability.\n"
            "- For many-to-many, use junction tables.\n"
            "- Do NOT use spaces in entity or attribute names.\n"
        )
    elif diagram_type == "gantt":
        system_prompt = (
            "You are an expert project manager generating Mermaid JS Gantt charts.\n\n"
            "KNOWLEDGE BANK RULES (you MUST follow these):\n"
            f"{knowledge_rules}\n\n"
            "CRITICAL INSTRUCTIONS:\n"
            "- Output ONLY valid Mermaid JS Gantt chart code.\n"
            "- Do NOT wrap in markdown code blocks (no ```mermaid).\n"
            "- Do NOT include any explanation or text before/after the code.\n"
            "- First line MUST be 'gantt'.\n"
            "- Second line MUST be 'title <Chart Title>'.\n"
            "- Third line MUST be 'dateFormat YYYY-MM-DD'.\n"
            "- Optionally add 'axisFormat %b %d' for better date display.\n"
            "- Group tasks into 3-5 sections using 'section Name'.\n"
            "- Every task MUST have a unique alphanumeric ID (no spaces, no hyphens).\n"
            "- Task format: 'Task Name : status, taskId, startDate, endDate' OR 'Task Name : taskId, after prevId, duration'.\n"
            "- Duration format: '7d' for 7 days, '14d' for 2 weeks.\n"
            "- Use 'done' for completed, 'active' for in-progress, 'crit' for critical path.\n"
            "- Include milestones using 0d duration: 'Milestone : milestone, m1, date, 0d'.\n"
            "- Task names must NOT contain colons.\n"
            "- Use 'after taskId' for sequential dependencies.\n"
            "- Keep total tasks to 10-25 for readability.\n"
            "- Use realistic durations (not 1d for major phases).\n"
        )
    else:  # flowchart
        system_prompt = (
            "You are an expert process designer generating Mermaid JS diagrams.\n\n"
            "KNOWLEDGE BANK RULES (you MUST follow these):\n"
            f"{knowledge_rules}\n\n"
            "CRITICAL INSTRUCTIONS:\n"
            "- Output ONLY valid Mermaid JS flowchart code.\n"
            "- SIMPLICITY FIRST: Keep the diagram CLEAN and READABLE. Focus on the HAPPY PATH and primary logic.\n"
            "- Do NOT add unnecessary edge cases, error handling, or parallel branches unless explicitly requested.\n"
            "- If the prompt is basic (e.g. 'login logic'), provide a direct 5-8 node STRAIGHT-LINE flow.\n"
            "- Do NOT wrap in markdown code blocks (no ```mermaid).\n"
            "- Do NOT include any explanation or text before/after the code.\n"
            "- Start with 'flowchart TD'.\n"
            "- ALWAYS wrap node text in double quotes (e.g. A[\"Submit Form\"] or B{\"Is Valid?\"}).\n"
            "- Use correct shapes: diamonds {\"text\"} for decisions, parallelograms [/\"text\"/] for I/O.\n"
            "- Always include Start and End nodes using stadium shape ([\"text\"]).\n"
            "- Prefer a SINGLE straight-line flow from top to bottom. Minimize branching.\n"
            "- Use at most ONE decision diamond per 5 nodes.\n"
            "- Keep between 4-10 nodes max for clarity, unless the prompt is highly detailed.\n"
            "- Node IDs MUST be simple contiguous alphanumeric strings (e.g. startNode, checkPass). NEVER use spaces in Node IDs.\n"
        )
    
    payload = {
        "model": "sarvam-30b",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Create a {diagram_type} diagram for: {user_prompt}"}
        ],
        "temperature": 0.2,
        "max_tokens": 2500
    }
    
    try:
        response = requests.post(
            "https://api.sarvam.ai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        result = response.json()
        content = result['choices'][0]['message']['content'].strip()
        
        # Clean up: remove markdown code blocks if present
        content = re.sub(r'^```(?:mermaid)?\s*\n?', '', content)
        content = re.sub(r'\n?```\s*$', '', content)
        content = content.replace("```mermaid", "").replace("```", "")
        content = content.strip()

        # REPLACEMENT LOGIC FOR RESERVED 'end' KEYWORD (flowchart/architecture only)
        if diagram_type in ['flowchart', 'architecture']:
            # Renames node IDs from 'end' to 'finish' to prevent Mermaid parser crashes.
            content = re.sub(r'(^|\n)end(\s*[-=]>|[\(\[\{])', r'\1finish\2', content)
            content = re.sub(r'([\(\[\{])end([\)\]\}])', r'\1finish\2', content)
            content = re.sub(r'([-=]>(?:\s*\|[^|]*\|)?\s*)end(\s|[\(\[\{\n]|$)', r'\1finish\2', content)

        # GLOBAL SYNTAX FIXES
        # 1. Strip internal LLM tags if they leak (e.g., <tool_call>)
        # 1. Strip internal LLM tags if they leak - specifically target common ones
        # to avoid stripping technical labels like "<100ms"
        content = re.sub(r'<(?:thought|tool_call|debug|internal)[^>]*>.*?</(?:thought|tool_call|debug|internal)>', '', content, flags=re.DOTALL)
        content = re.sub(r'<(?:thought|tool_call|debug|internal)[^>]*>', '', content)

        # 2. Remove duplicate diagram headers (LLM sometimes outputs two 'flowchart TD' etc.)
        lines = content.split('\n')
        header_keywords = ['flowchart ', 'sequenceDiagram', 'erDiagram', 'gantt', 'pie', 'xychart-beta']
        header_count = 0
        cleaned_lines = []
        for line in lines:
            stripped = line.strip()
            is_header = any(stripped.startswith(kw) for kw in header_keywords)
            if is_header:
                header_count += 1
                if header_count > 1:
                    continue
            cleaned_lines.append(line)
        content = '\n'.join(cleaned_lines)
        

        # PIE CHART SYNTAX FIXES
        if diagram_type == 'pie':
            # 1. First, extract the title if it exists
            title_match = re.search(r'title\s+([^\n]+)', content)
            title_line = f"    title {title_match.group(1).strip()}\n" if title_match else ""
            
            # 2. Extract all data points (Label : Value)
            # This regex is robust: it finds anything that looks like "Label" : 123
            data_points = re.findall(r'["\']?([^"\':=]+)["\']?\s*[:=]\s*(\d+(?:\.\d+)?)\s*%?', content)
            
            # 3. Clean the data points (strip "title" if it was accidentally caught)
            clean_data = []
            for label, value in data_points:
                if label.strip().lower() == 'title': continue
                clean_data.append(f'    "{label.strip()}" : {value}')
            
            # 4. Reconstruct the pie chart with perfect indentation
            # Simplify header for better compatibility and ensure 4-space indentation
            header = "pie\n"
            content = header + title_line + "\n".join(clean_data)

        # XY CHART SYNTAX FIXES
        if diagram_type == 'xy':
            # 1. Extract Title
            title_match = re.search(r'title\s+["\']?([^"\']+)["\']?', content)
            title_line = f'    title "{title_match.group(1).strip()}"\n' if title_match else ""

            # 2. Extract X-Axis Labels
            x_match = re.search(r'x-axis\s*\[([^\]]+)\]', content)
            if x_match:
                labels = [l.strip().strip('"\'') for l in x_match.group(1).split(',')]
                x_line = f'    x-axis ["{ "\", \"".join(labels) }"]\n'
            else:
                x_line = ""

            # 3. Extract Y-Axis configuration
            y_match = re.search(r'y-axis\s*["\']?([^"\']+)["\']?\s*([^\]\n]+)', content)
            y_line = f'    y-axis "{y_match.group(1).strip()}" {y_match.group(2).strip()}\n' if y_match else ""

            # 4. Extract Data Series (Bar and Line)
            series_matches = re.findall(r'(bar|line)\s*\[([^\]]+)\]', content)
            series_lines = []
            for s_type, s_vals in series_matches:
                # Clean values (keep only numbers and commas)
                vals = re.sub(r'[^0-9.,-]', '', s_vals)
                series_lines.append(f'    {s_type} [{vals}]')
            
            # 5. Reconstruct
            content = "xychart-beta\n" + title_line + x_line + y_line + "\n".join(series_lines)

        # ARCHITECTURE SYNTAX FIXES (Flowchart / Architecture)
        if diagram_type in ['flowchart', 'architecture']:
            # 2. Fix illegal nested shapes like node(([ "text" ])) -> node([ "text" ])
            content = re.sub(r'(\w+)\s*\(\(\s*([\[\{\(])', r'\1\2', content)
            content = re.sub(r'([\]\}\)])\s*\)\)', r'\1', content)

        # SEQUENCE DIAGRAM SYNTAX FIXES
        if diagram_type == 'sequence':
            lines = content.split('\n')
            # Ensure first line is 'sequenceDiagram'
            if lines and lines[0].strip() != 'sequenceDiagram':
                lines = ['sequenceDiagram'] + [l for l in lines if l.strip() != 'sequenceDiagram']
            # Remove colons from message text (after the first colon separator)
            fixed_lines = []
            for line in lines:
                stripped = line.strip()
                # Match interaction lines: Participant->>Participant: message
                arrow_match = re.match(r'(\s*\S+\s*-[->x)]+[+-]?\s*\S+\s*:\s*)(.*)', line)
                if arrow_match:
                    prefix = arrow_match.group(1)
                    msg = arrow_match.group(2)
                    # Remove colons and semicolons from message text
                    msg = msg.replace(':', ' -').replace(';', ',')
                    # Remove any angle brackets
                    msg = re.sub(r'<[^>]*>', '', msg)
                    fixed_lines.append(prefix + msg)
                else:
                    fixed_lines.append(line)
            
            # Fix unbalanced activations: track +/- per participant
            activation_counts = {}
            balanced_lines = []
            for line in fixed_lines:
                stripped = line.strip()
                
                # Detect activation (+) on target participant
                act_match = re.match(r'[^:]+->>\+\s*([a-zA-Z0-9_]+)\s*:', stripped)
                if not act_match:
                    # Also try to match without colon at the end if it's just an activation message
                    act_match = re.match(r'[^:]+->>\+\s*([a-zA-Z0-9_]+)', stripped)
                    
                target = None
                if act_match:
                    target = act_match.group(1).strip()
                    activation_counts[target] = activation_counts.get(target, 0) + 1
                    
                # Detect deactivation (-) on target participant
                deact_match = re.match(r'[^:]+-->>-\s*([a-zA-Z0-9_]+)\s*:', stripped)
                if not deact_match:
                    deact_match = re.match(r'[^:]+-->>-\s*([a-zA-Z0-9_]+)', stripped)
                    
                if deact_match:
                    target = deact_match.group(1).strip()
                    if activation_counts.get(target, 0) > 0:
                        activation_counts[target] -= 1
                    else:
                        # Unbalanced deactivation! Strip the '-' marker
                        line = line.replace('-->>-', '-->>')
                
                balanced_lines.append(line)
            content = '\n'.join(balanced_lines)

        # ER DIAGRAM SYNTAX FIXES
        if diagram_type == 'erDiagram':
            lines = content.split('\n')
            # Ensure first line is 'erDiagram'
            if lines and lines[0].strip() != 'erDiagram':
                lines = ['erDiagram'] + [l for l in lines if l.strip() != 'erDiagram']
            # Fix entity names with spaces → camelCase
            # Fix relationship lines missing quotes around labels
            fixed_lines = []
            for line in lines:
                stripped = line.strip()
                # Fix relationship lines - ensure label is quoted
                rel_match = re.match(r'(\s*\w+\s+[|o}{]+--[|o}{]+\s+\w+\s*:\s*)([^"].*[^"]\s*)$', line)
                if rel_match:
                    prefix = rel_match.group(1)
                    label = rel_match.group(2).strip()
                    fixed_lines.append(f'{prefix}"{label}"')
                else:
                    fixed_lines.append(line)
            content = '\n'.join(fixed_lines)

        # GANTT CHART SYNTAX FIXES
        if diagram_type == 'gantt':
            lines = content.split('\n')
            # Ensure first line is 'gantt'
            if lines and lines[0].strip() != 'gantt':
                lines = ['gantt'] + [l for l in lines if l.strip() != 'gantt']
            # Ensure dateFormat line exists
            has_date_format = any('dateFormat' in l for l in lines)
            if not has_date_format:
                # Insert after title or after 'gantt'
                insert_idx = 1
                for i, l in enumerate(lines):
                    if l.strip().startswith('title'):
                        insert_idx = i + 1
                        break
                lines.insert(insert_idx, '    dateFormat YYYY-MM-DD')
            # Fix colons in task names (replace with dashes)
            fixed_lines = []
            for line in lines:
                stripped = line.strip()
                # Match task lines: Task Name : id, date, date
                if ':' in stripped and not stripped.startswith('title') and not stripped.startswith('dateFormat') and not stripped.startswith('axisFormat') and not stripped.startswith('section') and not stripped.startswith('gantt') and not stripped.startswith('excludes') and not stripped.startswith('todayMarker'):
                    parts = stripped.split(':')
                    if len(parts) > 2:
                        # Task name has colons - merge the name parts
                        task_name = ' - '.join(parts[:-1]).strip()
                        task_def = parts[-1].strip()
                        indent = line[:len(line) - len(line.lstrip())]
                        fixed_lines.append(f'{indent}{task_name} : {task_def}')
                    else:
                        fixed_lines.append(line)
                else:
                    fixed_lines.append(line)
            content = '\n'.join(fixed_lines)

        return jsonify({"mermaid_code": content, "diagram_type": diagram_type})
        
    except Exception as e:
        print(f"Error calling Sarvam 105B generation: {e}")
        # Fallback diagrams per type
        fallbacks = {
            "flowchart": (
                "flowchart TD\n"
                "    start([Start]) --> process[Process Input]\n"
                "    process --> decision{Is Valid?}\n"
                "    decision -->|Yes| success[Success]\n"
                "    decision -->|No| error[Handle Error]\n"
                "    error --> process\n"
                "    success --> finish([End])"
            ),
            "architecture": (
                "flowchart LR\n"
                "    user(((User))) --> lb([API Gateway])\n"
                "    subgraph Services\n"
                "        lb --> api[Backend API]\n"
                "        api --> auth[Auth Service]\n"
                "    end\n"
                "    subgraph Data\n"
                "        api --> db[(Database)]\n"
                "        api --> cache{{Cache}}\n"
                "    end"
            ),
            "xy": (
                "xychart-beta\n"
                "    title \"Data Overview\"\n"
                "    x-axis [Q1, Q2, Q3, Q4]\n"
                "    y-axis \"Value\" 0 --> 100\n"
                "    bar [30, 55, 72, 90]\n"
                "    line [25, 50, 68, 85]"
            ),
            "pie": (
                "pie showData\n"
                "    title Distribution\n"
                "    \"Category A\" : 40\n"
                "    \"Category B\" : 30\n"
                "    \"Category C\" : 20\n"
                "    \"Category D\" : 10"
            ),
            "sequence": (
                "sequenceDiagram\n"
                "    actor User\n"
                "    participant API as API Server\n"
                "    participant DB as Database\n"
                "\n"
                "    User->>+API: Send Request\n"
                "    API->>+DB: Query Data\n"
                "    DB-->>-API: Return Results\n"
                "    API-->>-User: Send Response"
            ),
            "erDiagram": (
                "erDiagram\n"
                "    Customer {\n"
                "        int id PK\n"
                "        string name\n"
                "        string email UK\n"
                "    }\n"
                "    Order {\n"
                "        int id PK\n"
                "        int customerId FK\n"
                "        date orderDate\n"
                "    }\n"
                "    Product {\n"
                "        int id PK\n"
                "        string name\n"
                "        float price\n"
                "    }\n"
                "    Customer ||--o{ Order : \"places\"\n"
                "    Order ||--|{ Product : \"contains\""
            ),
            "gantt": (
                "gantt\n"
                "    title Project Timeline\n"
                "    dateFormat YYYY-MM-DD\n"
                "    section Planning\n"
                "    Requirements : done, req1, 2024-01-01, 2024-01-10\n"
                "    Design : active, des1, after req1, 10d\n"
                "    section Development\n"
                "    Backend : dev1, after des1, 21d\n"
                "    Frontend : dev2, after des1, 18d\n"
                "    section Testing\n"
                "    QA Testing : test1, after dev1 dev2, 14d"
            )
        }
        
        return jsonify({
            "mermaid_code": fallbacks.get(diagram_type, fallbacks["flowchart"]),
            "diagram_type": diagram_type
        })


@app.route('/api/upload-doc', methods=['POST'])
def upload_document():
    """Extract text from uploaded document (PDF, DOCX, TXT) and return it for diagram generation."""
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    filename = file.filename.lower()
    
    try:
        if filename.endswith('.pdf'):
            if not pymupdf_available:
                return jsonify({"error": "PDF text extraction is not available on this server environment (missing dependencies)."}), 400
            # Use PyMuPDF for PDF extraction
            pdf_bytes = file.read()
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            text_parts = []
            for page in doc:
                text_parts.append(page.get_text())
            doc.close()
            extracted_text = "\n".join(text_parts)
        elif filename.endswith('.txt') or filename.endswith('.md'):
            extracted_text = file.read().decode('utf-8', errors='ignore')
        else:
            return jsonify({"error": "Unsupported file type. Use PDF, TXT, or MD."}), 400
        
        # Truncate to avoid token limits
        extracted_text = extracted_text[:4000]
        
        return jsonify({"extracted_text": extracted_text, "filename": file.filename})
    except Exception as e:
        print(f"Document extraction error: {e}")
        return jsonify({"error": f"Failed to process document: {str(e)}"}), 500



@app.route('/api/generate-byok', methods=['POST'])
def generate_byok():
    """Proxy endpoint for BYOK API calls. The user's API key is passed in the
    request body and forwarded to the provider (Sarvam or Groq) — never stored on the server."""
    data = request.json
    user_api_key = data.get('apiKey', '')
    model = data.get('model', 'sarvam-30b')
    provider = data.get('provider', 'sarvam')
    system_prompt = data.get('systemPrompt', '')
    user_message = data.get('userMessage', '')
    temperature = data.get('temperature', 0.2)
    max_tokens = data.get('maxTokens', 2500)

    if not user_api_key or not user_message:
        return jsonify({"error": "Missing apiKey or userMessage"}), 400

    headers = {
        "Authorization": f"Bearer {user_api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        "temperature": temperature,
        "max_tokens": max_tokens
    }

    print("--- DEBUG BYOK PROXY ---")
    print(f"Provider: {provider}")
    print(f"Model: {model}")
    print(f"API Key Length: {len(user_api_key)}")
    print(f"API Key Prefix: {user_api_key[:10]}...")
    print(f"System Prompt Length: {len(system_prompt)}")
    print(f"User Message Length: {len(user_message)}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    print("------------------------")

    try:
        if provider == 'groq':
            url = "https://api.groq.com/openai/v1/chat/completions"
        elif provider in ['nvidia', 'invidia']:
            url = "https://integrate.api.nvidia.com/v1/chat/completions"
            payload["chat_template_kwargs"] = {"enable_thinking": False}
        else:
            url = "https://api.sarvam.ai/v1/chat/completions"

        req_timeout = 180 if provider in ["nvidia", "invidia"] else 45
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=req_timeout
        )
        response.raise_for_status()
        result = response.json()
        content = result['choices'][0]['message']['content'].strip()
        return jsonify({"content": content})
    except Exception as e:
        print(f"BYOK proxy error for {provider}: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
