// Test Runner for Roof Adjustment Engine
// Runs comprehensive tests and provides detailed reporting

import { RoofAdjustmentEngineTestRunner } from './roofAdjustmentEngine.test';

// Create a simple test runner that can be called from the browser console
export function runRoofAdjustmentTests() {
  console.log('🚀 Starting Roof Adjustment Engine Test Suite...');
  
  const testRunner = new RoofAdjustmentEngineTestRunner();
  const results = testRunner.runAllTests();
  
  // Display results in a formatted way
  console.log('\n🎯 FINAL TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`📊 Total Tests: ${results.totalTests}`);
  console.log(`✅ Passed: ${results.passedTests}`);
  console.log(`❌ Failed: ${results.failedTests}`);
  console.log(`📈 Success Rate: ${((results.passedTests / results.totalTests) * 100).toFixed(1)}%`);
  
  if (results.failedTests > 0) {
    console.log('\n🔍 DETAILED FAILURE ANALYSIS:');
    results.results
      .filter(result => !result.passed)
      .forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.suite} - ${result.test}`);
        console.log(`   ❌ Error: ${result.error}`);
        if (result.expected) {
          console.log(`   📋 Expected: ${JSON.stringify(result.expected, null, 4)}`);
        }
        if (result.actual) {
          console.log(`   🔍 Actual: ${JSON.stringify(result.actual, null, 4)}`);
        }
      });
  } else {
    console.log('\n🎉 ALL TESTS PASSED! The roof adjustment engine is working correctly.');
  }
  
  return results;
}

// Make it available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).runRoofAdjustmentTests = runRoofAdjustmentTests;
  console.log('🧪 Test runner available globally as window.runRoofAdjustmentTests()');
}
