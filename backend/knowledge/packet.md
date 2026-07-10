# Packet Diagram Rules & Standards for Mermaid JS

## Syntax
- Start with `flowchart TD` or `graph TD`.
- Represent offsets as subgraphs (e.g. "Bits 0 - 31").
- Create sequential fields linked left-to-right to show structure.

## Example
```mermaid
flowchart TD
    subgraph word0 ["Word 0 (Offset 0)"]
        v["Version (4b)"] --> ihl["IHL (4b)"]
        ihl --> tos["TOS (8b)"]
        tos --> len["Total Length (16b)"]
    end
    subgraph word1 ["Word 1 (Offset 4)"]
        id["Identification (16b)"] --> flags["Flags (3b)"]
        flags --> frag["Fragment Offset (13b)"]
    end
```
