import json
import os
import re
from functools import lru_cache

import requests

from mermaid_validator import clean_mermaid_code, format_issues_for_prompt, validate_mermaid_code


SUPPORTED_TYPES = ["flowchart", "architecture", "sequence", "erDiagram", "gantt", "xy", "pie"]

KNOWLEDGE_FILES = {
    "flowchart": "flowchart.md",
    "architecture": "architecture.md",
    "xy": "xy_chart.md",
    "pie": "pie_chart.md",
    "sequence": "sequence.md",
    "erDiagram": "er_diagram.md",
    "gantt": "gantt.md",
}

MERMAID_DOC_URLS = {
    "flowchart": "https://mermaid.js.org/syntax/flowchart.html",
    "architecture": "https://mermaid.js.org/syntax/flowchart.html",
    "sequence": "https://mermaid.js.org/syntax/sequenceDiagram.html",
    "erDiagram": "https://mermaid.js.org/syntax/entityRelationshipDiagram.html",
    "gantt": "https://mermaid.js.org/syntax/gantt.html",
    "pie": "https://mermaid.js.org/syntax/pie.html",
    "xy": "https://mermaid.js.org/syntax/xyChart.html",
}

FALLBACKS = {
    "flowchart": (
        'flowchart TD\n'
        '    startNode(["Start"])\n'
        '    collectInput["Collect Input"]\n'
        '    validateInput{"Is Input Valid?"}\n'
        '    processRequest["Process Request"]\n'
        '    showError["Show Error"]\n'
        '    finishNode(["End"])\n'
        '    startNode --> collectInput --> validateInput\n'
        '    validateInput -->|Yes| processRequest --> finishNode\n'
        '    validateInput -->|No| showError --> collectInput'
    ),
    "architecture": (
        'flowchart LR\n'
        '    user(("User"))\n'
        '    gateway(["API Gateway"])\n'
        '    app["Application Service"]\n'
        '    cache{{"Cache"}}\n'
        '    db[("Database")]\n'
        '    user -->|HTTPS| gateway -->|REST| app\n'
        '    app -->|Read cache| cache\n'
        '    app -->|SQL| db'
    ),
    "sequence": (
        'sequenceDiagram\n'
        '    actor User\n'
        '    participant App as Client App\n'
        '    participant API as API Server\n'
        '    participant DB as Database\n'
        '    User->>+App: Submit request\n'
        '    App->>+API: Send request\n'
        '    API->>+DB: Query data\n'
        '    DB-->>-API: Return data\n'
        '    API-->>-App: Return response\n'
        '    App-->>-User: Show result'
    ),
    "erDiagram": (
        'erDiagram\n'
        '    User {\n'
        '        int id PK\n'
        '        string name\n'
        '        string email UK\n'
        '    }\n'
        '    Order {\n'
        '        int id PK\n'
        '        int userId FK\n'
        '        date createdAt\n'
        '    }\n'
        '    User ||--o{ Order : "places"'
    ),
    "gantt": (
        'gantt\n'
        '    title Project Timeline\n'
        '    dateFormat YYYY-MM-DD\n'
        '    section Planning\n'
        '    Requirements : done, req1, 2026-06-10, 2026-06-14\n'
        '    Design : active, des1, after req1, 5d\n'
        '    section Build\n'
        '    Implementation : dev1, after des1, 10d\n'
        '    Testing : test1, after dev1, 5d'
    ),
    "pie": (
        'pie showData\n'
        '    title Distribution\n'
        '    "Core" : 45\n'
        '    "Support" : 25\n'
        '    "Growth" : 20\n'
        '    "Other" : 10'
    ),
    "xy": (
        'xychart-beta\n'
        '    title "Trend Overview"\n'
        '    x-axis ["Q1", "Q2", "Q3", "Q4"]\n'
        '    y-axis "Value" 0 --> 100\n'
        '    bar [35, 52, 68, 84]'
    ),
}


