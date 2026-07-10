# Kanban Board Rules & Standards for Mermaid JS

## Syntax
- Always start with `flowchart LR`.
- Create subgraphs representing column lanes (Backlog, Todo, In Progress, Done).
- Nodes represent card details inside column subgraphs.

## Example
```mermaid
flowchart LR
    subgraph backlog ["1. Backlog"]
        task1["Task 1: Setup repo"]
    end
    subgraph todo ["2. To Do"]
        task2["Task 2: UI Design"]
        task3["Task 3: Schema"]
    end
    subgraph progress ["3. In Progress"]
        task4["Task 4: Auth service"]
    end
    subgraph done ["4. Done"]
        task5["Task 5: Requirements doc"]
    end
```
