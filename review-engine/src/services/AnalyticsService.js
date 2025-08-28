/**
 * Analytics Service - User performance tracking and insights
 */

class AnalyticsService {
  constructor() {
    this.config = {
      // Performance thresholds
      EXCELLENT_QUALITY: 4.5,
      GOOD_QUALITY: 3.5,
      POOR_QUALITY: 2.5,
      
      // Retention targets
      TARGET_RETENTION: 0.85,
      CRITICAL_RETENTION: 0.6,
      
      // Streak thresholds
      GOOD_STREAK: 7,
      EXCELLENT_STREAK: 21,
      
      // Response time categories (in seconds)
      FAST_RESPONSE: 3,
      SLOW_RESPONSE: 15
    };
  }

  /**
   * Calculate comprehensive user performance metrics
   */
  calculateUserPerformance(cards, reviews, options = {}) {
    const {
      days = 30,
      includeProjections = true,
      currentTime = new Date()
    } = options;

    const startDate = new Date(currentTime.getTime() - days * 24 * 60 * 60 * 1000);
    
    // Filter recent reviews
    const recentReviews = reviews.filter(r => 
      new Date(r.reviewedAt) >= startDate && new Date(r.reviewedAt) <= currentTime
    );

    // Calculate basic statistics
    const basicStats = this._calculateBasicStats(cards, recentReviews);
    
    // Calculate performance trends
    const performanceTrends = this._calculatePerformanceTrends(recentReviews, days);
    
    // Calculate memory strength distribution
    const memoryDistribution = this._calculateMemoryDistribution(cards, currentTime);
    
    // Calculate learning efficiency
    const efficiency = this._calculateLearningEfficiency(cards, recentReviews);
    
    // Calculate retention forecast
    const retentionForecast = this._calculateRetentionForecast(cards, currentTime);
    
    // Generate insights and recommendations
    const insights = this._generateInsights(basicStats, performanceTrends, efficiency);
    
    const analytics = {
      userId: cards.length > 0 ? cards[0].userId : null,
      period: {
        days,
        start: startDate.getTime(),
        end: currentTime.getTime()
      },
      stats: basicStats,
      trends: performanceTrends,
      distribution: memoryDistribution,
      efficiency: efficiency,
      insights: insights,
      recommendations: this._generateRecommendations(basicStats, efficiency, insights)
    };

    if (includeProjections) {
      analytics.projections = {
        retentionForecast,
        expectedWorkload: this._calculateExpectedWorkload(cards, currentTime),
        masteryProjection: this._calculateMasteryProjection(cards, recentReviews)
      };
    }

    return analytics;
  }

  /**
   * Calculate basic performance statistics
   */
  _calculateBasicStats(cards, reviews) {
    const totalCards = cards.length;
    const totalReviews = reviews.length;
    
    // Card state distribution
    const stateDistribution = cards.reduce((acc, card) => {
      acc[card.learningState] = (acc[card.learningState] || 0) + 1;
      return acc;
    }, {});

    // Quality statistics
    const qualitySum = reviews.reduce((sum, r) => sum + r.quality, 0);
    const averageQuality = totalReviews > 0 ? qualitySum / totalReviews : 0;
    
    const qualityDistribution = reviews.reduce((acc, r) => {
      const qualityBucket = Math.floor(r.quality);
      acc[qualityBucket] = (acc[qualityBucket] || 0) + 1;
      return acc;
    }, {});

    // Correct answers (quality >= 3)
    const correctAnswers = reviews.filter(r => r.quality >= 3).length;
    const accuracy = totalReviews > 0 ? correctAnswers / totalReviews : 0;

    // Streak calculations
    const currentStreak = this._calculateCurrentStreak(reviews);
    const longestStreak = this._calculateLongestStreak(reviews);

    // Response time statistics
    const responseTimes = reviews.filter(r => r.responseTime > 0).map(r => r.responseTime);
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;

    return {
      totalCards,
      totalReviews,
      stateDistribution,
      averageQuality: Math.round(averageQuality * 100) / 100,
      accuracy: Math.round(accuracy * 100) / 100,
      qualityDistribution,
      currentStreak,
      longestStreak,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      masteredCards: stateDistribution.REVIEW || 0,
      learningCards: (stateDistribution.LEARNING || 0) + (stateDistribution.RELEARNING || 0),
      newCards: stateDistribution.NEW || 0
    };
  }

