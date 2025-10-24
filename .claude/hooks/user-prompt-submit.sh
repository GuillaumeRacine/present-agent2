#!/bin/bash

# This hook runs before every user prompt is submitted to Claude
# It provides automatic context about the project

# Check if this is a coding/building request
if echo "$PROMPT" | grep -iqE "(build|create|implement|add|write|code|develop|setup|configure)"; then
  echo "📋 Project Context Loaded"
  echo "See .claude/PROJECT_CONTEXT.md and .claude/agents/architect.md for guidelines"
  echo "Active todos guide current development phase"
fi

exit 0