class DiagramAgent:
    def __init__(self, api_key=None, provider=None, model=None, knowledge_dir=None):
        if not provider:
            raise ValueError("No AI provider selected.")
        if not model:
            raise ValueError("No AI model selected.")
        self.api_key = api_key or ""
        self.provider = provider
        self.model = model
        self.knowledge_dir = knowledge_dir or os.path.join(os.path.dirname(__file__), "knowledge")

    def suggest_type(self, prompt):
        system_prompt = (
            "You are Arka's diagram selection agent. Analyze the user's intent semantically. "
            "Allowed types: flowchart, architecture, sequence, erDiagram, gantt, xy, pie, cynefin, ishikawa, treemap, eventModeling, radar, kanban, packet. "
            "Return one or more genuinely suitable diagram types, ranked best first. "
            "Do not use keyword matching. Consider what information the user wants to communicate. "
            "Return ONLY JSON with a suggestions array. Every item must contain type, confidence, and reason. "
            "Confidence must be between 0 and 1. Do not include weak or irrelevant options."
        )
        user_prompt = f"Prompt:\n{prompt}"
        content = self.call_model(system_prompt, user_prompt, temperature=0.1, max_tokens=2500)
        data = parse_json_object(content)
        raw_suggestions = data.get("suggestions")
        if not isinstance(raw_suggestions, list):
            raise ValueError("AI did not return a suggestions array.")

        suggestions = []
        seen = set()
        for item in raw_suggestions:
            if not isinstance(item, dict):
                continue
            diagram_type = normalize_type(item.get("type"))
            if not diagram_type or diagram_type in seen:
                continue
            try:
                confidence = max(0.0, min(float(item.get("confidence")), 1.0))
            except (TypeError, ValueError):
                continue
            reason = str(item.get("reason") or "").strip()
            if not reason:
                continue
            suggestions.append({"type": diagram_type, "confidence": confidence, "reason": reason[:500]})
            seen.add(diagram_type)

        suggestions.sort(key=lambda item: item["confidence"], reverse=True)
        if not suggestions:
            raise ValueError("AI returned no valid diagram suggestions.")

        primary = suggestions[0]

        return {
            "suggestions": suggestions,
            "suggested_type": primary["type"],
            "category": primary["type"],
            "confidence": primary["confidence"],
            "reason": primary["reason"],
            "agent_steps": [
                "Analyzed the user's communication goal with the selected AI model.",
                "Ranked every suitable diagram format returned by the model.",
                "Waiting for the user to confirm or choose another type.",
            ],
        }

    def generate(self, prompt, diagram_type, max_attempts=3, on_progress=None):
        diagram_type = normalize_type(diagram_type) or "flowchart"
        knowledge = self.load_knowledge(diagram_type)
        docs = ""
        progress = [
            "Understanding prompt and chosen diagram type.",
            f"Loaded {readable_type(diagram_type)} knowledge-bank rules.",
            "Drafting Mermaid code.",
        ]
        if on_progress:
            on_progress("Understanding prompt and chosen diagram type.")
            on_progress(f"Loaded {readable_type(diagram_type)} knowledge-bank rules.")
            on_progress("Drafting Mermaid code.")
        repair_log = []
        code = ""

        for attempt in range(1, max_attempts + 1):
            if attempt == 1:
                system_prompt = build_generation_prompt(diagram_type, knowledge)
                user_prompt = f"USER PROMPT:\n{prompt}\n\nCreate the Mermaid diagram now."
            else:
                if not docs:
                    docs = fetch_mermaid_reference(diagram_type)
                    if docs:
                        msg = "Checked Mermaid syntax reference for repair guidance."
                        progress.append(msg)
                        if on_progress:
                            on_progress(msg)
                system_prompt = build_repair_prompt(diagram_type, knowledge, docs)
                user_prompt = (
                    f"ORIGINAL USER PROMPT:\n{prompt}\n\n"
                    f"CURRENT MERMAID CODE:\n{code}\n\n"
                    f"VALIDATION ISSUES:\n{format_issues_for_prompt(repair_log[-1]['issues'])}\n\n"
                    "Return the full corrected Mermaid code."
                )
                msg = f"Repair attempt {attempt - 1}: using line-level validation feedback."
                progress.append(msg)
                if on_progress:
                    on_progress(msg)

            try:
                raw = self.call_model(system_prompt, user_prompt, temperature=0.15, max_tokens=3600)
                code = clean_mermaid_code(raw, diagram_type)
            except Exception as exc:
                repair_log.append({
                    "attempt": attempt,
                    "status": "model_error",
                    "issues": [{"line": 1, "severity": "error", "message": str(exc)}],
                })
                break

            validation = validate_mermaid_code(code, diagram_type)
            repair_log.append({
                "attempt": attempt,
                "status": "valid" if validation["valid"] else "needs_repair",
                "issues": validation["issues"],
            })

            if validation["valid"]:
                msg = "Validated Mermaid syntax with static checks."
                progress.append(msg)
                if on_progress:
                    on_progress(msg)
                break

        if not code:
            raise RuntimeError(format_issues_for_prompt(repair_log[-1]["issues"]) if repair_log else "Agent did not produce diagram code.")

        final_validation = validate_mermaid_code(code, diagram_type)
        if not final_validation["valid"]:
            raise RuntimeError("Agent could not repair Mermaid code:\n" + format_issues_for_prompt(final_validation["issues"]))

        try:
            suggestions = self.suggest_improvements(prompt, code, diagram_type)
            msg = "Prepared structural and visual refinement suggestions."
            progress.append(msg)
            if on_progress:
                on_progress(msg)
        except Exception:
            suggestions = []
            msg = "Generated the diagram; suggestions were not available from the model."
            progress.append(msg)
            if on_progress:
                on_progress(msg)
        return {
            "mermaid_code": code,
            "diagram_type": diagram_type,
            "validation": final_validation,
            "repair_log": repair_log,
            "suggestions": suggestions,
            "agent_steps": progress,
        }

    def refine(self, prompt, mermaid_code, diagram_type, selected_context=None, max_attempts=3, on_progress=None):
        diagram_type = normalize_type(diagram_type) or "flowchart"
        knowledge = self.load_knowledge(diagram_type)
        docs = ""
        progress = []

        def report(phase, status, title, detail=""):
            event = {"phase": phase, "status": status, "title": title, "detail": detail}
            progress.append(title if not detail else f"{title}: {detail}")
            if on_progress:
                on_progress(event)

        diagram_summary = summarize_mermaid(mermaid_code, diagram_type)
        report("inspect", "done", "Read current diagram", diagram_summary)
        report("task", "done", "Captured requested change", compact_instruction(prompt))
        report("plan", "done", "Prepared implementation plan", "Preserve the diagram structure and apply only the approved change.")
        report("rewrite", "active", "Rewriting Mermaid code", "Creating the first candidate.")
        repair_log = []
        code = mermaid_code
        produced_candidate = False
        verification = {"implemented": False, "summary": "Verification has not run yet.", "issues": []}

        for attempt in range(1, max_attempts + 1):
            if attempt == 1:
                system_prompt = build_refine_prompt(diagram_type, knowledge)
                user_prompt = (
                    f"CURRENT MERMAID CODE:\n{mermaid_code}\n\n"
                    f"SELECTED CONTEXT:\n{json.dumps(selected_context or [], ensure_ascii=False)}\n\n"
                    f"REFINEMENT INSTRUCTION:\n{prompt}\n\n"
                    "Return the complete updated Mermaid code."
                )
            else:
                if not docs:
                    docs = fetch_mermaid_reference(diagram_type)
                    if docs:
                        msg = "Checked Mermaid syntax reference for repair guidance."
                        progress.append(msg)
                        if on_progress:
                            on_progress(msg)
                system_prompt = build_repair_prompt(diagram_type, knowledge, docs)
                user_prompt = (
                    f"ORIGINAL MERMAID CODE:\n{mermaid_code}\n\n"
                    f"REFINEMENT INSTRUCTION:\n{prompt}\n\n"
                    f"CURRENT CANDIDATE CODE:\n{code}\n\n"
                    f"VALIDATION ISSUES:\n{format_issues_for_prompt(repair_log[-1]['issues'])}\n\n"
                    "Repair the candidate so it implements the instruction without duplicates or unrelated changes. "
                    "Return the complete corrected Mermaid code."
                )
                report(
                    "diagnose",
                    "active",
                    f"Investigating candidate {attempt - 1}",
                    format_issues_for_prompt(repair_log[-1]["issues"])[:500],
                )
                report("rewrite", "active", f"Rewriting candidate {attempt}", "Applying the verification findings.")

            try:
                raw = self.call_model(system_prompt, user_prompt, temperature=0.15, max_tokens=3600)
                code = clean_mermaid_code(raw, diagram_type)
                produced_candidate = True
            except Exception as exc:
                repair_log.append({
                    "attempt": attempt,
                    "status": "model_error",
                    "issues": [{"line": 1, "severity": "error", "message": str(exc)}],
                })
                break

            validation = validate_mermaid_code(code, diagram_type)
            quality_issues = refinement_quality_issues(mermaid_code, code, validation)
            combined_issues = [*validation["issues"], *quality_issues]

            if validation["valid"] and not quality_issues:
                report("verify", "active", "Checking the requested change", f"Reviewing candidate {attempt} against the approved task.")
                verification = self.verify_refinement(prompt, mermaid_code, code, diagram_type)
                if not verification["implemented"]:
                    combined_issues.extend({
                        "line": 1,
                        "severity": "error",
                        "message": issue,
                    } for issue in verification["issues"])

            candidate_valid = validation["valid"] and not quality_issues and verification["implemented"]
            repair_log.append({
                "attempt": attempt,
                "status": "valid" if candidate_valid else "needs_repair",
                "issues": combined_issues,
            })
            if candidate_valid:
                report("rewrite", "done", "Mermaid rewrite complete", f"Candidate {attempt} passed structural checks.")
                report("verify", "done", "Requested change verified", verification["summary"])
                break

        if not produced_candidate:
            raise RuntimeError(format_issues_for_prompt(repair_log[-1]["issues"]) if repair_log else "Agent did not produce refined diagram code.")

        validation = validate_mermaid_code(code, diagram_type)
        if not validation["valid"] or not verification["implemented"] or repair_log[-1]["status"] != "valid":
            raise RuntimeError("Agent could not verify the refined Mermaid code:\n" + format_issues_for_prompt(repair_log[-1]["issues"]))

        return {
            "mermaid_code": code,
            "diagram_type": diagram_type,
            "validation": validation,
            "repair_log": repair_log,
            "verification": verification,
            "suggestions": [],
            "agent_steps": progress,
        }

    def verify_refinement(self, instruction, original_code, candidate_code, diagram_type):
        if normalize_mermaid(original_code) == normalize_mermaid(candidate_code):
            return {
                "implemented": False,
                "summary": "The candidate is unchanged.",
                "issues": ["The Mermaid code is unchanged and does not implement the requested edit."],
            }

        system_prompt = (
            "You verify Mermaid diagram edits. Compare the original and candidate against the instruction. "
            "Do not rewrite code. Return ONLY JSON with: implemented (boolean), summary (one short sentence), "
            "issues (array of short actionable strings). Mark implemented false when the visible requested change is missing, "
            "when unrelated structure was added, or when repetitive/hallucinated statements appear."
        )
        user_prompt = (
            f"DIAGRAM TYPE: {diagram_type}\n\n"
            f"INSTRUCTION:\n{instruction}\n\n"
            f"ORIGINAL CODE:\n{original_code}\n\n"
            f"CANDIDATE CODE:\n{candidate_code}"
        )
        try:
            raw = self.call_model(system_prompt, user_prompt, temperature=0.0, max_tokens=600)
            data = parse_json_object(raw)
            implemented = data.get("implemented") is True
            summary = str(data.get("summary") or "Semantic verification completed.").strip()[:300]
            raw_issues = data.get("issues") if isinstance(data.get("issues"), list) else []
            issues = [str(issue).strip()[:300] for issue in raw_issues if str(issue).strip()][:6]
            if not implemented and not issues:
                issues = ["The candidate does not clearly implement the requested change."]
            return {"implemented": implemented, "summary": summary, "issues": issues}
        except Exception:
            # Deterministic checks still protect syntax, no-op edits, and runaway duplication.
            return {
                "implemented": True,
                "summary": "Structural verification passed; semantic verification was unavailable.",
                "issues": [],
            }


    def load_knowledge(self, diagram_type):
        filename = KNOWLEDGE_FILES.get(diagram_type)
        if not filename:
            return ""
        path = os.path.join(self.knowledge_dir, filename)
        try:
            with open(path, "r", encoding="utf-8") as handle:
                return handle.read()
        except OSError:
            return ""

    def call_model(self, system_prompt, user_prompt, temperature=0.2, max_tokens=2500):
        if not self.api_key:
            raise RuntimeError("Missing API key for agent model call.")

        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        if self.provider == "groq":
            url = "https://api.groq.com/openai/v1/chat/completions"
        elif self.provider in ["nvidia", "invidia"]:
            url = "https://integrate.api.nvidia.com/v1/chat/completions"
            payload["chat_template_kwargs"] = {"enable_thinking": False}
        else:
            url = "https://api.sarvam.ai/v1/chat/completions"

        req_timeout = 180 if self.provider in ["nvidia", "invidia"] else 45
        response = requests.post(url, headers=headers, json=payload, timeout=req_timeout)
        response.raise_for_status()
        data = response.json()
        message = data["choices"][0]["message"]
        content = message.get("content") or message.get("reasoning_content")
        if not content:
            raise RuntimeError("Model returned an empty message.")
        return content.strip()