  /**
   * Calculate performance trends over time
   */
  _calculatePerformanceTrends(reviews, days) {
    const dailyStats = {};
    const now = new Date();

    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      dailyStats[dateKey] = {
        date: dateKey,
        reviews: 0,
        quality: 0,
        accuracy: 0,
        responseTime: 0,
        reviewCount: 0
      };
    }

    // Aggregate reviews by day
    reviews.forEach(review => {
      const date = new Date(review.reviewedAt).toISOString().split('T')[0];
      if (dailyStats[date]) {
        const stats = dailyStats[date];
        stats.reviews++;
        stats.quality += review.quality;
        stats.accuracy += review.quality >= 3 ? 1 : 0;
        if (review.responseTime > 0) {
          stats.responseTime += review.responseTime;
          stats.reviewCount++;
        }
      }
    });

    // Calculate averages
    Object.values(dailyStats).forEach(stats => {
      if (stats.reviews > 0) {
        stats.quality = Math.round((stats.quality / stats.reviews) * 100) / 100;
        stats.accuracy = Math.round((stats.accuracy / stats.reviews) * 100) / 100;
        stats.responseTime = stats.reviewCount > 0 
          ? Math.round((stats.responseTime / stats.reviewCount) * 100) / 100 
          : 0;
      }
    });

    return Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate memory strength distribution
   */
  _calculateMemoryDistribution(cards, currentTime) {
    const distribution = {
      strong: 0,      // > 0.8
      moderate: 0,    // 0.5 - 0.8
      weak: 0,        // 0.2 - 0.5
      critical: 0     // < 0.2
    };

    cards.forEach(card => {
      const currentStrength = card.calculateCurrentMemoryStrength(currentTime);
      
      if (currentStrength > 0.8) distribution.strong++;
      else if (currentStrength > 0.5) distribution.moderate++;
      else if (currentStrength > 0.2) distribution.weak++;
      else distribution.critical++;
    });

    return distribution;
  }

  /**
   * Calculate learning efficiency metrics
   */
  _calculateLearningEfficiency(cards, reviews) {
    const graduatedCards = cards.filter(c => c.graduated);
    const totalTime = reviews.reduce((sum, r) => sum + (r.responseTime || 0), 0);
    
    // Cards mastered per hour of study
    const masteryRate = totalTime > 0 ? graduatedCards.length / (totalTime / 3600) : 0;
    
    // Average reviews to mastery
    const masteryReviews = graduatedCards.length > 0
      ? graduatedCards.reduce((sum, c) => sum + c.totalReviews, 0) / graduatedCards.length
      : 0;
    
    // Lapse rate (cards that failed after graduation)
    const totalLapses = cards.reduce((sum, c) => sum + c.lapses, 0);
    const lapseRate = graduatedCards.length > 0 ? totalLapses / graduatedCards.length : 0;
    
    // Study time efficiency (correct answers per minute)
    const studyMinutes = totalTime / 60;
    const correctAnswers = reviews.filter(r => r.quality >= 3).length;
    const answersPerMinute = studyMinutes > 0 ? correctAnswers / studyMinutes : 0;

    return {
      masteryRate: Math.round(masteryRate * 100) / 100,
      avgReviewsToMastery: Math.round(masteryReviews * 10) / 10,
      lapseRate: Math.round(lapseRate * 100) / 100,
      answersPerMinute: Math.round(answersPerMinute * 100) / 100,
      totalStudyTime: Math.round(totalTime),
      totalStudyHours: Math.round((totalTime / 3600) * 10) / 10
    };
  }

