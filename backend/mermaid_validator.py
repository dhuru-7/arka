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
        content = _restore_flowchart_line_breaks(content)
        content = re.sub(r"(^|\n)end(\s*[-=]>|[\(\[\{])", r"\1finish\2", content)
        content = re.sub(r"([\(\[\{])end([\)\]\}])", r"\1finish\2", content)
        content = re.sub(r"([-=]>(?:\s*\|[^|]*\|)?\s*)end(\s|[\(\[\{\n]|$)", r"\1finish\2", content)
        content = re.sub(r"(\w+)\s*\(\(\s*([\[\{\(])", r"\1\2", content)
        content = re.sub(r"([\]\}\)])\s*\)\)", r"\1", content)
        content = re.sub(r"(?<!:)::([a-zA-Z_]\w*)", r":::\1", content)
        content = _trim_invalid_link_styles(content)

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

        # --- ER-specific cleaning passes ---
        # 1. Quote unquoted relationship labels
        fixed = []
        for line in lines:
            match = re.match(r'(\s*\w+\s+[|o}{]+--[|o}{]+\s+\w+\s*:\s*)([^"].*[^"]\s*)$', line)
            fixed.append(f'{match.group(1)}"{match.group(2).strip()}"' if match else line)
        lines = fixed

        # 2. Remove invalid `enum` blocks
        cleaned = []
        in_enum = False
        for line in lines:
            stripped = line.strip()
            if re.match(r'^enum\s+\w+\s*\{', stripped):
                in_enum = True
                continue
            if in_enum:
                if stripped == "}":
                    in_enum = False
                continue
            cleaned.append(line)
        lines = cleaned

        # 3. Deduplicate entity definitions — keep only the FIRST occurrence of each entity block
        deduped = []
        seen_entities = set()
        in_entity = False
        current_entity_name = None
        skip_block = False
        for line in lines:
            stripped = line.strip()
            entity_open = re.match(r'^([A-Za-z]\w*)\s*\{', stripped)
            if entity_open and not in_entity:
                in_entity = True
                current_entity_name = entity_open.group(1)
                if current_entity_name in seen_entities:
                    skip_block = True
                else:
                    seen_entities.add(current_entity_name)
                    skip_block = False
                    deduped.append(line)
                continue
            if in_entity:
                if stripped == "}":
                    in_entity = False
                    if not skip_block:
                        deduped.append(line)
                    skip_block = False
                else:
                    if not skip_block:
                        deduped.append(line)
                continue
            deduped.append(line)
        lines = deduped

        # 4. Deduplicate relationship lines (treat A->B and B->A with same pair as duplicates)
        rel_seen = set()
        deduped_rels = []
        for line in lines:
            stripped = line.strip()
            rel_match = re.match(r'^([A-Za-z]\w*)\s+[|o}{]+--[|o}{]+\s+([A-Za-z]\w+)', stripped)
            if rel_match:
                pair = tuple(sorted([rel_match.group(1), rel_match.group(2)]))
                if pair in rel_seen:
                    continue
                rel_seen.add(pair)
            deduped_rels.append(line)
        lines = deduped_rels

        # 5. Remove truncated/incomplete relationship lines
        final = []
        for line in lines:
            stripped = line.strip()
            # Detect lines like "Notification ||--" with no target entity
            if re.match(r'^[A-Za-z]\w*\s+[|o}{]+--\s*$', stripped):
                continue
            final.append(line)
        lines = final

        # 6. Remove relationships that reference enum entities (which were stripped)
        rel_final = []
        for line in lines:
            stripped = line.strip()
            rel_match = re.match(r'^([A-Za-z]\w*)\s+[|o}{]+--[|o}{]+\s+([A-Za-z]\w+)', stripped)
            if rel_match:
                # Skip relationships to entities that look like enums (common patterns)
                target = rel_match.group(2)
                if target.endswith("Status") or target.endswith("Method") or target == "Rating":
                    # Check if this entity was never defined
                    if target not in seen_entities:
                        continue
            rel_final.append(line)
        lines = rel_final

        content = "\n".join(lines)

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

        # Ensure a title line exists
        if not any(line.strip().startswith("title") for line in lines):
            lines.insert(1, "    title Project Timeline")

        # Fix axisFormat with spaces between tokens (e.g., "%b %d" -> "%b-%d")
        fixed = []
        for line in lines:
            if line.strip().startswith("axisFormat"):
                # Replace space-separated format tokens with dash-separated
                line = re.sub(r'(axisFormat\s+%[a-zA-Z])\s+(%[a-zA-Z])', r'\1-\2', line)
            fixed.append(line)
        lines = fixed

        # Replace '&' with 'and' in section names
        fixed = []
        for line in lines:
            if line.strip().startswith("section "):
                line = line.replace(" & ", " and ")
            fixed.append(line)
        lines = fixed

        # Remove bare dependency-only task lines (e.g., "Task Name : after id1" with no duration/dates)
        fixed = []
        for line in lines:
            stripped = line.strip()
            if ":" in stripped and not stripped.startswith(("gantt", "title", "dateFormat", "axisFormat", "section", "excludes", "todayMarker")):
                meta = stripped.split(":", 1)[1].strip()
                parts = [p.strip() for p in meta.split(",")]
                # Check if line is ONLY "after id" with no date or duration
                non_empty = [p for p in parts if p]
                if len(non_empty) == 1 and non_empty[0].startswith("after "):
                    continue  # Skip bare dependency-only lines
            fixed.append(line)
        lines = fixed

        # Fix redundant explicit dates alongside 'after' dependency
        # Pattern: "Task : id, after prev, 2024-01-07, 2024-01-14" -> "Task : id, after prev, Nd"
        fixed = []
        date_re = re.compile(r'^\d{4}-\d{2}-\d{2}$')
        for line in lines:
            stripped = line.strip()
            if ":" in stripped and not stripped.startswith(("gantt", "title", "dateFormat", "axisFormat", "section", "excludes", "todayMarker")):
                meta = stripped.split(":", 1)[1].strip()
                parts = [p.strip() for p in meta.split(",")]
                has_after = any(p.startswith("after ") for p in parts)
                dates_found = [p for p in parts if date_re.match(p)]
                if has_after and len(dates_found) == 2:
                    # Convert two explicit dates to a duration
                    try:
                        from datetime import datetime
                        d1 = datetime.strptime(dates_found[0], "%Y-%m-%d")
                        d2 = datetime.strptime(dates_found[1], "%Y-%m-%d")
                        days = max((d2 - d1).days, 1)
                        # Rebuild the line without the two dates, adding duration
                        task_name = stripped.split(":", 1)[0].strip()
                        new_parts = [p for p in parts if not date_re.match(p)]
                        new_parts.append(f"{days}d")
                        indent = line[:len(line) - len(line.lstrip())]
                        fixed.append(f"{indent}{task_name} : {', '.join(new_parts)}")
                        continue
                    except (ValueError, ImportError):
                        pass
            fixed.append(line)
        lines = fixed

        content = "\n".join(lines)

    return content.strip()