def build_generation_prompt(diagram_type, knowledge):
    base = (
        "You are Arka's autonomous diagram generation agent. Generate Mermaid JS only. "
        "No markdown fences. No explanations. The code must render in Mermaid. "
        "Use simple alphanumeric node ids. Keep labels concise and quoted when the syntax supports labels.\n\n"
        f"KNOWLEDGE BANK RULES:\n{knowledge}\n\n"
    )
    rules = {
        "flowchart": (
            "Start with flowchart TD. Include Start and End. Keep primary happy path clear. "
            "Use at most 1 decision per 5 nodes. Node text must be quoted. "
            "IMPORTANT: You MUST apply semantic coloring to every node using the class definitions (greenNode, blueNode, yellowNode, redNode, goldNode) "
            "defined in the knowledge rules. Define the classDefs at the bottom of the diagram and apply them using the nodeId:::className syntax."
        ),
        "architecture": (
            "Start with flowchart LR or flowchart TD. Organize nodes into logical layers using subgraphs (e.g. clientLayer, backendLayer, aiLayer, dataLayer, monitorLayer, extLayer) "
            "matching the semantic groups and colors defined in the knowledge rules. "
            "IMPORTANT: Apply semantic coloring to subgraphs using `style subgraphId fill:#HEX,stroke:#HEX,stroke-width:2px,color:#HEX` statements, "
            "and to nodes using classDefs and the `nodeId:::className` syntax, strictly matching the colors and definitions in the knowledge rules."
        ),
        "sequence": (
            "Start with sequenceDiagram. Declare all actors/participants at the top. "
            "Use request-response pairs. Message text must not contain colons or angle brackets. "
            "Ensure activations (+/-) are balanced within blocks (alt, else, par, loop). "
            "Parallel block titles MUST use brackets, e.g. 'par [Title]'."
        ),
        "erDiagram": (
            "Start with erDiagram. Entity names must be PascalCase. Relationship labels must be quoted."
        ),
        "gantt": (
            "Start with gantt, include title and dateFormat YYYY-MM-DD. Use section groups and unique alphanumeric ids. "
            "CRITICAL RULES: "
            "(1) axisFormat must NOT have spaces between tokens — use %b-%d, NEVER %b %d. "
            "(2) When using 'after taskId', provide ONLY duration (e.g., 14d) — NEVER add explicit start/end dates alongside after. "
            "(3) Every 'after taskId' MUST reference an existing task id — verify spelling matches exactly. "
            "(4) Section names must NOT contain '&' — use 'and' instead. "
            "(5) NEVER create bare dependency-only lines like 'Task : after id1' without a duration or dates. "
            "(6) Keep tasks to 10-25 total and sections to 3-6 for readability. "
            "(7) Use milestones (0d duration) for key checkpoints."
        ),
        "pie": 'Start with pie showData. Include title. Slices use "Label" : value.',
        "xy": (
            "Start with xychart-beta. Include title, x-axis, y-axis, and at least one bar or line series. "
            "CRITICAL RULES: "
            "(1) NEVER put string labels after line or bar statements — e.g. use 'line [1, 2]', NEVER 'line [1, 2] \"Label\"'. "
            "(2) NEVER use 'legend', 'annotate', or 'grid' directives as they are completely unsupported by xychart-beta syntax. "
            "(3) Category labels in 'x-axis' must be enclosed in double quotes if they contain spaces. "
            "(4) Ensure the number of elements in your bar/line series matches the number of x-axis categories exactly."
        ),
        "cynefin": (
            "Start with flowchart LR or flowchart TB. Create a central node at the top representing the overall scenario. "
            "Create 4 flat subgraphs for domains: CLEAR, COMPLICATED, COMPLEX, CHAOTIC. "
            "CRITICAL RULES: "
            "(1) Every situation node inside a domain subgraph MUST have a multiline label inside double quotes detailing: Title with emoji, Domain name, bulleted 'Why' reasons, 'Decision Approach' (e.g. Sense -> Analyze -> Respond), and 'Leadership Action'. "
            "(2) Connect the central node to every situation node inside the subgraphs. "
            "(3) Define and assign the styling classes: clear (fill:#C8E6C9, stroke:#2E7D32), complicated (fill:#BBDEFB, stroke:#1565C0), complex (fill:#FFF9C4, stroke:#F9A825), chaotic (fill:#FFCDD2, stroke:#C62828), and center (fill:#ECEFF1, stroke:#455A64). "
            "(4) Add dotted links showing transitions between domains (e.g. Node1 -. Transition Name .-> Node2)."
        ),
        "ishikawa": "Start with flowchart RL. Define central Effect node on the far right, a main backbone, and 6 primary cause branches (People, Methods, Machines, Materials, Measurements, Environment) with sub-branch root causes pointing right/inward.",
        "treemap": "Start with flowchart TD. Model hierarchical categories using nested subgraphs and leaf nodes inside. Use classDefs and semantic coloring to show proportions.",
        "eventModeling": "Start with flowchart LR. Create 4 horizontal swimlane subgraphs from top to bottom (userSwimlane, commandSwimlane, eventSwimlane, viewSwimlane) and connect elements sequentially from left to right. Style events orange and views green.",
        "radar": "Start with xychart-beta. Categories on x-axis represent dimensions, score range (0-10 or 0-100) on y-axis, and profiles/series plotted as lines.",
        "kanban": "Start with flowchart LR. Create column subgraphs for columns (Backlog, Todo, In Progress, Review, Done). Tasks are card-like nodes inside columns. Use links only for task dependencies.",
        "packet": "Start with flowchart TD. Model rows as horizontal subgraphs representing 32-bit words, containing sequential fields inside linked left-to-right. Style widths proportionally.",
    }
    return base + "\n" + rules.get(diagram_type, rules["flowchart"])


