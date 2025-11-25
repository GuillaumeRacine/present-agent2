# Custom Slash Commands

Quick reference for all available slash commands in this project.

## 🚀 Available Commands

### `/sub [feature]` - Full Multi-Agent Workflow
**Description**: Execute the complete 6-phase agent workflow for building a feature from spec to validation.

**Phases**:
1. Product Manager → Research & spec
2. Tickets Manager → Create GitHub issues
3. Engineering Manager → Technical review
4. Architect → Implementation
5. Testing Agent → QA & debugging
6. User Simulator → UX validation

**Example**:
```
/sub user profile system
/sub gift recommendation filters
/sub advanced search feature
```

---

### `/spec [feature]` - Create Feature Specification
**Description**: Use the Product Manager agent to research and create a detailed feature specification.

**Outputs**:
- Problem statement
- Best practices research
- Product vision alignment
- User flows
- Acceptance criteria
- Success metrics

**Example**:
```
/spec social sharing feature
/spec gift filtering system
/spec recommendation algorithm v2
```

---

### `/build [task]` - Quick Implementation
**Description**: Use the Architect agent to implement code with full testing and logging.

**Includes**:
- TypeScript implementation
- Unit tests
- Error handling
- Logging
- Documentation
- Code quality verification

**Example**:
```
/build authentication middleware
/build product search API endpoint
/build user profile service
```

---

### `/test [component]` - Comprehensive Testing
**Description**: Use the Testing Agent to thoroughly test a feature or component.

**Test Coverage**:
- Unit tests
- Edge cases
- Error scenarios
- Logging verification
- Performance checks
- Acceptance criteria validation

**Example**:
```
/test recommendation engine
/test user authentication flow
/test database queries
```

---

### `/ux [feature]` - UX Validation
**Description**: Use the User Simulator agent to test with realistic personas.

**Personas**:
- Sarah (thoughtful planner)
- Mike (last-minute shopper)
- Lisa (gift enthusiast)

**Validates**:
- User flows
- Success metrics
- UX issues
- Product assumptions

**Example**:
```
/ux checkout flow
/ux gift recommendation experience
/ux mobile interface
```

---

## 🎯 Workflow Comparison

| Command | Agents Used | Time | Use When |
|---------|-------------|------|----------|
| `/sub` | All 6 | Long | Building complete feature |
| `/spec` | 1 (PM) | Short | Need spec only |
| `/build` | 2 (Architect + QA) | Medium | Quick implementation |
| `/test` | 1 (Testing) | Short | QA existing code |
| `/ux` | 1 (User Sim) | Medium | Validate UX |

---

## 💡 Best Practices

### When to use `/sub` (Full Workflow)
- ✅ New major features
- ✅ Complex systems requiring research
- ✅ When you want complete validation
- ✅ Features that need GitHub tracking

### When to use individual commands
- ✅ Quick iterations
- ✅ Testing existing code
- ✅ Specific phase needed
- ✅ Faster turnaround

### Command Chaining
You can also chain commands manually:
```
/spec advanced search
[Review the spec]
/build advanced search based on spec above
[Implementation complete]
/test advanced search
[Tests pass]
/ux advanced search
```

---

## 📝 Customization

All commands are markdown files in `.claude/commands/`. You can:

1. **Edit existing commands** - Modify the prompts
2. **Create new commands** - Add new `.md` files
3. **Remove commands** - Delete `.md` files

### Command File Structure
```markdown
---
description: "Short description shown in autocomplete"
---

Your command prompt here.
Use {{prompt}} for the user's input.
```

---

## 🔗 Related Documentation

- **Agent Details**: `.claude/agents/` - Individual agent specifications
- **Workflow Guide**: `.claude/WORKFLOW.md` - Full workflow documentation
- **Project Context**: `.claude/PROJECT_CONTEXT.md` - Current project state

---

## ✨ Quick Start

**Your first full workflow**:
```
/sub user wishlist feature
```

This will execute all 6 agents and build the feature from scratch with full testing and validation!

---

**Last Updated**: November 18, 2025
**Commands Location**: `.claude/commands/`
