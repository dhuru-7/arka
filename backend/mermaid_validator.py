import re


HEADER_BY_TYPE = {
    "flowchart": ("flowchart ", "graph "),
    "architecture": ("flowchart ", "graph "),
    "sequence": ("sequenceDiagram",),
    "erDiagram": ("erDiagram",),
    "gantt": ("gantt",),
    "pie": ("pie",),
    "xy": ("xychart-beta",),
}


def clean_mermaid_code(content, diagram_type):
    """Normalize common LLM output mistakes without changing intent."""
    if not content:
        return ""

    content = content.strip()

    fenced_blocks = re.findall(r"```(?:mermaid)?\s*(.*?)```", content, flags=re.DOTALL | re.IGNORECASE)
    if fenced_blocks:
        content = fenced_blocks[-1].strip()
    else:
        header_pattern = r"(flowchart\s+(?:TD|LR|BT|RL)|graph\s+(?:TD|LR|BT|RL)|sequenceDiagram|erDiagram|gantt|pie(?:\s+showData)?|xychart-beta)"
        match = re.search(header_pattern, content)
        if match:
            content = content[match.start():].strip()

    content = re.sub(r"^```(?:mermaid)?\s*\n?", "", content.strip())
    content = re.sub(r"\n?```\s*$", "", content)
    content = content.replace("```mermaid", "").replace("```", "").strip()

    # Strip internal tags that sometimes leak from model outputs.
    content = re.sub(
        r"<(?:thought|tool_call|debug|internal)[^>]*>.*?</(?:thought|tool_call|debug|internal)>",
        "",
        content,
        flags=re.DOTALL,
    ).strip()

    header_keywords = ["flowchart ", "graph ", "sequenceDiagram", "erDiagram", "gantt", "pie", "xychart-beta"]
    header_count = 0
    cleaned_lines = []
    for line in content.splitlines():
        stripped = line.strip()
        is_header = any(stripped.startswith(keyword) for keyword in header_keywords)
        if is_header:
            header_count += 1
            if header_count > 1:
                continue
        cleaned_lines.append(line.rstrip())
    content = "\n".join(cleaned_lines).strip()

    if diagram_type in ("flowchart", "architecture"):
        content = re.sub(r"(^|\n)end(\s*[-=]>|[\(\[\{])", r"\1finish\2", content)
        content = re.sub(r"([\(\[\{])end([\)\]\}])", r"\1finish\2", content)
        content = re.sub(r"([-=]>(?:\s*\|[^|]*\|)?\s*)end(\s|[\(\[\{\n]|$)", r"\1finish\2", content)
        content = re.sub(r"(\w+)\s*\(\(\s*([\[\{\(])", r"\1\2", content)
        content = re.sub(r"([\]\}\)])\s*\)\)", r"\1", content)

    if diagram_type == "sequence":
        lines = content.splitlines()
        if lines and lines[0].strip() != "sequenceDiagram":
            lines = ["sequenceDiagram"] + [line for line in lines if line.strip() != "sequenceDiagram"]
        
        # Check if activations are unbalanced or go negative
        balance = {}
        has_activation_error = False
        for line in lines:
            stripped = line.strip()
            if stripped.startswith("activate "):
                parts = stripped.split()
                if len(parts) >= 2:
                    alias = parts[1].strip()
                    balance[alias] = balance.get(alias, 0) + 1
            elif stripped.startswith("deactivate "):
                parts = stripped.split()
                if len(parts) >= 2:
                    alias = parts[1].strip()
                    balance[alias] = balance.get(alias, 0) - 1
                    if balance.get(alias, 0) < 0:
                        has_activation_error = True
                        break
            elif ":" in stripped and re.search(r"->|-->", stripped):
                prefix = stripped.split(":", 1)[0]
                actors = re.split(r"-+>>?[+-]?", prefix)
                if len(actors) >= 2:
                    src = actors[0].strip()
                    dst = actors[-1].strip()
                    if "->>+" in prefix or "->+" in prefix:
                        balance[dst] = balance.get(dst, 0) + 1
                    if "-->>-" in prefix or "-->-" in prefix:
                        balance[src] = balance.get(src, 0) - 1
                        if balance.get(src, 0) < 0:
                            has_activation_error = True
                            break
        if not has_activation_error:
            for val in balance.values():
                if val != 0:
                    has_activation_error = True
                    break

        fixed = []
        for line in lines:
            # If there is an activation error, strip all + and - from arrows
            if has_activation_error:
                line = re.sub(r"(-+>>?)\+", r"\1", line)
                line = re.sub(r"(-+>>?)-", r"\1", line)
                if line.strip().startswith(("activate ", "deactivate ")):
                    continue

            match = re.match(r"(\s*\S+\s*-[->>x)]+[+-]?\s*\S+\s*:\s*)(.*)", line)
            if match:
                message = re.sub(r"<[^>]*>", "", match.group(2))
                message = message.replace(":", " -").replace(";", ",")
                fixed.append(match.group(1) + message[:90])
            else:
                fixed.append(line)
        content = "\n".join(fixed)

    if diagram_type == "erDiagram":
        lines = content.splitlines()
        if lines and lines[0].strip() != "erDiagram":
            lines = ["erDiagram"] + [line for line in lines if line.strip() != "erDiagram"]
        fixed = []
        for line in lines:
            match = re.match(r'(\s*\w+\s+[|o}{]+--[|o}{]+\s+\w+\s*:\s*)([^"].*[^"]\s*)$', line)
            fixed.append(f'{match.group(1)}"{match.group(2).strip()}"' if match else line)
        content = "\n".join(fixed)

    if diagram_type == "gantt":
        lines = content.splitlines()
        if lines and lines[0].strip() != "gantt":
            lines = ["gantt"] + [line for line in lines if line.strip() != "gantt"]
        if not any("dateFormat" in line for line in lines):
            insert_at = 1
            for idx, line in enumerate(lines):
                if line.strip().startswith("title"):
                    insert_at = idx + 1
                    break
            lines.insert(insert_at, "    dateFormat YYYY-MM-DD")
        content = "\n".join(lines)

    return content.strip()


