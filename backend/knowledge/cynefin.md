# Cynefin Framework Diagram Rules & Standards for Mermaid JS

## Syntax
- Always start with `flowchart TD` or `flowchart LR`.
- Use subgraphs to represent the Cynefin domains.
- Nodes represent concepts, actions, or states inside domains.

## Structure
- Obvious / Clear (bottom-right)
- Complicated (top-right)
- Complex (top-left)
- Chaotic (bottom-left)
- Disorder (center)

## Example
```mermaid
flowchart TD
    subgraph complex ["Complex (Probe - Sense - Respond)"]
        node_complex["Emergent Practice"]
    end
    subgraph complicated ["Complicated (Sense - Analyze - Respond)"]
        node_complicated["Good Practice"]
    end
    subgraph chaotic ["Chaotic (Act - Sense - Respond)"]
        node_chaotic["Novel Practice"]
    end
    subgraph clear ["Clear / Obvious (Sense - Categorize - Respond)"]
        node_clear["Best Practice"]
    end
    subgraph disorder ["Disorder"]
        node_disorder["Conflict / Confusion"]
    end

    disorder --> complex
    disorder --> chaotic
```
