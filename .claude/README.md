# Claude Code Automation Setup

This directory contains automation configuration for the Present-Agent2 project.

## Structure

```
.claude/
├── agents/
│   └── architect.md          # Specialized coding agent with project context
├── hooks/
│   └── user-prompt-submit.sh # Auto-loads context for coding requests
├── PROJECT_CONTEXT.md         # Quick project reference
├── settings.local.json        # Claude Code configuration
└── README.md                  # This file
```

## How It Works

### 1. Automatic Context Loading
The `user-prompt-submit.sh` hook automatically detects coding requests and reminds Claude about project context.

### 2. Architect Agent
The architect agent (`.claude/agents/architect.md`) contains:
- Project architecture decisions
- Coding standards
- Development priorities
- Data model overview
- Quality requirements

### 3. Project Context
`PROJECT_CONTEXT.md` provides a quick reference for:
- Current development status
- Key files and data
- What we're building vs. what we're deferring

## Using the Subagent Workflow

### Option 1: Explicit Agent Invocation
When you want to delegate complex coding tasks:

```
Use the architect agent to build the recommendation engine
```

Claude will automatically load the agent context and follow the guidelines.

### Option 2: Automatic Context (via hooks)
Just ask normally - the hook will remind Claude of project context:

```
Build the data ingestion pipeline for Neo4j
```

The hook detects keywords like "build", "create", "implement" and provides context.

## Benefits

✅ **Consistent architecture** - Agent always follows project patterns
✅ **Better context management** - No need to repeat project details
✅ **Quality standards** - Enforces TypeScript, logging, error handling
✅ **Task tracking** - Agent uses TodoWrite to track progress
✅ **Focus** - Reminds what NOT to build (per product vision)

## Customization

Edit these files to adjust the workflow:
- `architect.md` - Change coding standards or priorities
- `PROJECT_CONTEXT.md` - Update project status
- `user-prompt-submit.sh` - Modify when context is auto-loaded
- `settings.local.json` - Enable/disable hooks or add permissions

## Next Steps

With this setup, you can now:

1. **Delegate complex builds**: "Build the complete recommendation engine"
2. **Get consistent quality**: Agent follows TypeScript, logging, testing standards
3. **Track progress**: Todos are automatically managed
4. **Iterate faster**: Less context repetition needed

Just ask for what you need, and the agent will handle the implementation with full project context!