  /**
   * Calculate retention forecast
   */
  _calculateRetentionForecast(cards, currentTime) {
    const forecast = {};
    const timeFrames = [1, 7, 30, 90]; // days

    timeFrames.forEach(days => {
      const futureTime = new Date(currentTime.getTime() + days * 24 * 60 * 60 * 1000);
      
      let totalRetention = 0;
      let cardCount = 0;

      cards.forEach(card => {
        if (card.lastReviewed) {
          // Calculate projected retention using exponential decay
          const daysSinceReview = (futureTime.getTime() - card.lastReviewed.getTime()) / (1000 * 60 * 60 * 24);
          const stability = card.stabilityFactor * card.easeFactor;
          const retention = Math.exp(-daysSinceReview / stability) * card.memoryStrength;
          
          totalRetention += Math.min(0.95, Math.max(0.05, retention));
          cardCount++;
        }
      });

      forecast[`${days}d`] = cardCount > 0 
        ? Math.round((totalRetention / cardCount) * 100) / 100 
        : 0;
    });

    return forecast;
  }

  /**
   * Calculate expected workload
   */
  _calculateExpectedWorkload(cards, currentTime) {
    const workload = {};
    const timeFrames = [1, 7, 30];

    timeFrames.forEach(days => {
      const futureTime = new Date(currentTime.getTime() + days * 24 * 60 * 60 * 1000);
      
      const dueCards = cards.filter(card => 
        card.nextReview <= futureTime && !card.suspended
      ).length;
      
      workload[`${days}d`] = dueCards;
    });

    return workload;
  }