def build_refine_prompt(diagram_type, knowledge):
    return (
        "You are Arka's diagram refinement agent. Modify the existing Mermaid code according to the instruction. "
        "Return ONLY the complete updated Mermaid code. Preserve existing nodes, links, styles, and diagram type "
        "unless the user explicitly asks to change them. Make the smallest correct edit. "
        "Do not include explanations, plans, markdown, comments about what changed, or any non-Mermaid text. "
        "If the instruction asks for a diagram change, the returned Mermaid code must implement a visible change. "
        "Do not refuse normal Mermaid edits. If a request is partly unsupported, make the closest supported code change. "
        "Do not add new cross-links, loops, duplicated edges, or unrelated nodes while improving style/readability. "
        "For colors in flowcharts, prefer applying semantic colors using classDef definitions (greenNode, blueNode, yellowNode, redNode, goldNode) "
        "and applying them as nodeId:::className. For architecture diagrams, group nodes into subgraphs representing layers and style the subgraphs using "
        "style statements and the nodes using the classDefs (clientNode, backendNode, aiNode, infraNode, dataNode, msgNode, monitorNode, extNode) "
        "as defined in the knowledge rules.\n\n"
        f"DIAGRAM TYPE: {diagram_type}\n"
        f"KNOWLEDGE BANK RULES:\n{knowledge}\n"
    )