def _restore_flowchart_line_breaks(content):
    """Recover readable Mermaid when a model collapses a flowchart into one line."""
    text = re.sub(r"\s+", " ", content).strip() if "\n" not in content.strip() else content
    text = re.sub(r"^(flowchart\s+(?:TD|LR|BT|RL)|graph\s+(?:TD|LR|BT|RL))\s+", r"\1\n    ", text)
    text = re.sub(
        r"\s+(?=(?:[A-Za-z][A-Za-z0-9_]*\s*(?:[-.=]+[ox>]|<[-.=]+|---)|classDef\s+|linkStyle\s+|style\s+|class\s+|subgraph\s+|end\b))",
        "\n    ",
        text,
    )
    return "\n".join(line.rstrip() for line in text.splitlines())


def _trim_invalid_link_styles(content):
    lines = content.splitlines()
    edge_count = 0
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("linkStyle "):
            continue
        if re.search(r"[-.=]+[ox>]|<[-.=]+|---", stripped):
            edge_count += 1

    seen = set()
    cleaned = []
    for line in lines:
        match = re.match(r"\s*linkStyle\s+(\d+)\s+(.+?);?\s*$", line.strip())
        if match:
            idx = int(match.group(1))
            if idx >= edge_count or idx in seen:
                continue
            seen.add(idx)
            cleaned.append(f"    linkStyle {idx} {match.group(2).rstrip(';')};")
        else:
            cleaned.append(line)
    return "\n".join(cleaned)


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
    entity_defs = {}  # entity_name -> first line number
    entity_has_attrs = {}  # entity_name -> bool
    rel_pairs = {}  # sorted (A, B) pair -> first line number
    rel_count = 0
    in_entity = False
    current_entity = None
    current_entity_line = 0
    has_attrs = False

    for idx, line in enumerate(lines, start=1):
        stripped = line.strip()
        if not stripped or stripped in ("erDiagram", "{", "}"):
            if stripped == "}" and in_entity:
                entity_has_attrs[current_entity] = has_attrs
                if not has_attrs:
                    issues.append({"line": current_entity_line, "severity": "error", "message": f"Entity '{current_entity}' has no attributes. Add at least a primary key."})
                in_entity = False
            continue

        # Detect enum blocks (invalid syntax)
        if re.match(r'^enum\s+\w+\s*\{', stripped):
            issues.append({"line": idx, "severity": "error", "message": "Mermaid ER diagrams do not support 'enum' blocks. Use a string attribute instead."})
            continue

        # Detect entity opening
        entity_open = re.match(r'^([A-Za-z]\w*)\s*\{', stripped)
        if entity_open:
            entity_name = entity_open.group(1)
            in_entity = True
            current_entity = entity_name
            current_entity_line = idx
            has_attrs = False
            if not re.match(r'^[A-Z][A-Za-z0-9]*$', entity_name):
                issues.append({"line": idx, "severity": "error", "message": "ER entity names should be PascalCase without spaces."})
            if entity_name in entity_defs:
                issues.append({"line": idx, "severity": "error", "message": f"Duplicate entity definition for '{entity_name}' (first defined on line {entity_defs[entity_name]})."})
            else:
                entity_defs[entity_name] = idx
            continue

        # Inside an entity block — count attributes
        if in_entity:
            if stripped == "}":
                entity_has_attrs[current_entity] = has_attrs
                if not has_attrs and current_entity not in [e for e in entity_defs if entity_defs[e] != current_entity_line]:
                    issues.append({"line": current_entity_line, "severity": "error", "message": f"Entity '{current_entity}' has no attributes. Add at least a primary key."})
                in_entity = False
            else:
                has_attrs = True
            continue

        # Detect relationship lines
        rel_match = re.match(r'^([A-Za-z]\w*)\s+([|o}{]+--[|o}{]+)\s+([A-Za-z]\w+)\s*:', stripped)
        if rel_match:
            rel_count += 1
            src = rel_match.group(1)
            tgt = rel_match.group(3)

            # Check for quoted label
            if not re.search(r':\s*"[^"]+"$', stripped):
                issues.append({"line": idx, "severity": "error", "message": "ER relationship label must be quoted."})

            # Check for self-referencing
            if src == tgt:
                issues.append({"line": idx, "severity": "warning", "message": f"Self-referencing relationship on '{src}'. Ensure this is intentional (e.g., hierarchical data)."})

            # Check for duplicate relationship pairs (including bidirectional)
            pair = tuple(sorted([src, tgt]))
            if pair in rel_pairs:
                issues.append({"line": idx, "severity": "error", "message": f"Duplicate relationship between '{src}' and '{tgt}' (first on line {rel_pairs[pair]}). State each relationship only once."})
            else:
                rel_pairs[pair] = idx
            continue

        # Detect truncated relationship lines (no target entity)
        trunc_match = re.match(r'^[A-Za-z]\w*\s+[|o}{]+--\s*$', stripped)
        if trunc_match:
            issues.append({"line": idx, "severity": "error", "message": "Truncated relationship line — missing target entity and label."})
            continue

    # Check entity count
    if len(entity_defs) > 10:
        issues.append({"line": 1, "severity": "warning", "message": f"Diagram has {len(entity_defs)} entities. Keep to 10 or fewer for readability."})

    # Check relationship count
    if rel_count > 15:
        issues.append({"line": 1, "severity": "warning", "message": f"Diagram has {rel_count} relationships. Keep to 15 or fewer for readability."})


