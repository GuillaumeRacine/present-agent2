/**
 * Feedback Collection Service
 *
 * Captures user feedback and routes it to the Learning agent
 * to improve future recommendations.
 */

import { Driver } from 'neo4j-driver';
import { logger } from '../lib/logger.js';
import type { FeedbackSignal } from '../types/recipient.js';
import { RecipientLearner } from './agents/recipient-learner.js';

export class FeedbackCollector {
  private recipientLearner: RecipientLearner;

  constructor(private neo4j: Driver) {
    this.recipientLearner = new RecipientLearner(neo4j);
  }

  /**
   * Collect explicit feedback (user directly tells us)
   */
  async collectExplicitFeedback(feedback: {
    recommendation_id: string;
    user_id: string;
    recipient_id: string;
    product_id: string;
    action: 'loved' | 'liked' | 'neutral' | 'disliked' | 'hated';
    reason?: string;
    purchased: boolean;
    actually_gifted?: boolean;
    recipient_reaction?: 'loved' | 'liked' | 'neutral' | 'disappointed';
    would_gift_again: boolean;
  }): Promise<void> {
    const signal: FeedbackSignal = {
      recommendation_id: feedback.recommendation_id,
      user_id: feedback.user_id,
      recipient_id: feedback.recipient_id,
      timestamp: new Date(),
      explicit: feedback,
    };

    await this.processFeedback(signal);
    logger.info('Explicit feedback collected', {
      product_id: feedback.product_id,
      action: feedback.action,
      purchased: feedback.purchased,
    });
  }

  /**
   * Collect implicit feedback (observe user behavior)
   */
  async collectImplicitFeedback(feedback: {
    recommendation_id: string;
    user_id: string;
    recipient_id: string;
    viewed_products: string[];
    clicked_through: string[];
    time_spent: Array<{ product_id: string; seconds: number }>;
    refined_search: boolean;
  }): Promise<void> {
    const signal: FeedbackSignal = {
      recommendation_id: feedback.recommendation_id,
      user_id: feedback.user_id,
      recipient_id: feedback.recipient_id,
      timestamp: new Date(),
      implicit: {
        viewed_products: feedback.viewed_products,
        clicked_through: feedback.clicked_through,
        time_spent: feedback.time_spent,
        scroll_depth: 0,
        refined_search: feedback.refined_search,
        asked_clarifying_questions: [],
      },
    };

    await this.processFeedback(signal);
    logger.info('Implicit feedback collected', {
      viewed: feedback.viewed_products.length,
      clicked: feedback.clicked_through.length,
    });
  }