def build_repair_prompt(diagram_type, knowledge, docs):
    return (
        "You are Arka's Mermaid repair agent. Fix the code using the line-level validation issues. "
        "Return ONLY the full corrected Mermaid code. Do not explain. Do not wrap in markdown fences.\n\n"
        f"DIAGRAM TYPE: {diagram_type}\n"
        f"KNOWLEDGE BANK RULES:\n{knowledge[:2500]}\n\n"
        f"MERMAID REFERENCE NOTES:\n{docs[:2500] if docs else 'No external reference was available.'}"
    )


def normalize_type(value):
    if not value:
        return None
    lower = str(value).strip().lower().replace("_", "").replace("-", "")
    mapping = {
        "flowchart": "flowchart",
        "flow": "flowchart",
        "architecture": "architecture",
        "systemarchitecture": "architecture",
        "xy": "xy",
        "xychart": "xy",
        "barchart": "xy",
        "linechart": "xy",
        "pie": "pie",
        "piechart": "pie",
        "sequence": "sequence",
        "sequencediagram": "sequence",
        "er": "erDiagram",
        "erdiagram": "erDiagram",
        "entityrelationship": "erDiagram",
        "gantt": "gantt",
        "ganttchart": "gantt",
        "cynefin": "cynefin",
        "ishikawa": "ishikawa",
        "treemap": "treemap",
        "eventmodeling": "eventModeling",
        "radar": "radar",
        "kanban": "kanban",
        "packet": "packet",
    }
    return mapping.get(lower)