def validate_mermaid_code(content, diagram_type):
    """Return static Mermaid validation issues with line numbers."""
    issues = []
    lines = content.splitlines() if content else []

    if not lines:
        return {
            "valid": False,
            "issues": [{"line": 1, "severity": "error", "message": "Diagram code is empty."}],
        }

    expected_headers = HEADER_BY_TYPE.get(diagram_type, HEADER_BY_TYPE["flowchart"])
    first = lines[0].strip()
    if not any(first.startswith(header) for header in expected_headers):
        issues.append({
            "line": 1,
            "severity": "error",
            "message": f"Expected the first line to start with one of: {', '.join(expected_headers)}.",
        })

    header_hits = []
    all_headers = ["flowchart ", "graph ", "sequenceDiagram", "erDiagram", "gantt", "pie", "xychart-beta"]
    for idx, line in enumerate(lines, start=1):
        if any(line.strip().startswith(header) for header in all_headers):
            header_hits.append(idx)
    if len(header_hits) > 1:
        for line_no in header_hits[1:]:
            issues.append({"line": line_no, "severity": "error", "message": "Duplicate diagram header."})

    if diagram_type in ("flowchart", "architecture"):
        _validate_flowchart(lines, issues)
    elif diagram_type == "sequence":
        _validate_sequence(lines, issues)
    elif diagram_type == "erDiagram":
        _validate_er(lines, issues)
    elif diagram_type == "gantt":
        _validate_gantt(lines, issues)
    elif diagram_type == "pie":
        _validate_pie(lines, issues)
    elif diagram_type == "xy":
        _validate_xy(lines, issues)

    return {"valid": not any(issue["severity"] == "error" for issue in issues), "issues": issues}


