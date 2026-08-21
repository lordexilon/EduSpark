---
name: swarm_router
description: Routes and structures complex tasks into a Graph (DAG) for execution by sub-agents in the SCA v3.0 paradigm
---

# 🐝 Swarm Router Protocol (SCA v3.0)

This workflow is triggered **WHENEVER** the user requests a development, modification, or refactoring task. It replaces the old linear flow.

## Phase 1: Graph (DAG) Analysis and Design

1. **Read the Environment:** 
   Review `AI_CONTEXT/active_context.md` and `AI_CONTEXT/memory_schema.md`.
2. **Decompose the Task:**
   Instead of writing the code yourself, break the request into logical "Nodes". Identify which nodes can be executed in parallel and which are sequential.
3. **Issue the Context Bridge (Swarm Edition):**
   Present the plan to the user using this format:

```markdown
📝 CONTEXT BRIDGE (SWARM EDITION)
──────────────────────────────────────
🎯 Objective: [What are we building]
📊 Graph Structure (DAG):
   - 🟢 [Node 1] (e.g., Frontend UI) -> Files: [files]
   - 🟢 [Node 2] (e.g., Backend API) -> Files: [files]
   - 🔴 [Node 3] (Red Team / Review) -> Depends on: Node 1 and 2
⚙️ Autonomy Mode: [STRICT / AUTONOMOUS]
──────────────────────────────────────
✅ Approved / ⏳ I need to modify the graph
```

## Phase 2: Swarm Execution

Once the user approves the Context Bridge:

### If Mode is STRICT (Human-in-the-Loop):
1. **Execute the Current Node:** Use your capabilities (or the `swarm_engine` if configured) to process ONLY the first node.
2. **Pause and Yield Control:** Show the generated diffs to the user.
3. **Wait:** Do not advance to the next node until receiving a validation message from the human (e.g., "Approved, proceed with Backend").

### If Mode is AUTONOMOUS (Autopilot):
1. Trigger all independent nodes in parallel.
2. Execute dependent nodes sequentially.
3. Consolidate everything without pausing.

## Phase 3: Closure and Ledger

1. **Update Memory:** Write the results of completed nodes into `AI_CONTEXT/swarm_ledger.md`.
2. **Update Active Context:** Modify `AI_CONTEXT/active_context.md` to reflect the new architecture state.
3. **Metrics:** Log the session in `metricas_sca.md`, noting the "Sub-Agents Invoked" and "Fault Tolerance".
