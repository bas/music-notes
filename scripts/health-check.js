#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🎵 Music Notes Project Health Check\n');

try {
  console.log('📦 Checking dependencies...');
  execSync('npm ls --depth=0', { stdio: 'pipe' });
  console.log('✅ Dependencies OK\n');

  console.log('🔍 Running type check...');
  execSync('npm run type-check', { stdio: 'pipe' });
  console.log('✅ TypeScript types OK\n');

  console.log('🧪 Running tests...');
  const testOutput = execSync('npm test', { encoding: 'utf-8' });
  const testResults = testOutput.match(/Tests:\s+(\d+) passed/);
  const passedTests = testResults ? testResults[1] : 'unknown';
  console.log(`✅ All ${passedTests} tests passing\n`);

  console.log('🎉 Project is healthy! All TAB examples are verified correct.');
  process.exit(0);
} catch (error) {
  console.error('❌ Health check failed:', error.message);
  process.exit(1);
}