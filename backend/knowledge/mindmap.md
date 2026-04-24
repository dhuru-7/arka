# Mindmap - Mermaid JS Rules & Knowledge Bank

## SYNTAX RULES (CRITICAL)

### Basic Structure
```
mindmap
  root((Central Topic))
    Branch 1
      Sub-topic 1a
      Sub-topic 1b
    Branch 2
      Sub-topic 2a
      Sub-topic 2b
```

### Indentation Rules
- Use **2 spaces** for each level of nesting (NOT tabs)
- The root node is at indent level 1 (2 spaces)
- Each child adds 2 more spaces
- Indentation MUST be consistent — mismatches break the parser

### Node Shapes
- `((text))` — Circle (use for root/central topic)
- `(text)` — Rounded rectangle
- `[text]` — Square/rectangle
- `)text(` — Bang (explosion shape)
- `{{text}}` — Hexagon
- Default (no brackets) — Rectangle with rounded corners

### Key Constraints
- **First line MUST be `mindmap`** — nothing else
- **Root node** must be on the second line with 2 spaces indent
- **NO arrows or connections** — relationships are defined purely by indentation
- **NO special characters** in node text that could break parsing (avoid `->`, `-->`, `---`)
- **NO empty lines** between nodes
- **NO inline styles** — Mermaid mindmaps don't support style directives
- Node text with special chars should be wrapped in quotes or brackets

## DESIGN PRINCIPLES FOR EFFICIENT MINDMAPS

### 1. The 7±2 Rule
- Each branch should have **5-9 direct children maximum**
- If a branch has more than 9 items, create sub-categories
- This follows cognitive load research (Miller's Law)

### 2. Hierarchy Depth
- Keep mindmaps to **3-4 levels deep** maximum
- Deeper nesting makes maps harder to read
- If you need more depth, consider splitting into multiple mindmaps

### 3. Balance
- Distribute branches **evenly** around the root
- Aim for **3-6 main branches** from the root
- Avoid one branch having 10 children while others have 2

### 4. Naming Conventions
- Root: Use a **concise phrase** (2-4 words)
- Branches: Use **single words or short phrases**
- Leaves: Can be slightly more descriptive
- Avoid full sentences — keep it telegraphic

### 5. Logical Grouping
- Group related concepts under the same branch
- Use the **MECE principle** (Mutually Exclusive, Collectively Exhaustive)
- Categories should not overlap

### 6. Reading Flow
- Organize branches in a logical order:
  - Clockwise from top-right (most important first)
  - Or thematic grouping (e.g., Input → Process → Output)

## COMMON ERRORS TO AVOID

1. ❌ Using arrows (`-->`) — mindmaps use indentation only
2. ❌ Using `graph` or `flowchart` keywords
3. ❌ Using tabs instead of spaces
4. ❌ Mixing indentation levels (3 spaces, then 2 spaces)
5. ❌ Adding style/class directives
6. ❌ Using `end` keyword (not needed in mindmaps)
7. ❌ Empty lines between nodes
8. ❌ Node IDs — mindmaps use text directly, not IDs

## EXAMPLES

### Simple Topic Mindmap
```
mindmap
  root((Project Planning))
    Requirements
      Functional
      Non-functional
      Constraints
    Design
      Architecture
      UI/UX
      Database
    Development
      Frontend
      Backend
      Testing
    Deployment
      Staging
      Production
      Monitoring
```

### Detailed Mindmap
```
mindmap
  root((Web Development))
    Frontend
      HTML
      CSS
        Flexbox
        Grid
      JavaScript
        React
        Vue
    Backend
      Node.js
      Python
        Django
        Flask
      Databases
        SQL
        NoSQL
    DevOps
      CI/CD
      Docker
      Cloud
        AWS
        GCP
```