def readable_type(diagram_type):
    return {
        "flowchart": "flowchart",
        "architecture": "architecture diagram",
        "sequence": "sequence diagram",
        "erDiagram": "ER diagram",
        "gantt": "Gantt chart",
        "xy": "XY chart",
        "pie": "pie chart",
        "cynefin": "Cynefin framework",
        "ishikawa": "Ishikawa diagram",
        "treemap": "Treemap diagram",
        "eventModeling": "Event modeling timeline",
        "radar": "Radar chart",
        "kanban": "Kanban board",
        "packet": "Packet diagram",
    }.get(diagram_type, diagram_type)


def normalize_mermaid(code):
    return "\n".join(
        line.strip()
        for line in str(code or "").replace("\r\n", "\n").splitlines()
        if line.strip()
    )


def compact_instruction(instruction):
    text = str(instruction or "")
    match = re.search(r"USER REQUEST:\s*(.*?)(?:\nAPPROVED PLAN:|$)", text, flags=re.DOTALL | re.IGNORECASE)
    if match:
        text = match.group(1)
    return re.sub(r"\s+", " ", text).strip()[:300]


def summarize_mermaid(code, diagram_type):
    lines = [line.strip() for line in str(code or "").splitlines() if line.strip()]
    edge_count = sum(
        1 for line in lines
        if not line.startswith("linkStyle ") and re.search(r"[-.=]+[ox>]|<[-.=]+|---", line)
    )
    node_ids = set(re.findall(r"(?:^|[\s>|])([A-Za-z][A-Za-z0-9_]*)\s*[\[({]", str(code or "")))
    return f"{readable_type(diagram_type).capitalize()} with {len(node_ids)} nodes, {edge_count} links, and {len(lines)} statements."


