/**
 * Persona Test Report Generator
 *
 * Generates comprehensive, readable reports from persona test results
 */

import {
  BatchTestResults,
  BatchTestConfig,
  PersonaTestResult,
  AggregateMetrics,
  TestInsights,
  PrioritizedImprovement,
} from '../types/persona';
import { getPersonaById } from './personas/test-personas';
import fs from 'fs/promises';
import path from 'path';

export class PersonaReportGenerator {
  /**
   * Generate full markdown report
   */
  async generateReport(
    results: BatchTestResults,
    outputPath: string
  ): Promise<void> {
    const report = this.buildMarkdownReport(results);
    await fs.writeFile(outputPath, report);
  }

  /**
   * Build markdown report
   */
  private buildMarkdownReport(results: BatchTestResults): string {
    const { config, results: testResults, aggregateMetrics, insights } = results;

    let md = '';

    // Header
    md += this.buildHeader(config, aggregateMetrics);

    // Executive Summary
    md += this.buildExecutiveSummary(aggregateMetrics, insights);

    // Detailed Metrics
    md += this.buildDetailedMetrics(aggregateMetrics);

    // Key Insights
    md += this.buildInsights(insights);

    // Per-Persona Analysis
    md += this.buildPerPersonaAnalysis(testResults);

    // Recommendations
    md += this.buildRecommendations(insights);

    // Appendix: Individual Test Results
    md += this.buildTestResultsAppendix(testResults);

    return md;
  }

  /**
   * Build header section
   */
  private buildHeader(config: BatchTestConfig, metrics: AggregateMetrics): string {
    return `# Persona Test Report
**Run ID**: ${config.runId}
**Date**: ${config.timestamp.toISOString()}
**Total Tests**: ${metrics.totalTests}
**Success Rate**: ${(metrics.successRate * 100).toFixed(1)}%

---

`;
  }

  /**
   * Build executive summary
   */
  private buildExecutiveSummary(
    metrics: AggregateMetrics,
    insights: TestInsights
  ): string {
    const status = this.getOverallStatus(metrics, insights);

    return `## 📊 Executive Summary

**Overall Status**: ${status}

### Key Metrics
| Metric | Score | Status |
|--------|-------|--------|
| **Relevance** | ${metrics.avgRelevanceScore.toFixed(1)}/10 | ${this.getStatusEmoji(metrics.avgRelevanceScore)} |
| **Personalization** | ${metrics.avgPersonalizationScore.toFixed(1)}/10 | ${this.getStatusEmoji(metrics.avgPersonalizationScore)} |
| **UX Quality** | ${metrics.avgUXScore.toFixed(1)}/10 | ${this.getStatusEmoji(metrics.avgUXScore)} |
| **Success Rate** | ${(metrics.successRate * 100).toFixed(1)}% | ${this.getStatusEmoji(metrics.successRate * 10)} |
| **Response Time** | ${(metrics.avgResponseTime / 1000).toFixed(1)}s | ${this.getResponseTimeStatus(metrics.avgResponseTime)} |

### Quality Indicators
- **Interest Match Accuracy**: ${(metrics.interestMatchRate * 100).toFixed(0)}%
- **Budget Adherence**: ${(metrics.budgetAdherenceRate * 100).toFixed(0)}%
- **Diversity Score**: ${(metrics.diversityScore * 100).toFixed(0)}%

### Critical Issues
${insights.criticalIssues.length > 0 ? insights.criticalIssues.map((i) => `- ⚠️ ${i}`).join('\n') : '_None identified_'}

---

`;
  }

