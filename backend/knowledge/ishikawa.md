# Ishikawa (Fishbone) Diagram Rules & Standards for Mermaid JS

## Syntax
- Always start with `flowchart RL` (Right-to-Left layout matches fish head on right).
- Define primary categories as subgraphs or main backbone nodes.
- Secondary causes point to primary categories.

## Example
```mermaid
flowchart RL
    effect["High Defect Rate"]

    backbone_center["backbone"] --> effect

    %% Category Nodes
    people["People"] --> backbone_center
    methods["Methods"] --> backbone_center
    machines["Machines"] --> backbone_center
    materials["Materials"] --> backbone_center

    %% Secondary Causes
    training["Lack of training"] --> people
    fatigue["Operator fatigue"] --> people

    process["Outdated process"] --> methods
    steps["Too many manual steps"] --> methods

    wear["Machine wear"] --> machines
    calibration["Poor calibration"] --> machines

    quality["Low grade alloy"] --> materials
    variation["Supplier variation"] --> materials
```
