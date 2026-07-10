# Event Modeling Rules & Standards for Mermaid JS

## Syntax
- Always start with `flowchart LR` (Left-to-Right timeline).
- Create 4 horizontal swimlanes:
  - Users / UI
  - Commands (Blue / Action)
  - Events (Orange / Fact)
  - Views / Read Models (Green)
- Link sequentially left-to-right to show information flow over time.

## Example
```mermaid
flowchart LR
    subgraph UI ["User / UI Lane"]
        registerForm["Registration Page"]
        dashboard["User Dashboard"]
    end

    subgraph commands ["Commands Lane"]
        createUser["CreateUser Command"]
    end

    subgraph events ["Events Lane"]
        userCreated["UserCreated Event"]
    end

    subgraph views ["Views / Read Models Lane"]
        userProfile["UserProfile View"]
    end

    registerForm --> createUser
    createUser --> userCreated
    userCreated --> userProfile
    userProfile --> dashboard

    %% Style classes
    classDef event fill:#ffe5cc,stroke:#ff8000,color:#000000;
    classDef view fill:#e2f0d9,stroke:#385723,color:#000000;
    classDef command fill:#ddebf7,stroke:#1f4e78,color:#000000;

    class userCreated event;
    class userProfile view;
    class createUser command;
```
