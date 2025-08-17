#!/usr/bin/env node

/**
 * Comprehensive test runner for CI/CD pipelines
 * Runs all tests with proper error handling and reporting
 */

const { spawn } = require('child_process')
const path = require('path')

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function log(message, color = COLORS.reset) {
  console.log(`${color}${message}${COLORS.reset}`)
}

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    log(`\n${COLORS.cyan}Running: ${command} ${args.join(' ')}${COLORS.reset}`)
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options,
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code)
      } else {
        reject(new Error(`Command failed with exit code ${code}`))
      }
    })

    child.on('error', (error) => {
      reject(error)
    })
  })
}

async function runTests() {
  const startTime = Date.now()
  let totalTests = 0
  let failedTests = 0

  try {
    log(`${COLORS.bright}${COLORS.blue}🚀 Starting MTG Index Test Suite${COLORS.reset}`)
    log(`${COLORS.yellow}Timestamp: ${new Date().toISOString()}${COLORS.reset}`)

    // Step 1: Type checking
    log(`\n${COLORS.bright}${COLORS.magenta}📋 Step 1: TypeScript Type Checking${COLORS.reset}`)
    try {
      await runCommand('npm', ['run', 'type-check'])
      log(`${COLORS.green}✅ TypeScript type checking passed${COLORS.reset}`)
    } catch (error) {
      log(`${COLORS.red}❌ TypeScript type checking failed${COLORS.reset}`)
      failedTests++
    }
    totalTests++

    // Step 2: Linting
    log(`\n${COLORS.bright}${COLORS.magenta}🔍 Step 2: ESLint Code Quality Check${COLORS.reset}`)
    try {
      await runCommand('npm', ['run', 'lint'])
      log(`${COLORS.green}✅ Linting passed${COLORS.reset}`)
    } catch (error) {
      log(`${COLORS.red}❌ Linting failed${COLORS.reset}`)
      failedTests++
    }
    totalTests++

    // Step 3: Unit and Integration Tests
    log(`\n${COLORS.bright}${COLORS.magenta}🧪 Step 3: Unit & Integration Tests${COLORS.reset}`)
    try {
      await runCommand('npm', ['test', '--', '--coverage', '--watchAll=false'])
      log(`${COLORS.green}✅ Unit tests passed${COLORS.reset}`)
    } catch (error) {
      log(`${COLORS.red}❌ Unit tests failed${COLORS.reset}`)
      failedTests++
    }
    totalTests++

    // Step 4: Build Test
    log(`\n${COLORS.bright}${COLORS.magenta}🏗️ Step 4: Production Build Test${COLORS.reset}`)
    try {
      await runCommand('npm', ['run', 'build'])
      log(`${COLORS.green}✅ Production build successful${COLORS.reset}`)
    } catch (error) {
      log(`${COLORS.red}❌ Production build failed${COLORS.reset}`)
      failedTests++
    }
    totalTests++

    // Results Summary
    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)

    log(`\n${COLORS.bright}${COLORS.blue}📊 Test Results Summary${COLORS.reset}`)
    log(`${COLORS.cyan}Total Test Suites: ${totalTests}${COLORS.reset}`)
    log(`${COLORS.green}Passed: ${totalTests - failedTests}${COLORS.reset}`)
    
    if (failedTests > 0) {
      log(`${COLORS.red}Failed: ${failedTests}${COLORS.reset}`)
      log(`${COLORS.red}❌ Test suite failed${COLORS.reset}`)
    } else {
      log(`${COLORS.green}✅ All tests passed!${COLORS.reset}`)
    }
    
    log(`${COLORS.yellow}Duration: ${duration}s${COLORS.reset}`)

    // Generate test report
    const report = {
      timestamp: new Date().toISOString(),
      duration: parseFloat(duration),
      totalSuites: totalTests,
      passed: totalTests - failedTests,
      failed: failedTests,
      success: failedTests === 0,
    }

    require('fs').writeFileSync(
      path.join(process.cwd(), 'test-results.json'),
      JSON.stringify(report, null, 2)
    )

    log(`${COLORS.cyan}📄 Test report saved to test-results.json${COLORS.reset}`)

    if (failedTests > 0) {
      process.exit(1)
    }

  } catch (error) {
    log(`${COLORS.red}💥 Test suite crashed: ${error.message}${COLORS.reset}`)
    process.exit(1)
  }
}

// Handle script interruption
process.on('SIGINT', () => {
  log(`\n${COLORS.yellow}Test suite interrupted${COLORS.reset}`)
  process.exit(1)
})

process.on('SIGTERM', () => {
  log(`\n${COLORS.yellow}Test suite terminated${COLORS.reset}`)
  process.exit(1)
})

// Run the tests
runTests().catch((error) => {
  log(`${COLORS.red}💥 Unhandled error: ${error.message}${COLORS.reset}`)
  process.exit(1)
})
