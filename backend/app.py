import os
import requests
import json
import re
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import fitz  # PyMuPDF

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


@app.route('/api/suggest', methods=['POST'])
def suggest_diagram():
    data = request.json
    user_prompt = data.get('prompt', '')
    
    if not user_prompt:
        return jsonify({"error": "No prompt provided"}), 400

    headers = {
        "Authorization": f"Bearer {SARVAM_API_KEY}",
        "Content-Type": "application/json"
    }
    
    system_prompt = (
        "You are an expert architect. Given a user prompt describing a system or process, "
        "classify it into exactly one of these categories: 'flowchart', 'architecture', 'xy', 'pie', 'sequence', 'erDiagram', or 'gantt'. "
        "Use 'sequence' for interaction flows between systems/actors/APIs showing step-by-step message exchanges. "
        "Use 'erDiagram' for database schemas, data models, entity relationships, or table structures. "
        "Use 'gantt' for project timelines, schedules, sprint plans, roadmaps, or task scheduling. "
        "Respond with ONLY the category name (case-sensitive). No explanation, no punctuation."
    )
    
    payload = {
        "model": "sarvam-30b",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.1
    }
    
    try:
        # 1. First, check explicitly if the user mentioned a diagram type in the prompt!
        user_lower = user_prompt.lower()
        explicit_category = None
        
        # Check explicit keywords
        if 'sequence diagram' in user_lower or 'sequence format' in user_lower:
            explicit_category = 'sequence'
        elif 'er diagram' in user_lower or 'entity relationship' in user_lower or 'database schema' in user_lower:
            explicit_category = 'erDiagram'
        elif 'gantt' in user_lower or 'timeline' in user_lower or 'roadmap' in user_lower:
            explicit_category = 'gantt'
        elif 'pie chart' in user_lower or 'distribution' in user_lower:
            explicit_category = 'pie'
        elif 'xy chart' in user_lower or 'bar chart' in user_lower or 'line chart' in user_lower:
            explicit_category = 'xy'
        elif 'architecture' in user_lower or 'system design' in user_lower or 'infrastructure' in user_lower:
            explicit_category = 'architecture'
        elif 'flowchart' in user_lower or 'flow chart' in user_lower:
            explicit_category = 'flowchart'
            
        if explicit_category:
            return jsonify({"category": explicit_category})

        response = requests.post(
            "https://api.sarvam.ai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=10
        )
        response.raise_for_status()
        result = response.json()
        content_lower = result['choices'][0]['message']['content'].strip().lower()
        
        category_map = {
            'flowchart': 'flowchart',
            'architecture': 'architecture',
            'xy': 'xy',
            'pie': 'pie',
            'sequence': 'sequence',
            'erdiagram': 'erDiagram',
            'er_diagram': 'erDiagram',
            'er ': 'erDiagram',
            'gantt': 'gantt'
        }
        
        category = 'architecture'
        for key, val in category_map.items():
            if key in content_lower:
                category = val
                if key != 'er ': break  # break early unless it was a weak match
            
        return jsonify({"category": category})
        
    except Exception as e:
        print(f"Error calling Sarvam: {e}")
        lower = user_prompt.lower()
        if any(word in lower for word in ['flow', 'step', 'process']):
            return jsonify({"category": "flowchart"})
        if any(word in lower for word in ['sequence', 'interaction', 'message', 'api call', 'handshake']):
            return jsonify({"category": "sequence"})
        if any(word in lower for word in ['entity', 'relationship', 'database schema', 'data model', 'table', 'er ']):
            return jsonify({"category": "erDiagram"})
        if any(word in lower for word in ['timeline', 'schedule', 'gantt', 'roadmap', 'sprint', 'project plan']):
            return jsonify({"category": "gantt"})
        return jsonify({"category": "architecture"})


