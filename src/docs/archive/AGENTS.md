# Agent System Documentation

Present-Agent2 uses a multi-agent system to manage the complete software development lifecycle from product ideation to validated implementation.

## > Available Agents

### 1. Product Manager/Designer (`product-manager`)
**Role:** Research, feature validation, and product specifications

**Responsibilities:**
- Research existing solutions and best practices
- Validate product assumptions from `product_vision.md`
- Define user flows and success metrics
- Create detailed feature specifications
- Consider edge cases and failure modes

**When to use:**
- Starting a new feature
- Researching solutions
- Validating product assumptions
- Defining requirements

**Outputs:**
- Feature specification documents
- User flows
- Success metrics
- Acceptance criteria

---

### 2. Tickets Manager (`tickets-manager`)
**Role:** Convert feature specs into actionable GitHub issues

**Responsibilities:**
- Translate product specs into technical tasks
- Create well-structured GitHub issues
- Break down large features
- Set priorities and dependencies
- Apply appropriate labels

**When to use:**
- After feature spec is complete
- Need to organize work into tasks
- Planning implementation sequence

**Outputs:**
- GitHub issues with complete requirements
- Task breakdown for complex features
- Dependency mapping

---

### 3. Engineering Manager (`engineering-manager`)
**Role:** Technical review and architecture decisions

**Responsibilities:**
- Review technical approach
- Add architecture guidance
- Define interfaces and contracts
- Specify logging and testing requirements
- Raise the engineering quality bar
- Make technology choices

**When to use:**
- Reviewing GitHub issues before implementation
- Making architectural decisions
- Defining technical standards
- Estimating complexity

**Outputs:**
- Technically complete GitHub issues
- Architecture decisions
- Code interfaces/contracts
- Testing requirements

---

### 4. Coding Agent / Architect (`architect`)
**Role:** Implementation with high quality standards

**Responsibilities:**
- Implement features following specs
- Write TypeScript with strict typing
- Add extensive structured logging
- Write unit tests
- Handle errors gracefully
- Document complex logic

**When to use:**
- Implementing features
- Building new components
- Writing production code

**Outputs:**
- Implementation code
- Unit tests
- Documentation
- Logging infrastructure

---

### 5. Testing/Debugging Agent (`testing-agent`)
**Role:** Quality assurance and bug investigation

**Responsibilities:**
- Write and run unit/integration tests
- Test edge cases
- Verify logging and observability
- Find and report bugs
- Debug issues
- Verify acceptance criteria

**When to use:**
- After implementation is complete
- Investigating bugs
- Verifying quality
- Before user validation

**Outputs:**
- Test results
- Bug reports
- Test coverage analysis
- Quality verification

---

### 6. User Simulation Agent (`user-simulator`)
**Role:** Realistic user testing and experience validation

**Responsibilities:**
- Test with realistic user personas
- Simulate natural conversations
- Validate user experience
- Measure success metrics
- Verify product assumptions

**When to use:**
- Final validation before marking feature done
- Testing recommendation quality
- Measuring user satisfaction
- Validating product assumptions

**Outputs:**
- User simulation test reports
- Success metrics measured
- UX feedback
- Product assumption validation

---

## = Standard Workflow

The agents work together in a structured workflow:

```
1. Product Manager ’ Creates feature spec
2. Tickets Manager ’ Creates GitHub issues
3. Engineering Manager ’ Reviews and enhances issues
4. Coding Agent ’ Implements feature
5. Testing Agent ’ Tests and verifies quality
6. User Simulation Agent ’ Validates experience
```

See [`.claude/WORKFLOW.md`](.claude/WORKFLOW.md) for detailed workflow documentation.

## =Ë Quick Start

### Full Workflow
Start from the beginning:
```
Use the product manager agent to research and spec out [feature name]
```

### Jump to Implementation
If you already have specs:
```
Use the engineering manager agent to review issue #5, then have the coding agent implement it
```

### Single Agent
Work with one agent:
```
Use the testing agent to verify the recommendation engine
```

### Automatic Orchestration
Let Claude coordinate:
```
Build [feature] using the full agent workflow
```

## <¯ Agent Selection Guide

**Need to...**
- ( **Define what to build** ’ Product Manager
- =Ý **Create GitHub issues** ’ Tickets Manager
- <× **Review technical approach** ’ Engineering Manager
- =» **Write code** ’ Coding Agent
- >ê **Test and debug** ’ Testing Agent
- =d **Validate UX** ’ User Simulation Agent

## =Ê Quality Gates

Each agent has quality gates that must be met before handoff:

**Product Manager:**
- Clear problem statement
- Defined acceptance criteria
- Success metrics specified

**Tickets Manager:**
- Complete requirements documented
- Dependencies identified
- Proper labels applied

**Engineering Manager:**
- Technical approach validated
- Architecture guidance provided
- Quality requirements specified

**Coding Agent:**
- Code implemented per specs
- Unit tests written
- Logging added

**Testing Agent:**
- All tests passing
- Edge cases handled
- No critical bugs

**User Simulation Agent:**
- UX validated
- Success metrics measured
- Product assumptions tested

## =' Agent Configuration

All agents are defined in `.claude/agents/`:
- `product-manager.md`
- `tickets-manager.md`
- `engineering-manager.md`
- `architect.md` (coding agent)
- `testing-agent.md`
- `user-simulator.md`

Each agent file contains:
- Role and responsibilities
- Quality standards
- Output formats
- Collaboration guidelines
- Project context

## =Ö Additional Resources

- [`.claude/WORKFLOW.md`](.claude/WORKFLOW.md) - Detailed workflow orchestration
- [`.claude/PROJECT_CONTEXT.md`](.claude/PROJECT_CONTEXT.md) - Current project status
- [`.claude/README.md`](.claude/README.md) - Automation system docs
- [`CLAUDE.md`](CLAUDE.md) - Quick reference guide
- [`product_vision.md`](product_vision.md) - Product vision and assumptions

## =¡ Tips for Success

1. **Start with Product Manager** for new features - ensures clear requirements
2. **Don't skip Engineering Manager** - catches issues before implementation
3. **Always run Testing Agent** - quality gate before user validation
4. **Use User Simulation Agent** - validates product assumptions
5. **Iterate on feedback** - use bug fix and UX feedback loops

## =€ Current Project Status

**Phase:** Core recommendation engine prototype
**Active Agents:** All available
**Priority:** Recommendation quality and observability

Ready to build with the agent system! See [`CLAUDE.md`](CLAUDE.md) for quick reference commands.