  /**
   * Calculate mastery projection
   */
  _calculateMasteryProjection(cards, reviews) {
    const learningCards = cards.filter(c => 
      c.learningState === 'LEARNING' || c.learningState === 'NEW'
    );
    
    if (learningCards.length === 0) {
      return { estimatedDays: 0, confidence: 0 };
    }

    // Calculate average reviews to graduation from historical data
    const graduatedCards = cards.filter(c => c.graduated);
    const avgReviewsToGraduation = graduatedCards.length > 0
      ? graduatedCards.reduce((sum, c) => sum + c.totalReviews, 0) / graduatedCards.length
      : 5; // default estimate

    // Calculate current review rate
    const recentReviews = reviews.filter(r => 
      new Date(r.reviewedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    const dailyReviewRate = recentReviews.length / 7;

    // Estimate remaining reviews needed
    const remainingReviews = learningCards.reduce((sum, card) => 
      sum + Math.max(0, avgReviewsToGraduation - card.totalReviews), 0
    );

    const estimatedDays = dailyReviewRate > 0 
      ? Math.ceil(remainingReviews / dailyReviewRate) 
      : 0;

    // Confidence based on historical data consistency
    const confidence = graduatedCards.length >= 10 ? 0.8 : Math.min(0.5, graduatedCards.length / 10);

    return {
      estimatedDays,
      confidence: Math.round(confidence * 100) / 100,
      remainingCards: learningCards.length
    };
  }

  /**
   * Generate performance insights
   */
  _generateInsights(stats, trends, efficiency) {
    const insights = [];

    // Quality insights
    if (stats.averageQuality >= this.config.EXCELLENT_QUALITY) {
      insights.push({
        type: 'positive',
        category: 'quality',
        message: 'Excellent response quality! You\'re demonstrating strong understanding.'
      });
    } else if (stats.averageQuality <= this.config.POOR_QUALITY) {
      insights.push({
        type: 'warning',
        category: 'quality',
        message: 'Response quality could be improved. Consider reviewing more carefully.'
      });
    }

    // Streak insights
    if (stats.currentStreak >= this.config.EXCELLENT_STREAK) {
      insights.push({
        type: 'positive',
        category: 'consistency',
        message: `Amazing ${stats.currentStreak}-day streak! Consistency is key to learning.`
      });
    } else if (stats.currentStreak === 0) {
      insights.push({
        type: 'suggestion',
        category: 'consistency',
        message: 'Try to review daily to build momentum and improve retention.'
      });
    }

    // Efficiency insights
    if (efficiency.lapseRate > 0.3) {
      insights.push({
        type: 'warning',
        category: 'retention',
        message: 'High lapse rate detected. Consider shorter intervals or more focused practice.'
      });
    }

    // Response time insights
    if (stats.avgResponseTime < this.config.FAST_RESPONSE) {
      insights.push({
        type: 'positive',
        category: 'fluency',
        message: 'Fast response times indicate good fluency and automaticity.'
      });
    } else if (stats.avgResponseTime > this.config.SLOW_RESPONSE) {
      insights.push({
        type: 'suggestion',
        category: 'fluency',
        message: 'Consider practicing for faster recall to improve fluency.'
      });
    }

    return insights;
  }

  /**
   * Generate personalized recommendations
   */
  _generateRecommendations(stats, efficiency, insights) {
    const recommendations = [];

    // Study schedule recommendations
    if (stats.currentStreak < 3) {
      recommendations.push({
        type: 'schedule',
        priority: 'high',
        title: 'Establish Daily Review Habit',
        description: 'Aim for at least 10-15 minutes of review daily to build consistency.'
      });
    }

    // Difficulty recommendations
    if (stats.averageQuality < 3.0) {
      recommendations.push({
        type: 'difficulty',
        priority: 'high',
        title: 'Focus on Challenging Items',
        description: 'Spend extra time on difficult cards before moving to new material.'
      });
    }

    // Efficiency recommendations
    if (efficiency.answersPerMinute < 2.0) {
      recommendations.push({
        type: 'efficiency',
        priority: 'medium',
        title: 'Improve Review Speed',
        description: 'Try to answer more quickly to improve overall efficiency.'
      });
    }

    // Balance recommendations
    const newCardRatio = stats.totalCards > 0 ? stats.newCards / stats.totalCards : 0;
    if (newCardRatio > 0.5) {
      recommendations.push({
        type: 'balance',
        priority: 'medium',
        title: 'Balance New and Review Cards',
        description: 'Focus more on reviewing existing cards before adding many new ones.'
      });
    }

    return recommendations;
  }

  /**
   * Calculate current streak
   */
  _calculateCurrentStreak(reviews) {
    if (reviews.length === 0) return 0;
    
    const sortedReviews = reviews.sort((a, b) => 
      new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime()
    );

    let streak = 0;
    let currentDate = new Date();
    
    for (const review of sortedReviews) {
      const reviewDate = new Date(review.reviewedAt);
      const daysDiff = Math.floor((currentDate - reviewDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= streak + 1 && review.quality >= 3) {
        if (daysDiff === streak) {
          // Same day as expected, continue streak
        } else if (daysDiff === streak + 1) {
          // Next day, increment streak
          streak++;
        }
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Calculate longest streak
   */
  _calculateLongestStreak(reviews) {
    if (reviews.length === 0) return 0;
    
    const dailySuccess = {};
    
    // Group successful reviews by date
    reviews.filter(r => r.quality >= 3).forEach(review => {
      const date = new Date(review.reviewedAt).toISOString().split('T')[0];
      dailySuccess[date] = true;
    });
    
    const dates = Object.keys(dailySuccess).sort();
    let maxStreak = 0;
    let currentStreak = 0;
    
    for (let i = 0; i < dates.length; i++) {
      if (i === 0) {
        currentStreak = 1;
      } else {
        const prevDate = new Date(dates[i - 1]);
        const currDate = new Date(dates[i]);
        const daysDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
        
        if (daysDiff === 1) {
          currentStreak++;
        } else {
          maxStreak = Math.max(maxStreak, currentStreak);
          currentStreak = 1;
        }
      }
    }
    
    return Math.max(maxStreak, currentStreak);
  }
}

module.exports = AnalyticsService;