@app.route('/api/vision', methods=['POST'])
def vision_engine():
    data = request.json
    user_prompt = data.get('prompt', '')
    diagram_type = data.get('diagramType', 'flowchart')
    
    if not user_prompt:
        return jsonify({"error": "No prompt provided"}), 400

    headers = {
        "Authorization": f"Bearer {SARVAM_API_KEY}",
        "Content-Type": "application/json"
    }
    
    system_prompt = (
        "You are the Arka Vision Engine, powered by Sarvam 30B. Your job is to take a user's rough diagram prompt and transform it into a "
        "highly detailed, polished, and structured architectural requirement document. "
        "You MUST follow these exactly five steps in your response:\n\n"
        "1. Ingestion & Classification: Parse the raw prompt, identify the diagram type, clean up the text, and generate a technical summary.\n"
        "2. Node Extraction: Identify every standalone component (the 'Things' to be drawn).\n"
        "3. Grouping Definition: Identify boundaries (the 'Containers' like Subnets, Clusters, or Swimlanes) and assign the extracted nodes into them.\n"
        "4. Edge Mapping: Define every connection. You must explicitly state Source, Destination, the Label on the arrow, and the Type of connection (e.g., dotted, solid, async).\n"
        "5. Final Generation: Compile all of the above into the final data structure (a unified technical specification).\n\n"
        "RULES:\n"
        "1. Start the response with exactly these two lines:\n"
        "   Name: [A concise, descriptive name for the diagram]\n"
        "   Diagram Type: [The type of diagram]\n\n"
        "2. Rewrite for maximum clarity and technical precision.\n"
        "3. Use professional technical language.\n"
        "4. Do NOT include any meta-talk like 'Here is your polished prompt'.\n"
        "5. Ensure every step is explicitly labeled and detailed."
    )
    
    payload = {
        "model": "sarvam-30b",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"User Prompt: {user_prompt}\nDiagram Type Suggestion: {diagram_type}"}
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
        polished_prompt = result['choices'][0]['message']['content'].strip()
        
        return jsonify({"polished_prompt": polished_prompt})
    except Exception as e:
        print(f"Vision Engine Error: {e}")
        # Fallback: just return the original prompt with a header
        fallback = f"Name: Custom Diagram\nDiagram Type: {diagram_type}\n\n{user_prompt}"
        return jsonify({"polished_prompt": fallback})


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
            "- Use ->>+ and -->>- for activation/deactivation to show processing lifelines.\n"
            "- Keep to 3-6 participants maximum.\n"
            "- Message text after the colon MUST NOT contain colons, semicolons, or angle brackets.\n"
            "- Keep message text under 40 characters.\n"
            "- Use alt/else/end for conditional branching sparingly (max 1-2 blocks).\n"
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
        "model": "sarvam-105b",
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


@app.route('/api/refine', methods=['POST'])
def refine_diagram():
    """Refine an existing diagram based on user instructions."""
    data = request.json
    user_prompt = data.get('prompt', '')
    current_code = data.get('mermaid_code', '')
    diagram_type = data.get('diagramType', 'flowchart')

    if not user_prompt or not current_code:
        return jsonify({"error": "Missing prompt or mermaid_code"}), 400

    # Load knowledge bank rules for this diagram type
    knowledge_rules = load_knowledge(diagram_type)

    headers = {
        "Authorization": f"Bearer {SARVAM_API_KEY}",
        "Content-Type": "application/json"
    }

    system_prompt = (
        f"You are an expert diagram editor. You will be given existing Mermaid JS code for a {diagram_type} diagram "
        "and a user's refinement instruction. Your job is to modify the EXISTING code based on the instruction.\n\n"
        "KNOWLEDGE BANK RULES (you MUST follow these):\n"
        f"{knowledge_rules}\n\n"
        "CRITICAL INSTRUCTIONS:\n"
        "- Output ONLY the complete, updated Mermaid JS code.\n"
        "- NEVER output partial code. You MUST return the ENTIRE diagram code from start to finish.\n"
        "- Do NOT wrap in markdown code blocks (no ```mermaid).\n"
        "- Do NOT include any explanation or text before/after the code.\n"
        "- PRESERVE the existing diagram structure. DO NOT REMOVE any existing nodes, links, or styles unless explicitly asked to do so.\n"
        "- When applying styles or colors, use standard Mermaid styling (e.g. `style nodeID fill:#colorName`).\n"
        "- Keep the same diagram type header.\n"
        "- ALWAYS wrap node text in double quotes to prevent parser errors.\n"
    )

    payload = {
        "model": "sarvam-105b",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"CURRENT MERMAID CODE:\n{current_code}\n\nREFINEMENT INSTRUCTION: {user_prompt}\n\nOutput ONLY the updated Mermaid JS code:"}
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

        # Clean up markdown code blocks
        content = re.sub(r'^```(?:mermaid)?\s*\n?', '', content)
        content = re.sub(r'\n?```\s*$', '', content)
        content = content.replace("```mermaid", "").replace("```", "")
        content = content.strip()

        # Strip internal LLM tags
        content = re.sub(r'<[^>]+>', '', content)

        # Remove duplicate diagram headers
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

        # Type-specific syntax fixes
        if diagram_type in ['flowchart', 'architecture']:
            content = re.sub(r'(^|\n)end(\s*[-=]>|[\(\[\{])', r'\1finish\2', content)
            content = re.sub(r'([\(\[\{])end([\)\]\}])', r'\1finish\2', content)
            content = re.sub(r'([-=]>(?:\s*\|[^|]*\|)?\s*)end(\s|[\(\[\{\n]|$)', r'\1finish\2', content)
            # Fix illegal nested shapes like node(([ "text" ])) -> node([ "text" ])
            content = re.sub(r'(\w+)\s*\(\(\s*([\[\{\(])', r'\1\2', content)
            content = re.sub(r'([\]\}\)])\s*\)\)', r'\1', content)

        if diagram_type == 'sequence':
            lines = content.split('\n')
            if lines and lines[0].strip() != 'sequenceDiagram':
                lines = ['sequenceDiagram'] + [l for l in lines if l.strip() != 'sequenceDiagram']
            # Strip colons/semicolons from message text and angle brackets
            fixed_lines = []
            for line in lines:
                arrow_match = re.match(r'(\s*\S+\s*-[->>x)]+[+-]?\s*\S+\s*:\s*)(.*)', line)
                if arrow_match:
                    prefix = arrow_match.group(1)
                    msg = arrow_match.group(2)
                    msg = msg.replace(':', ' -').replace(';', ',')
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

        if diagram_type == 'erDiagram':
            lines = content.split('\n')
            if lines and lines[0].strip() != 'erDiagram':
                lines = ['erDiagram'] + [l for l in lines if l.strip() != 'erDiagram']
            # Fix relationship labels missing quotes
            fixed_lines = []
            for line in lines:
                rel_match = re.match(r'(\s*\w+\s+[|o}{]+--[|o}{]+\s+\w+\s*:\s*)([^"].*[^"]\s*)$', line)
                if rel_match:
                    prefix = rel_match.group(1)
                    label = rel_match.group(2).strip()
                    fixed_lines.append(f'{prefix}"{label}"')
                else:
                    fixed_lines.append(line)
            content = '\n'.join(fixed_lines)

        if diagram_type == 'gantt':
            lines = content.split('\n')
            if lines and lines[0].strip() != 'gantt':
                lines = ['gantt'] + [l for l in lines if l.strip() != 'gantt']
            has_date_format = any('dateFormat' in l for l in lines)
            if not has_date_format:
                insert_idx = 1
                for i, l in enumerate(lines):
                    if l.strip().startswith('title'):
                        insert_idx = i + 1
                        break
                lines.insert(insert_idx, '    dateFormat YYYY-MM-DD')
            content = '\n'.join(lines)

        return jsonify({"mermaid_code": content, "diagram_type": diagram_type})

    except Exception as e:
        print(f"Error calling Sarvam refine: {e}")
        return jsonify({"error": f"Refine failed: {str(e)}"}), 500