def format_issues_for_prompt(issues):
    if not issues:
        return "No static validation issues were found."
    return "\n".join(
        f"- line {issue['line']}: {issue['severity'].upper()} - {issue['message']}"
        for issue in issues
    )


def _validate_flowchart(lines, issues):
    node_def = re.compile(r"(^|[\s>|])([A-Za-z][A-Za-z0-9_]*)\s*[\[\(\{]")
    known_nodes = set()
    used_nodes = set()
    edge_lines = {}
    for idx, line in enumerate(lines, start=1):
        stripped = line.strip()
        if not stripped or stripped.startswith(("flowchart ", "graph ", "subgraph ", "end", "style ", "classDef ", "class ")):
            continue
        if re.search(r"(^|\s)end(\s*[-=]>|[\(\[\{])", stripped):
            issues.append({"line": idx, "severity": "error", "message": "Reserved keyword 'end' is used as a node id."})
        if re.search(r"\[[^\"\]]*[,;:][^\"\]]*\]", stripped):
            issues.append({"line": idx, "severity": "warning", "message": "Label with punctuation should usually be wrapped in double quotes."})
        if re.search(r"\b[A-Za-z][\w-]*\s+[\[\(\{]", stripped):
            issues.append({"line": idx, "severity": "error", "message": "Node id appears to contain a space."})
        for match in node_def.finditer(stripped):
            known_nodes.add(match.group(2))
        edge_source = re.sub(r":::[A-Za-z][A-Za-z0-9_]*", "", stripped)
        edge_match = re.search(r"([A-Za-z][A-Za-z0-9_]*)\s*[-.=]+[ox>]?", edge_source)
        if edge_match:
            used_nodes.add(edge_match.group(1))
        pair_match = re.search(r"([A-Za-z][A-Za-z0-9_]*)\s*[-.=]+[ox>]?(?:\|[^|]*\|)?\s*([A-Za-z][A-Za-z0-9_]*)", edge_source)
        if pair_match:
            pair = (pair_match.group(1), pair_match.group(2))
            if pair in edge_lines:
                issues.append({"line": idx, "severity": "warning", "message": f"Duplicate edge also appears on line {edge_lines[pair]}."})
            else:
                edge_lines[pair] = idx

    for node_id in sorted(used_nodes - known_nodes):
        if node_id not in {"style", "class"}:
            issues.append({"line": 1, "severity": "warning", "message": f"Node '{node_id}' is used before an explicit shape definition."})


def _validate_sequence(lines, issues):
    participants = set()
    balance = {}
    for idx, line in enumerate(lines, start=1):
        stripped = line.strip()
        match = re.match(r"(participant|actor)\s+([A-Za-z0-9_]+)", stripped)
        if match:
            participants.add(match.group(2))
        if stripped.startswith("activate "):
            parts = stripped.split()
            if len(parts) >= 2:
                alias = parts[1].strip()
                balance[alias] = balance.get(alias, 0) + 1
        elif stripped.startswith("deactivate "):
            parts = stripped.split()
            if len(parts) >= 2:
                alias = parts[1].strip()
                balance[alias] = balance.get(alias, 0) - 1
                if balance.get(alias, 0) < 0:
                    issues.append({"line": idx, "severity": "error", "message": f"Trying to deactivate inactive participant '{alias}'."})
        elif ":" in stripped and re.search(r"->|-->", stripped):
            prefix, message = stripped.split(":", 1)
            if ":" in message or "<" in message or ">" in message:
                issues.append({"line": idx, "severity": "error", "message": "Sequence message text contains a colon or angle bracket."})
            actors = re.split(r"-+>>?[+-]?", prefix)
            if len(actors) >= 2:
                src = actors[0].strip()
                dst = actors[-1].strip()
                for alias in (src, dst):
                    if alias and alias not in participants:
                        issues.append({"line": idx, "severity": "warning", "message": f"Participant '{alias}' was not declared at the top."})
                if "->>+" in prefix or "->+" in prefix:
                    balance[dst] = balance.get(dst, 0) + 1
                if "-->>-" in prefix or "-->-" in prefix:
                    balance[src] = balance.get(src, 0) - 1
                    if balance.get(src, 0) < 0:
                        issues.append({"line": idx, "severity": "error", "message": f"Trying to deactivate inactive participant '{src}'."})
    for alias, count in balance.items():
        if count != 0:
            issues.append({"line": 1, "severity": "error", "message": f"Activation markers for '{alias}' are unbalanced."})


