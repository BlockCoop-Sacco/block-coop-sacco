import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Custom test results processor for enhanced reporting
 */
export default function testResultsProcessor(results) {
  // Ensure test-results directory exists
  const resultsDir = path.join(__dirname, '../../test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  // Process and enhance test results
  const processedResults = {
    ...results,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'test',
    summary: {
      totalTests: results.numTotalTests,
      passedTests: results.numPassedTests,
      failedTests: results.numFailedTests,
      pendingTests: results.numPendingTests,
      todoTests: results.numTodoTests,
      totalTestSuites: results.numTotalTestSuites,
      passedTestSuites: results.numPassedTestSuites,
      failedTestSuites: results.numFailedTestSuites,
      pendingTestSuites: results.numPendingTestSuites,
      runtimeErrors: results.numRuntimeErrorTestSuites,
      success: results.success,
      startTime: results.startTime,
      runTime: results.runTime
    },
    coverage: results.coverageMap ? {
      statements: results.coverageMap.getCoverageSummary().statements,
      branches: results.coverageMap.getCoverageSummary().branches,
      functions: results.coverageMap.getCoverageSummary().functions,
      lines: results.coverageMap.getCoverageSummary().lines
    } : null,
    testSuites: results.testResults.map(testResult => ({
      testFilePath: testResult.testFilePath,
      numFailingTests: testResult.numFailingTests,
      numPassingTests: testResult.numPassingTests,
      numPendingTests: testResult.numPendingTests,
      numTodoTests: testResult.numTodoTests,
      perfStats: testResult.perfStats,
      testResults: testResult.testResults.map(test => ({
        ancestorTitles: test.ancestorTitles,
        title: test.title,
        fullName: test.fullName,
        status: test.status,
        duration: test.duration,
        failureMessages: test.failureMessages,
        location: test.location
      }))
    }))
  };

  // Write detailed results to JSON file
  const detailedResultsPath = path.join(resultsDir, 'detailed-results.json');
  fs.writeFileSync(detailedResultsPath, JSON.stringify(processedResults, null, 2));

  // Write summary report
  const summaryPath = path.join(resultsDir, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(processedResults.summary, null, 2));

  // Generate performance report
  const performanceReport = generatePerformanceReport(processedResults);
  const performancePath = path.join(resultsDir, 'performance.json');
  fs.writeFileSync(performancePath, JSON.stringify(performanceReport, null, 2));

  // Generate failure report if there are failures
  if (results.numFailedTests > 0) {
    const failureReport = generateFailureReport(processedResults);
    const failurePath = path.join(resultsDir, 'failures.json');
    fs.writeFileSync(failurePath, JSON.stringify(failureReport, null, 2));
  }

  // Generate HTML report
  generateHTMLReport(processedResults, resultsDir);

  // Log summary to console
  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Passed: ${results.numPassedTests}/${results.numTotalTests} tests`);
  console.log(`❌ Failed: ${results.numFailedTests}/${results.numTotalTests} tests`);
  console.log(`⏱️  Runtime: ${(results.runTime / 1000).toFixed(2)}s`);
  
  if (processedResults.coverage) {
    console.log('\n📈 Coverage Summary:');
    console.log(`Statements: ${processedResults.coverage.statements.pct}%`);
    console.log(`Branches: ${processedResults.coverage.branches.pct}%`);
    console.log(`Functions: ${processedResults.coverage.functions.pct}%`);
    console.log(`Lines: ${processedResults.coverage.lines.pct}%`);
  }

  console.log(`\n📁 Detailed reports saved to: ${resultsDir}`);

  return results;
}

function generatePerformanceReport(results) {
  const slowTests = [];
  const fastTests = [];
  const SLOW_THRESHOLD = 1000; // 1 second

  results.testSuites.forEach(suite => {
    suite.testResults.forEach(test => {
      const testInfo = {
        suite: suite.testFilePath,
        name: test.fullName,
        duration: test.duration
      };

      if (test.duration > SLOW_THRESHOLD) {
        slowTests.push(testInfo);
      } else {
        fastTests.push(testInfo);
      }
    });
  });

  // Sort by duration
  slowTests.sort((a, b) => b.duration - a.duration);
  fastTests.sort((a, b) => a.duration - b.duration);

  return {
    summary: {
      totalTests: slowTests.length + fastTests.length,
      slowTests: slowTests.length,
      fastTests: fastTests.length,
      slowThreshold: SLOW_THRESHOLD,
      averageDuration: results.summary.runTime / results.summary.totalTests
    },
    slowTests: slowTests.slice(0, 10), // Top 10 slowest
    recommendations: generatePerformanceRecommendations(slowTests)
  };
}

function generateFailureReport(results) {
  const failures = [];

  results.testSuites.forEach(suite => {
    suite.testResults.forEach(test => {
      if (test.status === 'failed') {
        failures.push({
          suite: suite.testFilePath,
          name: test.fullName,
          failureMessages: test.failureMessages,
          location: test.location,
          duration: test.duration
        });
      }
    });
  });

  return {
    summary: {
      totalFailures: failures.length,
      timestamp: new Date().toISOString()
    },
    failures,
    recommendations: generateFailureRecommendations(failures)
  };
}

function generatePerformanceRecommendations(slowTests) {
  const recommendations = [];

  if (slowTests.length > 0) {
    recommendations.push('Consider optimizing slow tests or breaking them into smaller units');
    recommendations.push('Review database operations and mock external services');
    recommendations.push('Use test.concurrent() for independent tests that can run in parallel');
  }

  return recommendations;
}

function generateFailureRecommendations(failures) {
  const recommendations = [];

  if (failures.length > 0) {
    recommendations.push('Review failed test assertions and expected vs actual values');
    recommendations.push('Check for race conditions in async tests');
    recommendations.push('Ensure proper test isolation and cleanup');
    recommendations.push('Verify mock configurations and external service responses');
  }

  return recommendations;
}

function generateHTMLReport(results, outputDir) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>M-Pesa Integration Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 24px; font-weight: bold; }
        .success { color: #28a745; }
        .failure { color: #dc3545; }
        .warning { color: #ffc107; }
        .test-suites { margin-top: 30px; }
        .test-suite { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
        .test-suite h4 { margin: 0 0 10px 0; }
        .test { padding: 5px 0; border-bottom: 1px solid #eee; }
        .test:last-child { border-bottom: none; }
    </style>
</head>
<body>
    <div class="header">
        <h1>M-Pesa Integration Test Report</h1>
        <p>Generated: ${results.timestamp}</p>
        <p>Environment: ${results.environment}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Total Tests</h3>
            <div class="value">${results.summary.totalTests}</div>
        </div>
        <div class="metric">
            <h3>Passed</h3>
            <div class="value success">${results.summary.passedTests}</div>
        </div>
        <div class="metric">
            <h3>Failed</h3>
            <div class="value failure">${results.summary.failedTests}</div>
        </div>
        <div class="metric">
            <h3>Runtime</h3>
            <div class="value">${(results.summary.runTime / 1000).toFixed(2)}s</div>
        </div>
        ${results.coverage ? `
        <div class="metric">
            <h3>Coverage</h3>
            <div class="value">${results.coverage.statements.pct}%</div>
        </div>
        ` : ''}
    </div>

    <div class="test-suites">
        <h2>Test Suites</h2>
        ${results.testSuites.map(suite => `
            <div class="test-suite">
                <h4>${suite.testFilePath}</h4>
                <p>Passed: ${suite.numPassingTests}, Failed: ${suite.numFailingTests}</p>
                ${suite.testResults.map(test => `
                    <div class="test">
                        <span class="${test.status === 'passed' ? 'success' : 'failure'}">
                            ${test.status === 'passed' ? '✅' : '❌'}
                        </span>
                        ${test.fullName} (${test.duration}ms)
                    </div>
                `).join('')}
            </div>
        `).join('')}
    </div>
</body>
</html>
  `;

  fs.writeFileSync(path.join(outputDir, 'report.html'), html);
}