@app.route('/api/upload-doc', methods=['POST'])
def upload_document():
    """Extract text from uploaded document (PDF, DOCX, TXT) and return it for diagram generation."""
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    filename = file.filename.lower()
    
    try:
        if filename.endswith('.pdf'):
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


@app.route('/api/suggest_improvements', methods=['POST'])
def suggest_improvements():
    """Generate 3-5 concise, context-aware suggestions for improving the current diagram."""
    data = request.json
    user_prompt = data.get('prompt', '')
    mermaid_code = data.get('mermaid_code', '')
    diagram_type = data.get('diagramType', 'flowchart')
    vision_prompt = data.get('vision_prompt', '') # New: Vision engine context

    if not mermaid_code:
        return jsonify({"error": "Missing mermaid_code"}), 400

    knowledge_rules = load_knowledge(diagram_type) # New: Syntax awareness

    headers = {
        "Authorization": f"Bearer {SARVAM_API_KEY}",
        "Content-Type": "application/json"
    }

    system_prompt = (
        "You are an expert design assistant for Mermaid JS diagrams. "
        "Your goal is to suggest 3-5 CONCISE improvements for the user's diagram. "
        "Each suggestion MUST be a single, actionable sentence (max 12 words). "
        "Use both visual context (from Vision Engine) and structural rules (from Knowledge Bank).\n\n"
        "KNOWLEDGE BANK RULES (Respect these syntax limits):\n"
        f"{knowledge_rules[:1000]}\n\n" # Truncated for token limit
        "Provide a mix of:\n"
        "1. Visual suggestions (e.g., 'Use a dark color palette for better contrast', 'Add icons to nodes').\n"
        "2. Structural/Logic suggestions (e.g., 'Simplify the connection between A and B', 'Break subgraph X into smaller pieces').\n"
        "3. Diagram-specific improvements based on the diagram type and user's intent.\n\n"
        "Format your response as a JSON list of strings. Close the JSON properly. "
        "Do NOT include any other text or explanation."
    )

    user_input = (
        f"DIAGRAM TYPE: {diagram_type}\n"
        f"USER'S INITIAL PROMPT: {user_prompt}\n"
        f"VISION ENGINE CONTEXT: {vision_prompt}\n" # New: More context
        f"CURRENT CODE:\n{mermaid_code}\n\n"
        "Provide 3-5 suggestions as a JSON list of strings:"
    )

    payload = {
        "model": "sarvam-30b",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_input}
        ],
        "temperature": 0.5
    }

    try:
        response = requests.post(
            "https://api.sarvam.ai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=15
        )
        response.raise_for_status()
        result = response.json()
        content = result['choices'][0]['message']['content'].strip()
        
        match = re.search(r'\[.*\]', content, re.DOTALL)
        if match:
            suggestions = json.loads(match.group(0))
        else:
            suggestions = [
                "Apply a modern color palette for better visibility.",
                "Organize related components into clear subgraphs.",
                "Ensure all arrows flow in a consistent direction.",
                "Add descriptive labels to connecting lines."
            ]
            
        return jsonify({"suggestions": suggestions})
        
    except Exception as e:
        print(f"Error calling Sarvam suggestions: {e}")
        return jsonify({
            "suggestions": [
                "Enhance clarity with consistent node shapes.",
                "Use distinct colors for different system layers.",
                "Simplify complex paths to avoid 'spaghetti' arrows.",
                "Review labels for maximum readability."
            ]
        })


