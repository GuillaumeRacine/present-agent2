# Guides & Runbooks

Complete guides for development, testing, deployment, and operations.

---

## Quick Reference

| Guide | Purpose | Use When |
|-------|---------|----------|
| [QUICKSTART](../QUICKSTART.md) | Get running in 5 minutes | First time setup |
| [USER_TESTING_GUIDE](USER_TESTING_GUIDE.md) | Test recommendations manually | Validating quality |
| [ENRICHMENT_QUICK_START](../ENRICHMENT_QUICK_START.md) | Data enrichment overview | Improving data coverage |

---

## Development Guides

### Getting Started
- **[QUICKSTART.md](../QUICKSTART.md)** - Get the system running in 5 minutes
  - One-command setup
  - Environment configuration
  - First queries to try

### Conversation System
- **[DIALOGUE_MANAGER_QUICKSTART.md](DIALOGUE_MANAGER_QUICKSTART.md)** - Conversation system setup and usage
  - Multi-turn dialogue
  - Context management
  - Conversation persistence

### Data Ingestion & Enrichment
- **[CUSTOMIZABLE_SOURCES_AND_INGESTION.md](CUSTOMIZABLE_SOURCES_AND_INGESTION.md)** - Product data ingestion framework
  - CSV/JSON import
  - Custom data sources
  - Validation rules

- **[EXPERIENCE_SOURCES_AND_INGESTION.md](EXPERIENCE_SOURCES_AND_INGESTION.md)** - Experience data ingestion
  - Gift experiences vs physical products
  - Experience-specific attributes
  - Ingestion pipeline

- **[NEXT_PRODUCT_INGESTION_PLAN.md](NEXT_PRODUCT_INGESTION_PLAN.md)** - Future ingestion improvements
  - Planned enhancements
  - Architecture improvements
  - Roadmap

- **[COMPLETE_ATTRIBUTE_POPULATION_GUIDE.md](COMPLETE_ATTRIBUTE_POPULATION_GUIDE.md)** - Comprehensive attribute enrichment
  - 100-attribute system
  - LLM-based inference
  - Batch processing
  - Cost optimization

---

## Testing Guides

### Automated Testing
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Comprehensive testing strategies
  - Unit tests
  - Integration tests
  - Test organization
  - Best practices

- **[TESTING_GUIDE_E2E.md](TESTING_GUIDE_E2E.md)** - End-to-end testing
  - Full system tests
  - User flow validation
  - Scenario coverage

### Persona Testing
- **[PERSONA_TESTING_FRAMEWORK.md](PERSONA_TESTING_FRAMEWORK.md)** - Automated persona testing
  - Test with realistic users
  - Diverse scenarios
  - Quality metrics
  - Creating custom personas

### Manual Testing
- **[USER_TESTING_GUIDE.md](USER_TESTING_GUIDE.md)** - Manual testing procedures
  - Testing checklist
  - Quality evaluation
  - Reporting issues

---

## Deployment & Operations

### Deployment
- **[BATCHED_DEPLOYMENT.md](BATCHED_DEPLOYMENT.md)** - Gradual rollout strategy
  - Phased deployment
  - Risk mitigation
  - Rollback procedures

### Monitoring
- **[MONITORING.md](MONITORING.md)** - System monitoring and observability
  - Metrics to track
  - Alert setup
  - Performance monitoring
  - Health checks

---

## Related Documentation

### Core Documentation
- **[Architecture](../ARCHITECTURE.md)** - System design overview
- **[API Documentation](../API.md)** - API reference
- **[Frontend Guide](../FRONTEND_GUIDE.md)** - Frontend development

### Operational Runbooks
- **[Runbooks Directory](../runbooks/)** - Step-by-step operational procedures
  - Product ingestion
  - Data enrichment
  - System maintenance

### Reports
- **[Reports Directory](../reports/)** - System analysis and validation reports
  - Performance metrics
  - Quality assessments
  - Data status

---

## Quick Commands

```bash
# Development
npm run dev                          # Start full stack
npm run chat                         # CLI chat interface

# Testing
npm run test:personas:quick          # Quick persona test
npm run test                         # Full test suite

# Data Operations
npm run env:check                    # Verify environment
npm run setup:schema                 # Initialize database
npm run ingest:products              # Load product data

# Enrichment
./scripts/monitor-enrichment.sh      # Monitor enrichment progress
npx tsx scripts/analyze-product-stats.ts  # Database statistics
```

---

**Navigation**: [Back to Documentation Hub](../README.md) | [Main README](../../README.md)

**Last Updated**: December 8, 2025