def _validate_er(lines, issues):
    for idx, line in enumerate(lines, start=1):
        stripped = line.strip()
        if not stripped or stripped in ("erDiagram", "{", "}"):
            continue
        if re.match(r"[A-Za-z]\w*\s+[|o}{]+--[|o}{]+\s+[A-Za-z]\w+\s*:", stripped):
            if not re.search(r':\s*"[^"]+"$', stripped):
                issues.append({"line": idx, "severity": "error", "message": "ER relationship label must be quoted."})
        elif re.match(r"[A-Za-z]\w*\s*[{]", stripped):
            entity = stripped.split("{", 1)[0].strip()
            if not re.match(r"^[A-Z][A-Za-z0-9]*$", entity):
                issues.append({"line": idx, "severity": "error", "message": "ER entity names should be PascalCase without spaces."})


def _validate_gantt(lines, issues):
    if not any("dateFormat YYYY-MM-DD" in line for line in lines):
        issues.append({"line": 1, "severity": "error", "message": "Gantt chart must include dateFormat YYYY-MM-DD."})
    task_ids = set()
    for idx, line in enumerate(lines, start=1):
        stripped = line.strip()
        if not stripped or stripped.startswith(("gantt", "title", "dateFormat", "axisFormat", "section")):
            continue
        if ":" not in stripped:
            issues.append({"line": idx, "severity": "error", "message": "Gantt task line must contain a colon."})
            continue
        meta = stripped.split(":", 1)[1]
        parts = [part.strip() for part in meta.split(",")]
        if len(parts) < 3:
            issues.append({"line": idx, "severity": "error", "message": "Gantt task needs an id and timing fields."})
        elif not re.match(r"^[A-Za-z][A-Za-z0-9_]*$", parts[1] if parts[0] in {"done", "active", "crit", "milestone"} else parts[0]):
            issues.append({"line": idx, "severity": "error", "message": "Gantt task id must be alphanumeric."})
        task_id = parts[1] if parts and parts[0] in {"done", "active", "crit", "milestone"} and len(parts) > 1 else parts[0]
        if task_id in task_ids:
            issues.append({"line": idx, "severity": "error", "message": f"Duplicate Gantt task id '{task_id}'."})
        task_ids.add(task_id)


def _validate_pie(lines, issues):
    slices = 0
    for idx, line in enumerate(lines, start=1):
        stripped = line.strip()
        if stripped.startswith('"'):
            slices += 1
            if not re.match(r'^"[^"]+"\s*:\s*\d+(\.\d+)?$', stripped):
                issues.append({"line": idx, "severity": "error", "message": 'Pie slices must use: "Label" : value.'})
    if slices < 2:
        issues.append({"line": 1, "severity": "warning", "message": "Pie chart should contain at least two slices."})


def _validate_xy(lines, issues):
    joined = "\n".join(lines)
    required = ["title", "x-axis", "y-axis"]
    for key in required:
        if key not in joined:
            issues.append({"line": 1, "severity": "error", "message": f"XY chart is missing '{key}'."})
    if "bar [" not in joined and "line [" not in joined:
        issues.append({"line": 1, "severity": "error", "message": "XY chart needs at least one bar or line data series."})
