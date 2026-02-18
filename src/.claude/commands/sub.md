---
description: "Build a feature using the full multi-agent workflow (Product Manager → Tickets → Engineering Manager → Architect → Testing → User Simulator)"
---

# Full Multi-Agent Workflow

Build the following feature using the complete agent workflow:

**Feature/Task**: {{prompt}}

## Workflow Execution Plan

Execute the following agents in sequence:

### Phase 1: Product & Design
**Use the product-manager agent** to:
- Research best practices and existing solutions
- Validate product assumptions from `product_vision.md`
- Create a detailed feature specification
- Define acceptance criteria and success metrics
- Document user flows and edge cases

### Phase 2: Project Management
**Use the tickets-manager agent** to:
- Convert the spec into GitHub issues
- Break down into smaller, actionable tasks
- Set appropriate labels, milestones, and priorities
- Link dependencies between issues

### Phase 3: Technical Review
**Use the engineering-manager agent** to:
- Review the technical approach
- Add architecture guidance and patterns
- Define interfaces and contracts
- Specify logging and testing requirements
- Raise the quality bar

### Phase 4: Implementation
**Use the architect agent** to:
- Implement the feature following TypeScript best practices
- Add comprehensive logging and error handling
- Write unit tests for all components
- Follow project patterns and conventions
- Document the code thoroughly

### Phase 5: Quality Assurance
**Use the testing-agent** to:
- Run all unit and integration tests
- Test edge cases and error scenarios
- Verify logging and observability
- Find and report any bugs
- Validate acceptance criteria

### Phase 6: User Validation
**Use the user-simulator agent** to:
- Test with realistic personas
- Validate the user experience
- Measure success metrics
- Provide UX feedback
- Verify product assumptions

## Quality Gates

Each phase must complete successfully before moving to the next:

- ✅ Product Manager: Clear spec with acceptance criteria
- ✅ Tickets Manager: Well-defined GitHub issues
- ✅ Engineering Manager: Technical approach validated
- ✅ Architect: Code implemented with tests
- ✅ Testing Agent: All tests passing, no critical bugs
- ✅ User Simulator: UX validated, metrics measured

## Expected Outcome

By the end of this workflow, you should have:

1. **Feature Specification** - Clear requirements and user flows
2. **GitHub Issues** - Trackable, prioritized tasks
3. **Technical Design** - Architecture guidance and patterns
4. **Implementation** - Production-ready code with tests
5. **Test Results** - Comprehensive QA report
6. **UX Validation** - Real-world persona testing

## Instructions for Claude

- Execute each agent phase sequentially
- Wait for each phase to complete before starting the next
- If any agent identifies blockers or concerns, pause and report to the user
- Track progress using the TodoWrite tool
- Provide a summary after each phase
- At the end, provide a complete summary of all work done

Begin with the Product Manager agent and proceed through all phases.