@app.route('/api/interpret_refine', methods=['POST'])
def interpret_refine():
    """Interprets a user's refinement prompt before execution, providing a confirmation message and technical instructions."""
    data = request.json
    user_prompt = data.get('prompt', '')
    mermaid_code = data.get('mermaid_code', '')
    diagram_type = data.get('diagramType', 'flowchart')
    vision_prompt = data.get('vision_prompt', '')

    if not user_prompt or not mermaid_code:
        return jsonify({"error": "Missing prompt or mermaid_code"}), 400

    knowledge_rules = load_knowledge(diagram_type)

    headers = {
        "Authorization": f"Bearer {SARVAM_API_KEY}",
        "Content-Type": "application/json"
    }

    system_prompt = (
        "You are the Arka Interpreter. Your job is to take a user's quick refinement instruction (e.g. 'Add a button') "
        "and explain exactly what you understood in a friendly way, while also generating internal technical instructions "
        "for the refining engine. You must use the Vision Engine's context and the Diagram Syntax to be precise.\n\n"
        "KNOWLEDGE BANK RULES:\n"
        f"{knowledge_rules[:1500]}\n\n"
        "VISION ENGINE CONTEXT:\n"
        f"{vision_prompt}\n\n"
        "RULES:\n"
        "1. Output a JSON object with two fields: 'confirmation' and 'technical_instructions'.\n"
        "2. 'confirmation' should be a concise, friendly summary of what's about to change (e.g. 'I'll add a Power Source to the Arduino in the Logic Layer as you requested.').\n"
        "3. 'technical_instructions' should be a detailed, technical prompt for a refining engine (e.g. 'Add a node named Power Source with stadium shape, connect it to the Arduino node with a solid arrow labeled \"5V Power\"').\n"
        "4. DO NOT make syntax errors. Use valid Mermaid terminology for the given diagram type.\n"
        "5. Respond with ONLY the JSON object."
    )

    payload = {
        "model": "sarvam-30b",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"USER PROMPT: {user_prompt}\nCURRENT PROJECT CODE:\n{mermaid_code}\n\nInterpret this and provide the JSON:"}
        ],
        "temperature": 0.2
    }

    try:
        response = requests.post(
            "https://api.sarvam.ai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=15
        )
        response.raise_for_status()
        result = response.json()
        content = result['choices'][0]['message']['content'].strip()
        
        match = re.search(r'\{.*\}', content, re.DOTALL)
        if match:
            return jsonify(json.loads(match.group(0)))
        else:
            return jsonify({
                "confirmation": "I'll update the diagram according to your request.",
                "technical_instructions": user_prompt
            })
    except Exception as e:
        print(f"Error in interpret_refine: {e}")
        return jsonify({
            "confirmation": f"I'll try to apply: {user_prompt}",
            "technical_instructions": user_prompt
        })


@app.route('/api/generate-byok', methods=['POST'])
def generate_byok():
    """Proxy endpoint for BYOK Sarvam API calls. The user's API key is passed in the
    request body and forwarded to Sarvam — never stored on the server."""
    data = request.json
    user_api_key = data.get('apiKey', '')
    model = data.get('model', 'sarvam-105b')
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
        return jsonify({"content": content})
    except Exception as e:
        print(f"BYOK proxy error: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