  /**
   * Build detailed metrics section
   */
  private buildDetailedMetrics(metrics: AggregateMetrics): string {
    let md = `## 📈 Detailed Metrics

### By Persona Type
| Persona ID | Tests | Relevance | Personalization | UX | Success Rate |
|------------|-------|-----------|-----------------|----|--------------|\n`;

    for (const [personaId, summary] of Object.entries(metrics.byPersonaType)) {
      const persona = getPersonaById(personaId);
      md += `| ${persona?.name || personaId} | ${summary.count} | ${summary.avgRelevance.toFixed(1)} | ${summary.avgPersonalization.toFixed(1)} | ${summary.avgUX.toFixed(1)} | ${(summary.successRate * 100).toFixed(0)}% |\n`;
    }

    md += '\n### By Occasion Type\n';
    md += '| Occasion | Tests | Relevance | Personalization | UX | Success Rate |\n';
    md += '|----------|-------|-----------|-----------------|----|--------------|\n';

    for (const [occasion, summary] of Object.entries(metrics.byOccasionType)) {
      md += `| ${occasion} | ${summary.count} | ${summary.avgRelevance.toFixed(1)} | ${summary.avgPersonalization.toFixed(1)} | ${summary.avgUX.toFixed(1)} | ${(summary.successRate * 100).toFixed(0)}% |\n`;
    }

    md += '\n### By Budget Range\n';
    md += '| Budget | Tests | Relevance | Personalization | UX | Success Rate |\n';
    md += '|--------|-------|-----------|-----------------|----|--------------|\n';

    for (const [budget, summary] of Object.entries(metrics.byBudgetRange)) {
      md += `| ${budget} | ${summary.count} | ${summary.avgRelevance.toFixed(1)} | ${summary.avgPersonalization.toFixed(1)} | ${summary.avgUX.toFixed(1)} | ${(summary.successRate * 100).toFixed(0)}% |\n`;
    }

    md += '\n---\n\n';

    return md;
  }

  /**
   * Build insights section
   */
  private buildInsights(insights: TestInsights): string {
    let md = `## 💡 Key Insights

### ✅ Strengths
${insights.strengths.length > 0 ? insights.strengths.map((s) => `- ${s}`).join('\n') : '_None identified yet_'}

### ⚠️ Weaknesses
${insights.weaknesses.length > 0 ? insights.weaknesses.map((w) => `- ${w}`).join('\n') : '_None identified_'}

### 🎯 Opportunities
${insights.opportunities.length > 0 ? insights.opportunities.map((o) => `- ${o}`).join('\n') : '_None identified_'}

---

`;

    return md;
  }

  /**
   * Build per-persona analysis
   */
  private buildPerPersonaAnalysis(testResults: PersonaTestResult[]): string {
    let md = `## 👥 Per-Persona Analysis

`;

    // Group by persona
    const byPersona: Record<string, PersonaTestResult[]> = {};
    for (const result of testResults) {
      if (!byPersona[result.personaId]) {
        byPersona[result.personaId] = [];
      }
      byPersona[result.personaId].push(result);
    }

    for (const [personaId, results] of Object.entries(byPersona)) {
      const persona = getPersonaById(personaId);
      if (!persona) continue;

      const avgRelevance =
        results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length;
      const avgPersonalization =
        results.reduce((sum, r) => sum + r.personalizationScore, 0) / results.length;
      const meetsExpectations = results.every((r) => r.meetsExpectations);

      md += `### ${persona.name} (${personaId})

**Profile**: ${persona.demographics.age}yo ${persona.demographics.occupation}, ${persona.giftGivingStyle.planningStyle} planner
**Tests Run**: ${results.length}
**Meets Expectations**: ${meetsExpectations ? '✅ Yes' : '❌ No'}

**Scores**:
- Relevance: ${avgRelevance.toFixed(1)}/10
- Personalization: ${avgPersonalization.toFixed(1)}/10

**What Worked**:
${results[0].whatWorked.length > 0 ? results[0].whatWorked.map((w) => `- ${w}`).join('\n') : '- Nothing specific'}

**What Didn't Work**:
${results[0].whatDidntWork.length > 0 ? results[0].whatDidntWork.map((w) => `- ${w}`).join('\n') : '- Nothing specific'}

**Suggestions**:
${results[0].suggestions.length > 0 ? results[0].suggestions.map((s) => `- ${s}`).join('\n') : '- None'}

---

`;
    }

    return md;
  }

  /**
   * Build recommendations section
   */
  private buildRecommendations(insights: TestInsights): string {
    let md = `## 🚀 Prioritized Improvements

`;

    if (insights.prioritizedImprovements.length === 0) {
      md += '_No improvements needed - system performing well!_\n\n';
      return md;
    }

    for (const improvement of insights.prioritizedImprovements) {
      md += `### ${improvement.priority}. ${improvement.issue}

**Area**: ${improvement.area}
**Impact**: ${improvement.impact.toUpperCase()}
**Effort**: ${improvement.effort}
**Affected Personas**: ${improvement.affectedPersonas.join(', ')}

**Suggested Solution**:
${improvement.suggestedSolution}

---

`;
    }

    return md;
  }

