/**
 * Test utilities for MTGJSON integration
 * Provides functions to test and validate the MTGJSON system
 */

import { MTGCard } from '@/lib/types';
import { cardMappingService } from '@/lib/services/cardMappingService';
import { mtgjsonInitService } from '@/lib/services/mtgjsonInitService';
import { getPriceHistoryForCard } from '@/lib/api/mtgjson';
import { searchCards } from '@/lib/api/scryfall';

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  duration?: number;
}

interface MTGJSONTestSuite {
  initialization: TestResult;
  cardMapping: TestResult;
  priceHistory: TestResult;
  performance: TestResult;
  overall: TestResult;
}

/**
 * Run comprehensive MTGJSON integration tests
 */
export async function runMTGJSONTests(): Promise<MTGJSONTestSuite> {
  console.log('Starting MTGJSON integration tests...');
  
  const results: MTGJSONTestSuite = {
    initialization: await testInitialization(),
    cardMapping: await testCardMapping(),
    priceHistory: await testPriceHistory(),
    performance: await testPerformance(),
    overall: { success: false, message: '' },
  };

  // Calculate overall result
  const allTests = [
    results.initialization,
    results.cardMapping,
    results.priceHistory,
    results.performance,
  ];

  const successCount = allTests.filter(test => test.success).length;
  const totalTests = allTests.length;

  results.overall = {
    success: successCount === totalTests,
    message: `${successCount}/${totalTests} tests passed`,
    data: {
      successCount,
      totalTests,
      successRate: (successCount / totalTests) * 100,
    },
  };

  console.log('MTGJSON tests completed:', results.overall);
  return results;
}

/**
 * Test MTGJSON initialization
 */
async function testInitialization(): Promise<TestResult> {
  const startTime = performance.now();
  
  try {
    // Check if system is initialized
    const isInitialized = await mtgjsonInitService.isInitialized();
    
    if (!isInitialized) {
      return {
        success: false,
        message: 'MTGJSON system not initialized',
        error: 'Run initialization first',
        duration: performance.now() - startTime,
      };
    }

    // Get initialization stats
    const stats = await mtgjsonInitService.getInitializationStats();
    
    if (!stats || stats.totalCards === 0) {
      return {
        success: false,
        message: 'No MTGJSON data found',
        error: 'AllPrintings data appears to be empty',
        duration: performance.now() - startTime,
      };
    }

    return {
      success: true,
      message: `MTGJSON initialized with ${stats.totalCards.toLocaleString()} cards`,
      data: stats,
      duration: performance.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Initialization test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: performance.now() - startTime,
    };
  }
}

/**
 * Test card mapping functionality
 */