def refinement_quality_issues(original_code, candidate_code, validation):
    issues = []
    original = normalize_mermaid(original_code)
    candidate = normalize_mermaid(candidate_code)
    if candidate == original:
        issues.append({"line": 1, "severity": "error", "message": "Candidate code is unchanged."})

    original_lines = original.splitlines()
    candidate_lines = candidate.splitlines()
    if len(candidate_lines) > max(len(original_lines) * 3, len(original_lines) + 80):
        issues.append({
            "line": 1,
            "severity": "error",
            "message": "Candidate grew unexpectedly large and may contain hallucinated repetitive statements.",
        })

    seen = {}
    duplicate_lines = []
    for line_no, line in enumerate(candidate_lines, start=1):
        normalized = re.sub(r"\s+", " ", line).strip()
        if not normalized or normalized in {"end"} or normalized.startswith(("flowchart ", "graph ")):
            continue
        if normalized in seen:
            duplicate_lines.append((line_no, seen[normalized]))
        else:
            seen[normalized] = line_no
    for line_no, first_line in duplicate_lines[:4]:
        issues.append({
            "line": line_no,
            "severity": "error",
            "message": f"Repeated Mermaid statement duplicates line {first_line}.",
        })

    for issue in validation.get("issues", []):
        if "duplicate" in str(issue.get("message", "")).lower():
            issues.append({**issue, "severity": "error"})
    return issues