def _validate_gantt(lines, issues):
    if not any("dateFormat YYYY-MM-DD" in line for line in lines):
        issues.append({"line": 1, "severity": "error", "message": "Gantt chart must include dateFormat YYYY-MM-DD."})

    # Check for title
    if not any(line.strip().startswith("title") for line in lines):
        issues.append({"line": 1, "severity": "warning", "message": "Gantt chart should include a title line."})

    task_ids = set()
    section_count = 0

    def is_date(s):
        return bool(re.match(r'^\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?$', s))

    def is_duration(s):
        return bool(re.match(r'^\d+[wdhms]$', s))

    def is_dependency(s):
        return s.startswith('after ')

    def is_status(s):
        return s in {'done', 'active', 'crit', 'milestone'}

    for idx, line in enumerate(lines, start=1):
        stripped = line.strip()
        if not stripped or stripped == "gantt":
            continue

        # Check axisFormat for space-separated tokens
        if stripped.startswith("axisFormat"):
            fmt = stripped[len("axisFormat"):].strip()
            if re.search(r'%[a-zA-Z]\s+%[a-zA-Z]', fmt):
                issues.append({"line": idx, "severity": "error", "message": "axisFormat must not have spaces between format tokens. Use '%b-%d' instead of '%b %d'."})
            continue

        # Check section names for special characters
        if stripped.startswith("section "):
            section_count += 1
            section_name = stripped[len("section "):].strip()
            if "&" in section_name:
                issues.append({"line": idx, "severity": "warning", "message": f"Section name contains '&'. Use 'and' instead for compatibility."})
            continue

        if stripped.startswith(("title", "dateFormat", "excludes", "todayMarker")):
            continue

        # Everything below is a task line
        if ":" not in stripped:
            issues.append({"line": idx, "severity": "error", "message": "Gantt task line must contain a colon separating task name and metadata."})
            continue

        meta = stripped.split(":", 1)[1]
        parts = [part.strip() for part in meta.split(",")]
        non_empty_parts = [p for p in parts if p]

        # Check for bare dependency-only lines (no dates or duration)
        if len(non_empty_parts) == 1 and non_empty_parts[0].startswith("after "):
            issues.append({"line": idx, "severity": "error", "message": "Task has only a dependency and no duration or dates. Add a duration like '7d'."})
            continue

        # Check for redundant explicit dates alongside 'after' dependency
        has_after = any(p.startswith("after ") for p in parts)
        dates_found = [p for p in parts if is_date(p)]
        if has_after and len(dates_found) >= 2:
            issues.append({"line": idx, "severity": "warning", "message": "Task uses 'after' dependency with explicit start/end dates. Use duration instead (e.g., '14d')."})

        # Check task has at least dates or duration
        has_dates = len(dates_found) >= 1
        has_duration = any(is_duration(p) for p in parts)
        if not has_dates and not has_duration and not has_after:
            issues.append({"line": idx, "severity": "error", "message": "Task must have dates, a duration, or a dependency."})

        # Extract taskId (first part that is not status, date, duration, or dependency)
        task_id = None
        for part in parts:
            if not is_status(part) and not is_date(part) and not is_duration(part) and not is_dependency(part) and part:
                task_id = part
                break

        if task_id:
            if not re.match(r"^[A-Za-z][A-Za-z0-9_]*$", task_id):
                issues.append({"line": idx, "severity": "error", "message": f"Gantt task id '{task_id}' must be alphanumeric without spaces."})
            elif task_id in task_ids:
                issues.append({"line": idx, "severity": "error", "message": f"Duplicate Gantt task id '{task_id}'."})
            else:
                task_ids.add(task_id)

    # Check dependency IDs reference existing task IDs
    for idx, line in enumerate(lines, start=1):
        stripped = line.strip()
        if ":" not in stripped or stripped.startswith(("gantt", "title", "dateFormat", "axisFormat", "section", "excludes", "todayMarker")):
            continue
        meta = stripped.split(":", 1)[1]
        parts = [part.strip() for part in meta.split(",")]
        for part in parts:
            if part.startswith("after "):
                dep_ids = part[len("after "):].strip().split()
                for dep_id in dep_ids:
                    if dep_id and dep_id not in task_ids:
                        issues.append({"line": idx, "severity": "warning", "message": f"Dependency 'after {dep_id}' references unknown task id '{dep_id}'."})

    # Section count check
    if section_count > 8:
        issues.append({"line": 1, "severity": "warning", "message": f"Gantt chart has {section_count} sections. Keep to 6 or fewer for readability."})

    # Total task count check
    if len(task_ids) > 30:
        issues.append({"line": 1, "severity": "warning", "message": f"Gantt chart has {len(task_ids)} tasks. Keep to 25 or fewer for readability."})


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