async function testCardMapping(): Promise<TestResult> {
  const startTime = performance.now();
  
  try {
    // Test with well-known cards
    const testCards = [
      'Lightning Bolt',
      'Black Lotus',
      'Tarmogoyf',
      'Snapcaster Mage',
      'Force of Will',
    ];

    const results = [];
    
    for (const cardName of testCards) {
      try {
        // Search for the card
        const searchResult = await searchCards(cardName, { limit: 1 });
        
        if (searchResult.cards.length === 0) {
          results.push({
            card: cardName,
            found: false,
            mapped: false,
            error: 'Card not found in Scryfall',
          });
          continue;
        }

        const scryfallCard = searchResult.cards[0];
        
        // Try to map it to MTGJSON
        const uuid = await cardMappingService.getMapping(scryfallCard);
        
        results.push({
          card: cardName,
          found: true,
          mapped: !!uuid,
          uuid: uuid || undefined,
          scryfallId: scryfallCard.id,
          confidence: uuid ? 'high' : 'none',
        });
      } catch (error) {
        results.push({
          card: cardName,
          found: false,
          mapped: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const mappedCount = results.filter(r => r.mapped).length;
    const foundCount = results.filter(r => r.found).length;
    const successRate = foundCount > 0 ? (mappedCount / foundCount) * 100 : 0;

    return {
      success: mappedCount > 0,
      message: `Mapped ${mappedCount}/${foundCount} test cards (${successRate.toFixed(1)}% success rate)`,
      data: {
        results,
        mappedCount,
        foundCount,
        successRate,
      },
      duration: performance.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Card mapping test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: performance.now() - startTime,
    };
  }
}

/**
 * Test price history functionality
 */
async function testPriceHistory(): Promise<TestResult> {
  const startTime = performance.now();
  
  try {
    // Test with Lightning Bolt (should be widely available)
    const searchResult = await searchCards('Lightning Bolt', { limit: 1 });
    
    if (searchResult.cards.length === 0) {
      return {
        success: false,
        message: 'Test card not found',
        error: 'Could not find Lightning Bolt for testing',
        duration: performance.now() - startTime,
      };
    }

    const testCard = searchResult.cards[0];
    
    // Try to get price history
    const priceHistory = await getPriceHistoryForCard(testCard);
    
    if (!priceHistory) {
      return {
        success: false,
        message: 'No price history available',
        error: 'Could not retrieve price history for test card',
        duration: performance.now() - startTime,
      };
    }

    const hasRealData = priceHistory.provider === 'mtgjson';
    const pricePoints = priceHistory.prices.length;

    return {
      success: pricePoints > 0,
      message: `Retrieved ${pricePoints} price points (${hasRealData ? 'real' : 'simulated'} data)`,
      data: {
        card: testCard.name,
        pricePoints,
        hasRealData,
        provider: priceHistory.provider,
        trend: priceHistory.trend,
        volatility: priceHistory.volatility,
        averagePrice: priceHistory.averagePrice,
      },
      duration: performance.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Price history test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: performance.now() - startTime,
    };
  }
}

/**
 * Test performance characteristics
 */
async function testPerformance(): Promise<TestResult> {
  const startTime = performance.now();
  
  try {
    const performanceTests = [];

    // Test 1: Card search speed
    const searchStart = performance.now();
    await searchCards('Lightning Bolt', { limit: 5 });
    const searchTime = performance.now() - searchStart;
    performanceTests.push({ test: 'Card Search', time: searchTime, threshold: 2000 });

    // Test 2: Card mapping speed
    const mappingStart = performance.now();
    const searchResult = await searchCards('Lightning Bolt', { limit: 1 });
    if (searchResult.cards.length > 0) {
      await cardMappingService.getMapping(searchResult.cards[0]);
    }
    const mappingTime = performance.now() - mappingStart;
    performanceTests.push({ test: 'Card Mapping', time: mappingTime, threshold: 1000 });

    // Test 3: Stats retrieval speed
    const statsStart = performance.now();
    await cardMappingService.getMappingStats();
    const statsTime = performance.now() - statsStart;
    performanceTests.push({ test: 'Stats Retrieval', time: statsTime, threshold: 500 });

    const allTestsPassed = performanceTests.every(test => test.time < test.threshold);
    const averageTime = performanceTests.reduce((sum, test) => sum + test.time, 0) / performanceTests.length;

    return {
      success: allTestsPassed,
      message: `Performance tests ${allTestsPassed ? 'passed' : 'failed'} (avg: ${averageTime.toFixed(0)}ms)`,
      data: {
        tests: performanceTests,
        averageTime,
        allPassed: allTestsPassed,
      },
      duration: performance.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Performance test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: performance.now() - startTime,
    };
  }
}

/**
 * Test specific card mapping
 */
export async function testCardMappingForCard(cardName: string): Promise<TestResult> {
  const startTime = performance.now();
  
  try {
    // Search for the card
    const searchResult = await searchCards(cardName, { limit: 1 });
    
    if (searchResult.cards.length === 0) {
      return {
        success: false,
        message: `Card "${cardName}" not found`,
        error: 'No search results from Scryfall',
        duration: performance.now() - startTime,
      };
    }

    const scryfallCard = searchResult.cards[0];
    
    // Try to map it
    const uuid = await cardMappingService.getMapping(scryfallCard);
    
    if (!uuid) {
      return {
        success: false,
        message: `No MTGJSON mapping found for "${cardName}"`,
        error: 'Card mapping failed',
        data: {
          scryfallCard: {
            id: scryfallCard.id,
            name: scryfallCard.name,
            setCode: scryfallCard.setCode,
            number: scryfallCard.number,
          },
        },
        duration: performance.now() - startTime,
      };
    }

    // Try to get price history
    const priceHistory = await getPriceHistoryForCard(scryfallCard);
    
    return {
      success: true,
      message: `Successfully mapped "${cardName}" to MTGJSON`,
      data: {
        scryfallCard: {
          id: scryfallCard.id,
          name: scryfallCard.name,
          setCode: scryfallCard.setCode,
          number: scryfallCard.number,
        },
        mtgjsonUuid: uuid,
        hasPriceHistory: !!priceHistory,
        pricePoints: priceHistory?.prices.length || 0,
        provider: priceHistory?.provider || 'none',
      },
      duration: performance.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      message: `Test failed for "${cardName}"`,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: performance.now() - startTime,
    };
  }
}

/**
 * Generate a test report
 */
export function generateTestReport(results: MTGJSONTestSuite): string {
  const lines = [
    '# MTGJSON Integration Test Report',
    `Generated: ${new Date().toISOString()}`,
    '',
    `## Overall Result: ${results.overall.success ? '✅ PASSED' : '❌ FAILED'}`,
    `${results.overall.message}`,
    '',
  ];

  const tests = [
    { name: 'Initialization', result: results.initialization },
    { name: 'Card Mapping', result: results.cardMapping },
    { name: 'Price History', result: results.priceHistory },
    { name: 'Performance', result: results.performance },
  ];

  tests.forEach(({ name, result }) => {
    lines.push(`### ${name}: ${result.success ? '✅' : '❌'}`);
    lines.push(`**Message:** ${result.message}`);
    
    if (result.duration) {
      lines.push(`**Duration:** ${result.duration.toFixed(0)}ms`);
    }
    
    if (result.error) {
      lines.push(`**Error:** ${result.error}`);
    }
    
    if (result.data) {
      lines.push(`**Data:** \`${JSON.stringify(result.data, null, 2)}\``);
    }
    
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Quick health check for MTGJSON system
 */
export async function quickHealthCheck(): Promise<{
  healthy: boolean;
  issues: string[];
  stats?: any;
}> {
  const issues: string[] = [];
  
  try {
    // Check initialization
    const isInitialized = await mtgjsonInitService.isInitialized();
    if (!isInitialized) {
      issues.push('MTGJSON system not initialized');
    }

    // Check stats
    const stats = await mtgjsonInitService.getInitializationStats();
    if (!stats || stats.totalCards === 0) {
      issues.push('No MTGJSON data available');
    }

    // Check mapping functionality
    const mappingStats = await cardMappingService.getMappingStats();
    if (mappingStats.totalMappings === 0) {
      issues.push('No card mappings cached');
    }

    return {
      healthy: issues.length === 0,
      issues,
      stats,
    };
  } catch (error) {
    issues.push(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return {
      healthy: false,
      issues,
    };
  }
}
