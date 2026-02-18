/**
 * Quality Tracker Service
 *
 * Persists Bar Raiser quality records to Neo4j and provides
 * trending/aggregation queries for monitoring quality over time.
 */

import { Driver } from 'neo4j-driver';
import crypto from 'crypto';
import {
  QualityRecord,
  QualityTrend,
  QualityScorecard,
  BarRaiserOutput,
} from '../types/bar-raiser';
import { logger } from '../lib/logger';

export class QualityTracker {
  constructor(private neo4jDriver: Driver) {}

  /**
   * Persist a quality record to Neo4j
   */
  async persistQualityRecord(record: QualityRecord): Promise<void> {
    const session = this.neo4jDriver.session();

    try {
      await session.run(
        `
        CREATE (qr:QualityRecord {
          id: $id,
          sessionId: $sessionId,
          userQuery: $userQuery,
          timestamp: datetime($timestamp),
          verdict: $verdict,
          overallScore: $overallScore,
          relevanceScore: $relevanceScore,
          personalizationScore: $personalizationScore,
          storytellingScore: $storytellingScore,
          diversityScore: $diversityScore,
          humanSanityScore: $humanSanityScore,
          budgetAdherenceScore: $budgetAdherenceScore,
          interestCoverageScore: $interestCoverageScore,
          presentationCohesionScore: $presentationCohesionScore,
          attemptsUsed: $attemptsUsed,
          thresholdsLowered: $thresholdsLowered,
          recommendationCount: $recommendationCount,
          criticalFailures: $criticalFailures,
          agentScores: $agentScores
        })
        `,
        {
          id: record.id,
          sessionId: record.sessionId,
          userQuery: record.userQuery,
          timestamp: record.timestamp.toISOString(),
          verdict: record.verdict,
          overallScore: record.overallScore,
          relevanceScore: record.relevanceScore,
          personalizationScore: record.personalizationScore,
          storytellingScore: record.storytellingScore,
          diversityScore: record.diversityScore,
          humanSanityScore: record.humanSanityScore,
          budgetAdherenceScore: record.budgetAdherenceScore,
          interestCoverageScore: record.interestCoverageScore,
          presentationCohesionScore: record.presentationCohesionScore,
          attemptsUsed: record.attemptsUsed,
          thresholdsLowered: record.thresholdsLowered,
          recommendationCount: record.recommendationCount,
          criticalFailures: record.criticalFailures,
          agentScores: JSON.stringify(record.agentScores),
        }
      );

      logger.info('QualityTracker: Record persisted', {
        id: record.id,
        verdict: record.verdict,
        overallScore: record.overallScore,
      });
    } catch (error) {
      logger.error('QualityTracker: Failed to persist record', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Build a QualityRecord from BarRaiserOutput
   */
  buildQualityRecord(
    barRaiserOutput: BarRaiserOutput,
    sessionId: string,
    userQuery: string,
    attemptsUsed: number,
    thresholdsLowered: boolean,
    recommendationCount: number
  ): QualityRecord {
    const sc = barRaiserOutput.scorecard;

    const agentScores: Record<string, number> = {};
    for (const eval_ of barRaiserOutput.agentEvaluations) {
      agentScores[eval_.agentName] = eval_.rating;
    }

    return {
      id: crypto.randomUUID(),
      sessionId,
      userQuery,
      timestamp: new Date(),
      verdict: barRaiserOutput.verdict,
      overallScore: barRaiserOutput.overallScore,
      relevanceScore: sc.relevance.score,
      personalizationScore: sc.personalization.score,
      storytellingScore: sc.storytellingQuality.score,
      diversityScore: sc.diversity.score,
      humanSanityScore: sc.humanSanityCheck.score,
      budgetAdherenceScore: sc.budgetAdherence.score,
      interestCoverageScore: sc.interestCoverage.score,
      presentationCohesionScore: sc.presentationCohesion.score,
      attemptsUsed,
      thresholdsLowered,
      recommendationCount,
      criticalFailures: barRaiserOutput.criticalFailures,
      agentScores,
    };
  }

  /**
   * Get quality trend for a time period
   */
  async getQualityTrend(period: string = 'last_day'): Promise<QualityTrend> {
    const session = this.neo4jDriver.session();

    try {
      // Calculate time filter
      const timeFilter = this.getTimeFilter(period);

      const result = await session.run(
        `
        MATCH (qr:QualityRecord)
        WHERE qr.timestamp >= datetime($since)

        WITH count(qr) AS totalSessions,
          avg(qr.overallScore) AS avgOverall,
          avg(qr.relevanceScore) AS avgRelevance,
          avg(qr.personalizationScore) AS avgPersonalization,
          avg(qr.storytellingScore) AS avgStorytelling,
          avg(qr.diversityScore) AS avgDiversity,
          avg(qr.humanSanityScore) AS avgHumanSanity,
          avg(qr.budgetAdherenceScore) AS avgBudgetAdherence,
          avg(qr.interestCoverageScore) AS avgInterestCoverage,
          avg(qr.presentationCohesionScore) AS avgPresentationCohesion,
          avg(qr.attemptsUsed) AS avgAttempts,
          sum(CASE WHEN qr.thresholdsLowered THEN 1 ELSE 0 END) AS thresholdLoweredCount,
          sum(CASE WHEN qr.verdict = 'APPROVED' THEN 1 ELSE 0 END) AS approvedCount,
          sum(CASE WHEN qr.verdict = 'REJECTED' THEN 1 ELSE 0 END) AS rejectedCount,
          sum(CASE WHEN qr.verdict = 'APPROVED_WITH_CONCERNS' THEN 1 ELSE 0 END) AS concernsCount,
          collect(qr.criticalFailures) AS allFailures,
          collect(qr.agentScores) AS allAgentScores

        RETURN totalSessions, avgOverall, avgRelevance, avgPersonalization,
          avgStorytelling, avgDiversity, avgHumanSanity, avgBudgetAdherence,
          avgInterestCoverage, avgPresentationCohesion, avgAttempts,
          thresholdLoweredCount, approvedCount, rejectedCount, concernsCount,
          allFailures, allAgentScores
        `,
        { since: timeFilter }
      );

      if (result.records.length === 0 || result.records[0].get('totalSessions') === 0) {
        return this.emptyTrend(period);
      }

      const record = result.records[0];
      const totalSessions = this.toNumber(record.get('totalSessions'));

      // Count failure reasons
      const allFailures: string[][] = record.get('allFailures') || [];
      const failureCount = new Map<string, number>();
      for (const failures of allFailures) {
        if (Array.isArray(failures)) {
          for (const failure of failures) {
            const reason = failure.split(':')[0];
            failureCount.set(reason, (failureCount.get(reason) || 0) + 1);
          }
        }
      }
      const topFailureReasons = Array.from(failureCount.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        period,
        totalSessions,
        approvalRate: totalSessions > 0 ? this.toNumber(record.get('approvedCount')) / totalSessions : 0,
        rejectedRate: totalSessions > 0 ? this.toNumber(record.get('rejectedCount')) / totalSessions : 0,
        concernsRate: totalSessions > 0 ? this.toNumber(record.get('concernsCount')) / totalSessions : 0,
        avgScores: {
          overall: this.toNumber(record.get('avgOverall')),
          relevance: this.toNumber(record.get('avgRelevance')),
          personalization: this.toNumber(record.get('avgPersonalization')),
          storytelling: this.toNumber(record.get('avgStorytelling')),
          diversity: this.toNumber(record.get('avgDiversity')),
          humanSanity: this.toNumber(record.get('avgHumanSanity')),
          budgetAdherence: this.toNumber(record.get('avgBudgetAdherence')),
          interestCoverage: this.toNumber(record.get('avgInterestCoverage')),
          presentationCohesion: this.toNumber(record.get('avgPresentationCohesion')),
        },
        topFailureReasons,
        agentPerformance: this.aggregateAgentPerformance(result),
        avgAttempts: this.toNumber(record.get('avgAttempts')),
        thresholdLoweringRate:
          totalSessions > 0
            ? this.toNumber(record.get('thresholdLoweredCount')) / totalSessions
            : 0,
      };
    } catch (error) {
      logger.error('QualityTracker: Failed to get trend', {
        error: error instanceof Error ? error.message : String(error),
      });
      return this.emptyTrend(period);
    } finally {
      await session.close();
    }
  }

  /**
   * Get scorecard for a specific session
   */
  async getSessionScorecard(
    sessionId: string
  ): Promise<QualityRecord | null> {
    const session = this.neo4jDriver.session();

    try {
      const result = await session.run(
        `
        MATCH (qr:QualityRecord {sessionId: $sessionId})
        RETURN qr
        ORDER BY qr.timestamp DESC
        LIMIT 1
        `,
        { sessionId }
      );

      if (result.records.length === 0) {
        return null;
      }

      const props = result.records[0].get('qr').properties;
      return {
        id: props.id,
        sessionId: props.sessionId,
        userQuery: props.userQuery,
        timestamp: new Date(props.timestamp),
        verdict: props.verdict,
        overallScore: props.overallScore,
        relevanceScore: props.relevanceScore,
        personalizationScore: props.personalizationScore,
        storytellingScore: props.storytellingScore,
        diversityScore: props.diversityScore,
        humanSanityScore: props.humanSanityScore,
        budgetAdherenceScore: props.budgetAdherenceScore,
        interestCoverageScore: props.interestCoverageScore,
        presentationCohesionScore: props.presentationCohesionScore,
        attemptsUsed: props.attemptsUsed,
        thresholdsLowered: props.thresholdsLowered,
        recommendationCount: props.recommendationCount,
        criticalFailures: props.criticalFailures || [],
        agentScores: props.agentScores ? JSON.parse(props.agentScores) : {},
      };
    } catch (error) {
      logger.error('QualityTracker: Failed to get session scorecard', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    } finally {
      await session.close();
    }
  }

  /**
   * Aggregate per-agent scores from collected agentScores JSON strings
   */
  private aggregateAgentPerformance(
    result: any
  ): Record<string, { avgScore: number; avgInfoPreservation: number }> {
    const agentPerformance: Record<string, { avgScore: number; avgInfoPreservation: number }> = {};
    try {
      const allAgentScores: string[] = result.records[0]?.get('allAgentScores') || [];
      const agentTotals = new Map<string, { sum: number; count: number }>();

      for (const scoresJson of allAgentScores) {
        if (!scoresJson) continue;
        try {
          const scores: Record<string, number> = JSON.parse(scoresJson);
          for (const [agent, score] of Object.entries(scores)) {
            const existing = agentTotals.get(agent) || { sum: 0, count: 0 };
            existing.sum += score;
            existing.count += 1;
            agentTotals.set(agent, existing);
          }
        } catch {
          // Skip malformed JSON
        }
      }

      for (const [agent, { sum, count }] of agentTotals.entries()) {
        agentPerformance[agent] = {
          avgScore: Math.round((sum / count) * 100) / 100,
          avgInfoPreservation: 0, // Not tracked per-agent yet
        };
      }
    } catch {
      // Return empty object on any failure
    }
    return agentPerformance;
  }

  /**
   * Convert time period to ISO datetime string
   */
  private getTimeFilter(period: string): string {
    const now = new Date();
    switch (period) {
      case 'last_hour':
        return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      case 'last_day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case 'last_week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'last_month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case 'all_time':
        return new Date(0).toISOString();
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    }
  }

  private emptyTrend(period: string): QualityTrend {
    return {
      period,
      totalSessions: 0,
      approvalRate: 0,
      rejectedRate: 0,
      concernsRate: 0,
      avgScores: {
        overall: 0,
        relevance: 0,
        personalization: 0,
        storytelling: 0,
        diversity: 0,
        humanSanity: 0,
        budgetAdherence: 0,
        interestCoverage: 0,
        presentationCohesion: 0,
      },
      topFailureReasons: [],
      agentPerformance: {},
      avgAttempts: 0,
      thresholdLoweringRate: 0,
    };
  }

  private toNumber(val: any): number {
    if (typeof val === 'number') return val;
    if (val?.toNumber) return val.toNumber();
    if (val?.low !== undefined) return val.low;
    return Number(val) || 0;
  }
}
