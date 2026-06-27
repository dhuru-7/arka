# Flowchart Rules & Standards for Mermaid JS

## Syntax
- Always start with `flowchart TD` (top-down) or `flowchart LR` (left-right).
- Use `TD` for vertical flows, `LR` for horizontal flows.
- **STRICT CODE-ONLY RULE**: The response must contain ONLY the raw Mermaid diagram syntax. Do NOT wrap the diagram in markdown code block fences (e.g., do not use ` ```mermaid ` or ` ``` `). Do NOT include any introductory text, concluding remarks, explanations, conversational comments, or warnings.

## Node Shape Standards
- **STRICT NODE ID RULE**: Every shape in the diagram must have an explicit, alphanumeric node ID preceding its shape definition (e.g., use `startNode([Start])` or `decisionNode{Decision}`). Do NOT output bare shapes (like `([Start])` or `{Decision}`) without a preceding node ID.
- Node IDs must be simple contiguous alphanumeric strings (e.g. `startNode`, `checkPass`). NEVER use spaces, hyphens, or special characters in Node IDs.
- **Rectangle** `[text]` → Process / Action step
- **Rounded Rectangle** `(text)` → Start / End / Terminal
- **Diamond** `{text}` → Decision / Conditional
- **Parallelogram** `[/text/]` → Input / Output
- **Hexagon** `{{text}}` → Preparation / Setup
- **Circle** `((text))` → Connector / Junction
- **Stadium** `([text])` → Start / End (alternate)
- **Subroutine** `[[text]]` → Predefined process / Function call
- **Cylinder** `[(text)]` → Database / Storage
- **Trapezoid** `[/text\]` → Manual operation
- **Double Circle** `(((text)))` → Critical endpoint

## Edge/Arrow Standards
- `-->` Solid arrow (normal flow)
- `-.->` Dotted arrow (optional flow)
- `==>` Thick arrow (primary/critical path)
- `-->|label|` Arrow with label (condition text)
- `---` Line without arrow

## Semantic Node Coloring Rules
Color should represent semantics, not aesthetics. Use a consistent, low-saturation palette across all generated flowcharts. Do not color nodes arbitrarily or alternate colors just for visual appeal.

### Color Mapping Palette
- **Green** (Start, End, Success, Completion): Fills should be soft green, borders darker green.
  - Class definition: `classDef greenNode fill:#e2f0d9,stroke:#385723,color:#000000;`
- **Blue** (Process, Action, Operation): Fills should be light blue, borders darker blue.
  - Class definition: `classDef blueNode fill:#ddebf7,stroke:#1f4e78,color:#000000;`
- **Yellow/Cream** (Decision points): Fills should be pale yellow/cream, borders darker gold/brown.
  - Class definition: `classDef yellowNode fill:#fff2cc,stroke:#7f6000,color:#000000;`
- **Red** (Errors, Failures, Rollbacks, Cancellations, Escalations, Warnings): Fills should be soft red, borders darker red.
  - Class definition: `classDef redNode fill:#fce4d6,stroke:#c65911,color:#000000;`
- **Gold** (Logging, Learning, Analytics, Auditing): Fills should be soft gold, borders darker gold.
  - Class definition: `classDef goldNode fill:#fff2cc,stroke:#d68a00,color:#000000;`

### Coloring Best Practices
1. **Low Saturation**: Always use muted, pastel colors (avoid neon, bright red, pure yellow, or bright blue) to maintain high readability.
2. **Borders & Fill**: Ensure borders are slightly darker than the fill (as defined in the classes above).
3. **Monochrome Arrows**: Keep connectors and arrowheads monochrome (black or dark gray). Do not style arrows with colors.
4. **Neutral Labels**: Decision labels (e.g., `Yes`, `No`, `Success`, `Failure` on arrows) must remain neutral (black/dark gray).
5. **Palette Limit**: Limit the palette to 5–6 semantic colors in a single diagram.
6. **Consistent Scanning**: Colors should improve visual scanning: follow the "happy path" (mostly blue/green), spot decisions (yellow), failures (red), and logging (gold).
7. **Same Semantic Node = Same Color**: Ensure identical semantic node types always use identical colors across the entire diagram.

## Best Practices
1. Every flowchart MUST have a clear Start and End node.
8. Always label decision branches clearly.
9. **CRITICAL SYNTAX**: ALWAYS double-quote the text inside shapes to avoid parser crashes from commas/colons/apostrophes. Example: `A["User's Data, List"]`.
10. **NO MULTIPLE ARROWS**: Never draw multiple arrows extending in the exact same direction between two identical nodes.
11. **RESERVED KEYWORDS**: NEVER use the word `end` as a node ID (e.g., `end[Finish]`). This is a reserved Mermaid keyword for subgraphs and will crash the renderer. Use `finish`, `done`, or `endNode` instead.
12. **SIMPLICITY FIRST**: For basic prompts (e.g., "user login", "Water Cycle"), do not exceed 6-8 nodes. Focus ONLY on the primary 'Happy Path'. Do not add complex error handling unless explicitly requested.
13. **EDGE STYLING SYNTAX**: NEVER use `-->|style className|` or `-->|classDef|` to style edges or arrows. The inline label syntax `|text|` is STRICTLY for printing visible label text on an arrow. To style edges, use `linkStyle <index> stroke:#hex,stroke-width:2px` at the end of the chart. To style nodes, define classes via `classDef myClass fill:#HEX` and apply them as `nodeId:::myClass`.

## Example
```mermaid
flowchart TD
    startNode([Start]):::greenNode --> inputNode[/Enter Data/]:::blueNode
    inputNode --> processNode[Process Data]:::blueNode
    processNode --> decisionNode{Is Valid?}:::yellowNode
    decisionNode -->|Yes| successNode[Save to DB]:::greenNode
    decisionNode -->|No| errorNode[Show Error]:::redNode
    errorNode --> inputNode
    successNode --> finishNode([End]):::greenNode

    classDef greenNode fill:#e2f0d9,stroke:#385723,color:#000000;
    classDef blueNode fill:#ddebf7,stroke:#1f4e78,color:#000000;
    classDef yellowNode fill:#fff2cc,stroke:#7f6000,color:#000000;
    classDef redNode fill:#fce4d6,stroke:#c65911,color:#000000;
```

## Common Patterns
- **Linear Flow**: start → step1 → step2 → end
- **Decision Branch**: step → decision → yes_path / no_path → merge → continue
- **Loop**: step → check → (back to step if condition)
- **Parallel**: step → fork → path1 & path2 → join → continue