  /**
   * Build appendix with individual test results
   */
  private buildTestResultsAppendix(testResults: PersonaTestResult[]): string {
    let md = `## 📋 Appendix: Individual Test Results

`;

    for (const result of testResults) {
      const persona = getPersonaById(result.personaId);

      md += `### Test: ${persona?.name || result.personaId} - ${result.scenarioId}

**Query**: "${result.generatedQuery}"

**Scores**: Relevance ${result.relevanceScore}/10, Personalization ${result.personalizationScore}/10, UX ${result.uxScore}/10
**Meets Expectations**: ${result.meetsExpectations ? '✅' : '❌'}
**Response Time**: ${(result.responseTime / 1000).toFixed(1)}s

**Recommendations Received**: ${result.recommendations.length}
${result.recommendations
  .slice(0, 3)
  .map(
    (rec) =>
      `- ${rec.product.name} ($${rec.product.price.toFixed(2)}) - Relevance: ${rec.perceivedRelevance}/10 ${rec.wouldConsider ? '✅' : '❌'}`
  )
  .join('\n')}

---

`;
    }

    return md;
  }

  /**
   * Generate JSON summary report
   */
  async generateJSONSummary(
    results: BatchTestResults,
    outputPath: string
  ): Promise<void> {
    const summary = {
      runId: results.config.runId,
      timestamp: results.config.timestamp,
      metrics: {
        totalTests: results.aggregateMetrics.totalTests,
        avgRelevanceScore: results.aggregateMetrics.avgRelevanceScore,
        avgPersonalizationScore: results.aggregateMetrics.avgPersonalizationScore,
        avgUXScore: results.aggregateMetrics.avgUXScore,
        successRate: results.aggregateMetrics.successRate,
        avgResponseTime: results.aggregateMetrics.avgResponseTime,
      },
      insights: {
        strengthsCount: results.insights.strengths.length,
        weaknessesCount: results.insights.weaknesses.length,
        criticalIssuesCount: results.insights.criticalIssues.length,
        improvementsCount: results.insights.prioritizedImprovements.length,
      },
      topImprovements: results.insights.prioritizedImprovements.slice(0, 3),
    };

    await fs.writeFile(outputPath, JSON.stringify(summary, null, 2));
  }

  /**
   * Generate CSV export for further analysis
   */
  async generateCSV(results: BatchTestResults, outputPath: string): Promise<void> {
    const headers = [
      'persona_id',
      'persona_name',
      'scenario_id',
      'query',
      'relevance_score',
      'personalization_score',
      'ux_score',
      'meets_expectations',
      'response_time',
      'recommendations_count',
      'interest_match',
      'budget_adherence',
      'diversity',
    ].join(',');

    const rows = results.results.map((r) => {
      const persona = getPersonaById(r.personaId);
      return [
        r.personaId,
        persona?.name || 'unknown',
        r.scenarioId,
        `"${r.generatedQuery.replace(/"/g, '""')}"`,
        r.relevanceScore,
        r.personalizationScore,
        r.uxScore,
        r.meetsExpectations,
        r.responseTime,
        r.recommendations.length,
        r.metrics.interestMatchAccuracy,
        r.metrics.budgetAdherence,
        r.metrics.diversityScore,
      ].join(',');
    });

    const csv = [headers, ...rows].join('\n');
    await fs.writeFile(outputPath, csv);
  }

  // Helper methods
  private getOverallStatus(metrics: AggregateMetrics, insights: TestInsights): string {
    if (insights.criticalIssues && insights.criticalIssues.length > 0) {
      return '🔴 Critical Issues Detected';
    }
    if (metrics.avgRelevanceScore < 6.0 || metrics.successRate < 0.5) {
      return '🟡 Needs Improvement';
    }
    if (metrics.avgRelevanceScore > 7.5 && metrics.successRate > 0.75) {
      return '🟢 Performing Well';
    }
    return '🟡 Acceptable';
  }

  private getStatusEmoji(score: number): string {
    if (score >= 8.0) return '🟢 Excellent';
    if (score >= 7.0) return '🟢 Good';
    if (score >= 6.0) return '🟡 Acceptable';
    if (score >= 5.0) return '🟡 Needs Work';
    return '🔴 Poor';
  }

  private getResponseTimeStatus(ms: number): string {
    if (ms < 15000) return '🟢 Fast';
    if (ms < 25000) return '🟢 Good';
    if (ms < 35000) return '🟡 Acceptable';
    return '🔴 Slow';
  }
}

export function createPersonaReportGenerator(): PersonaReportGenerator {
  return new PersonaReportGenerator();
}