def parse_json_object(content):
    text = content or ""
    decoder = json.JSONDecoder()
    values = []
    for match in re.finditer(r"[\{\[]", text):
        try:
            value, _ = decoder.raw_decode(text[match.start():])
        except json.JSONDecodeError:
            continue
        if isinstance(value, (dict, list)):
            values.append(value)
    if not values:
        raise ValueError("Model did not return JSON.")
    for value in reversed(values):
        if isinstance(value, dict) and isinstance(value.get("suggestions"), list):
            return value
    for value in reversed(values):
        if isinstance(value, list) and value and all(isinstance(item, dict) for item in value):
            return {"suggestions": value}
    for value in reversed(values):
        if isinstance(value, dict):
            return value
    raise ValueError("Model JSON did not contain an object or suggestion list.")


def default_suggestions(diagram_type):
    defaults = {
        "flowchart": [
            "Add the main failure path for invalid decisions.",
            "Label decision branches with short Yes or No outcomes.",
            "Use one accent color for critical user actions.",
            "Remove secondary edge cases if readability drops.",
            "Group repeated checks into a single validation step.",
        ],
        "architecture": [
            "Add observability components for logs, metrics, and alerts.",
            "Show cache and queue boundaries if performance matters.",
            "Separate frontend, services, and data into subgraphs.",
            "Use muted colors for infrastructure and accents for critical paths.",
            "Label edges with protocols like REST, SQL, or events.",
        ],
        "sequence": [
            "Add an alternate block for failed requests.",
            "Keep message labels under forty characters.",
            "Show authentication before protected API calls.",
            "Use activation bars only for processing steps.",
            "Remove extra participants that do not exchange messages.",
        ],
        "erDiagram": [
            "Add junction tables for many-to-many relationships.",
            "Mark unique fields such as email with UK.",
            "Add createdAt fields to audit important entities.",
            "Keep each entity to three to six key attributes.",
            "Review cardinalities against real business rules.",
        ],
        "gantt": [
            "Add milestones for major delivery checkpoints.",
            "Mark the critical path with crit.",
            "Split long work into planning, build, and testing sections.",
            "Use realistic dates and durations for each phase.",
            "Add dependencies with after taskId where tasks sequence.",
        ],
        "pie": [
            "Keep slices to three to eight categories.",
            "Merge tiny slices into an Other category.",
            "Use contrasting colors for neighboring slices.",
            "Add realistic proportions that sum cleanly.",
            "Rename labels for quick executive readability.",
        ],
        "xy": [
            "Add a clear y-axis unit label.",
            "Use line charts for trends and bars for comparisons.",
            "Keep x-axis labels short to avoid overlap.",
            "Add a second series only if it clarifies comparison.",
            "Use a high-contrast palette for data series.",
        ],
    }
    return defaults.get(diagram_type, defaults["flowchart"])


@lru_cache(maxsize=8)
def fetch_mermaid_reference(diagram_type):
    url = MERMAID_DOC_URLS.get(diagram_type)
    if not url:
        return ""
    try:
        response = requests.get(url, timeout=6, headers={"User-Agent": "ArkaDiagramAgent/1.0"})
        response.raise_for_status()
        text = re.sub(r"<script.*?</script>", " ", response.text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r"<style.*?</style>", " ", text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text)
        return text[:5000]
    except Exception:
        return ""
