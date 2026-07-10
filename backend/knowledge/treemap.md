# Treemap Diagram Rules & Standards for Mermaid JS

## Syntax
- Always start with `flowchart TD` or `flowchart LR`.
- Use nested subgraphs representing parent categories.
- Leaves are individual nodes with custom style classes.

## Example
```mermaid
flowchart TD
    subgraph electronics ["Electronics [70%]"]
        subgraph phones ["Phones [40%]"]
            iphone["iPhone (25%)"]
            android["Android (15%)"]
        end
        subgraph laptops ["Laptops [30%]"]
            macbook["MacBook (18%)"]
            thinkpad["ThinkPad (12%)"]
        end
    end

    subgraph clothing ["Clothing [30%]"]
        subgraph shoes ["Shoes [20%]"]
            sneakers["Sneakers (15%)"]
            boots["Boots (5%)"]
        end
    end
```