  /**
   * Batch collect feedback from CLI interactions
   */
  async collectCLIFeedback(feedback: {
    recommendation_id: string;
    user_id: string;
    recipient_id: string;
    selected_product?: string;
    viewed_details: string[];
    asked_for_alternatives: boolean;
  }): Promise<void> {
    const session = this.neo4j.session();

    try {
      // Record the interaction
      await session.run(
        `
        CREATE (fb:Feedback {
          id: randomUUID(),
          recommendation_id: $recommendation_id,
          user_id: $user_id,
          recipient_id: $recipient_id,
          timestamp: datetime(),
          selected_product: $selected_product,
          viewed_count: $viewed_count,
          asked_for_alternatives: $asked_for_alternatives
        })
        `,
        {
          recommendation_id: feedback.recommendation_id,
          user_id: feedback.user_id,
          recipient_id: feedback.recipient_id,
          selected_product: feedback.selected_product || null,
          viewed_count: feedback.viewed_details.length,
          asked_for_alternatives: feedback.asked_for_alternatives,
        }
      );

      // If user selected a product, that's positive signal
      if (feedback.selected_product) {
        const signal: FeedbackSignal = {
          recommendation_id: feedback.recommendation_id,
          user_id: feedback.user_id,
          recipient_id: feedback.recipient_id,
          timestamp: new Date(),
          explicit: {
            product_id: feedback.selected_product,
            action: 'liked',
            purchased: false, // Don't know yet
            would_gift_again: true,
          },
        };

        await this.recipientLearner.processFeedback(signal);
      }

      logger.info('CLI feedback collected', {
        selected: !!feedback.selected_product,
        viewed: feedback.viewed_details.length,
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Process feedback signal and update learning systems
   */
  private async processFeedback(signal: FeedbackSignal): Promise<void> {
    const session = this.neo4j.session();

    try {
      // Store the feedback signal in database
      await session.run(
        `
        CREATE (fs:FeedbackSignal {
          id: randomUUID(),
          recommendation_id: $recommendation_id,
          user_id: $user_id,
          recipient_id: $recipient_id,
          timestamp: datetime(),
          type: $type,
          data: $data
        })
        `,
        {
          recommendation_id: signal.recommendation_id,
          user_id: signal.user_id,
          recipient_id: signal.recipient_id,
          type: signal.explicit ? 'explicit' : 'implicit',
          data: JSON.stringify(signal.explicit || signal.implicit),
        }
      );

      // Route to RecipientLearner to update profiles
      await this.recipientLearner.processFeedback(signal);

      logger.info('Feedback processed and learning updated', {
        recommendation_id: signal.recommendation_id,
        type: signal.explicit ? 'explicit' : 'implicit',
      });
    } catch (error) {
      logger.error('Failed to process feedback', { error, signal });
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Get feedback statistics for a recipient
   */
  async getRecipientFeedbackStats(recipientId: string): Promise<{
    total_feedbacks: number;
    positive_feedbacks: number;
    negative_feedbacks: number;
    purchased_count: number;
    avg_satisfaction: number;
  }> {
    const session = this.neo4j.session();

    try {
      const result = await session.run(
        `
        MATCH (fs:FeedbackSignal {recipient_id: $recipientId})
        WITH fs,
          CASE
            WHEN fs.data CONTAINS 'loved' OR fs.data CONTAINS 'liked' THEN 1
            ELSE 0
          END AS is_positive,
          CASE
            WHEN fs.data CONTAINS 'disliked' OR fs.data CONTAINS 'hated' THEN 1
            ELSE 0
          END AS is_negative,
          CASE
            WHEN fs.data CONTAINS '"purchased":true' THEN 1
            ELSE 0
          END AS is_purchased
        RETURN
          COUNT(fs) AS total,
          SUM(is_positive) AS positive,
          SUM(is_negative) AS negative,
          SUM(is_purchased) AS purchased,
          AVG(is_positive * 1.0) AS satisfaction
        `,
        { recipientId }
      );

      if (result.records.length === 0) {
        return {
          total_feedbacks: 0,
          positive_feedbacks: 0,
          negative_feedbacks: 0,
          purchased_count: 0,
          avg_satisfaction: 0,
        };
      }

      const record = result.records[0];
      return {
        total_feedbacks: record.get('total').toNumber(),
        positive_feedbacks: record.get('positive').toNumber(),
        negative_feedbacks: record.get('negative').toNumber(),
        purchased_count: record.get('purchased').toNumber(),
        avg_satisfaction: record.get('satisfaction'),
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Export feedback data for analysis
   */
  async exportFeedbackData(userId: string): Promise<any[]> {
    const session = this.neo4j.session();

    try {
      const result = await session.run(
        `
        MATCH (fs:FeedbackSignal {user_id: $userId})
        RETURN fs {
          .id,
          .recommendation_id,
          .recipient_id,
          .timestamp,
          .type,
          .data
        } AS feedback
        ORDER BY fs.timestamp DESC
        LIMIT 1000
        `,
        { userId }
      );

      return result.records.map((record) => {
        const feedback = record.get('feedback');
        return {
          ...feedback,
          data: JSON.parse(feedback.data),
        };
      });
    } finally {
      await session.close();
    }
  }
}

/**
 * Factory function to create feedback collector
 */
export function createFeedbackCollector(neo4j: Driver): FeedbackCollector {
  return new FeedbackCollector(neo4j);
}
