# Radar Chart Rules & Standards for Mermaid JS

## Syntax
- Represent Radar profiles using `xychart-beta`.
- Category labels on `x-axis` represent dimensions.
- `y-axis` represents values/ranges.

## Example
```mermaid
xychart-beta
    title "Developer Skill Matrix"
    x-axis [Frontend, Backend, DevOps, Design, Database, Testing]
    y-axis "Skill Level" 0 --> 10
    line [8, 9, 6, 5, 8, 7]
    line [6, 7, 8, 4, 6, 9]
```
