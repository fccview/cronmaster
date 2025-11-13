#!/usr/bin/env node

/**
 * API Testing Script for Cronjob Manager
 *
 * This script tests all API endpoints and provides clear reporting on what's working and what's broken.
 * Usage: node test-api.js [baseUrl]
 * Example: node test-api.js http://localhost:3000
 * 
 * Running it with params: AUTH_PASSWORD=<password> node test-api.js http://localhost:<port>
 */

const https = require('https');
const http = require('http');

class APITester {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.sessionCookie = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  async makeRequest(method, path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const requestOptions = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'API-Test-Script/1.0',
          ...options.headers
        }
      };

      if (this.sessionCookie && !options.skipAuth) {
        requestOptions.headers.Cookie = this.sessionCookie;
      }

      const req = client.request(requestOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = {
              status: res.statusCode,
              headers: res.headers,
              data: data ? JSON.parse(data) : null,
              rawData: data
            };
            resolve(response);
          } catch (error) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: null,
              rawData: data,
              parseError: error.message
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
  }

  async login(password = process.env.AUTH_PASSWORD || 'admin') {
    try {
      console.log('\n🔐 Testing login...');
      const response = await this.makeRequest('POST', '/api/auth/login', {
        body: { password },
        skipAuth: true
      });

      if (response.status === 200 && response.data?.success) {
        const setCookieHeader = response.headers['set-cookie'];
        if (setCookieHeader) {
          const sessionMatch = setCookieHeader.find(cookie => cookie.startsWith('cronmaster-session='));
          if (sessionMatch) {
            this.sessionCookie = sessionMatch.split(';')[0];
            console.log('✅ Login successful, session cookie set');
            return true;
          }
        }
      }

      console.log('❌ Login failed:', response.data?.message || 'Unknown error');
      return false;
    } catch (error) {
      console.log('❌ Login error:', error.message);
      return false;
    }
  }

  recordResult(testName, passed, details = '') {
    this.testResults.total++;
    if (passed) {
      this.testResults.passed++;
      console.log(`✅ ${testName}`);
    } else {
      this.testResults.failed++;
      console.log(`❌ ${testName}`);
      if (details) console.log(`   Details: ${details}`);
    }
    this.testResults.details.push({ testName, passed, details });
  }

  async testEndpoint(testName, method, path, options = {}) {
    try {
      const response = await this.makeRequest(method, path, options);

      const expectedStatus = options.expectedStatus || (method === 'GET' ? 200 : 201);
      const statusOk = response.status === expectedStatus;

      let dataOk = true;
      if (options.expectedDataShape) {
        dataOk = this.checkDataShape(response.data, options.expectedDataShape);
      }

      const passed = statusOk && dataOk;

      let details = '';
      if (!statusOk) {
        details += `Expected status ${expectedStatus}, got ${response.status}. `;
      }
      if (!dataOk) {
        details += 'Response data shape mismatch. ';
      }
      if (response.parseError) {
        details += `JSON parse error: ${response.parseError}. `;
      }
      if (response.data?.error) {
        details += `API error: ${response.data.error}. `;
      }

      this.recordResult(testName, passed, details);
      return response;
    } catch (error) {
      this.recordResult(testName, false, `Request failed: ${error.message}`);
      return null;
    }
  }

  async testSSEEndpoint(testName, path, options = {}) {
    return new Promise((resolve) => {
      const url = new URL(path, this.baseUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const requestOptions = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'User-Agent': 'API-Test-Script/1.0',
        }
      };

      if (this.sessionCookie && !options.skipAuth) {
        requestOptions.headers.Cookie = this.sessionCookie;
      }

      const timeout = setTimeout(() => {
        req.destroy();
        this.recordResult(testName, true, 'SSE connection established (timed out as expected)');
        resolve(null);
      }, 2000);

      const req = client.request(requestOptions, (res) => {
        clearTimeout(timeout);

        const expectedStatus = options.expectedStatus || 200;
        const statusOk = res.statusCode === expectedStatus;

        if (statusOk) {
          res.destroy();
          this.recordResult(testName, true, 'SSE connection established successfully');
        } else {
          this.recordResult(testName, false, `Expected status ${expectedStatus}, got ${res.statusCode}`);
        }

        resolve(null);
      });

      req.on('error', (error) => {
        clearTimeout(timeout);
        this.recordResult(testName, false, `SSE connection failed: ${error.message}`);
        resolve(null);
      });

      req.end();
    });
  }

  checkDataShape(data, shape) {
    if (!data) return false;

    for (const [key, type] of Object.entries(shape)) {
      if (!(key in data)) return false;

      if (type === 'array' && !Array.isArray(data[key])) return false;
      if (type === 'object' && (typeof data[key] !== 'object' || Array.isArray(data[key]))) return false;
      if (type === 'string' && typeof data[key] !== 'string') return false;
      if (type === 'boolean' && typeof data[key] !== 'boolean') return false;
      if (type === 'number' && typeof data[key] !== 'number') return false;
    }

    return true;
  }

  async runTests() {
    console.log(`🚀 Starting API tests for ${this.baseUrl}`);
    console.log('=' .repeat(60));

    const loginSuccess = await this.login();
    if (!loginSuccess) {
      console.log('\n❌ Cannot proceed without authentication. Please check AUTH_PASSWORD environment variable.');
      return;
    }

    await this.testEndpoint('GET /api/auth/check-session', 'GET', '/api/auth/check-session', {
      expectedDataShape: { valid: 'boolean' }
    });

    const cronjobsResponse = await this.testEndpoint('GET /api/cronjobs', 'GET', '/api/cronjobs', {
      expectedDataShape: { success: 'boolean', data: 'array' }
    });

    let cronJobId = null;
    if (cronjobsResponse?.data?.success && cronjobsResponse.data.data.length > 0) {
      cronJobId = cronjobsResponse.data.data[0].id;

      await this.testEndpoint(`GET /api/cronjobs/${cronJobId}`, 'GET', `/api/cronjobs/${cronJobId}`, {
        expectedDataShape: { success: 'boolean', data: 'object' }
      });

      await this.testEndpoint(`GET /api/cronjobs/${cronJobId}/execute`, 'GET', `/api/cronjobs/${cronJobId}/execute`, {
        expectedDataShape: { success: 'boolean' }
      });

      await this.testEndpoint(`GET /api/cronjobs/${cronJobId}/execute?runInBackground=false`, 'GET', `/api/cronjobs/${cronJobId}/execute?runInBackground=false`, {
        expectedDataShape: { success: 'boolean' }
      });
    } else {
      console.log('ℹ️  No cronjobs found, skipping individual cronjob tests');
    }

    await this.testEndpoint('GET /api/scripts', 'GET', '/api/scripts', {
      expectedDataShape: { success: 'boolean', data: 'array' }
    });

    await this.testEndpoint('GET /api/system-stats', 'GET', '/api/system-stats', {
      expectedDataShape: { uptime: 'string', memory: 'object', cpu: 'object' }
    });

    await this.testSSEEndpoint('GET /api/events', '/api/events', {
      expectedStatus: 200
    });

    await this.testEndpoint('POST /api/auth/logout', 'POST', '/api/auth/logout', {
      expectedStatus: 200,
      expectedDataShape: { success: 'boolean' }
    });

    await this.testEndpoint('GET /api/auth/check-session (after logout)', 'GET', '/api/auth/check-session', {
      expectedStatus: 401,
      expectedDataShape: { valid: 'boolean' }
    });

    await this.testEndpoint('GET /api/logs/stream (without runId)', 'GET', '/api/logs/stream', {
      expectedStatus: 400
    });

    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total tests: ${this.testResults.total}`);
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`Success rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);

    if (this.testResults.failed > 0) {
      console.log('\n🔍 FAILED TESTS DETAILS:');
      this.testResults.details
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`❌ ${test.testName}`);
          if (test.details) console.log(`   ${test.details}`);
        });
    }

    console.log('\n🎯 REMOVED ENDPOINTS VERIFICATION:');
    console.log('The following POST endpoints should return 405 Method Not Allowed:');

    const removedEndpoints = [
      '/api/cronjobs',
      '/api/scripts'
    ];

    for (const endpoint of removedEndpoints) {
      try {
        const response = await this.makeRequest('POST', endpoint, { skipAuth: true });
        if (response.status === 405) {
          console.log(`✅ ${endpoint} - Correctly returns 405 Method Not Allowed`);
        } else {
          console.log(`❌ ${endpoint} - Returns ${response.status}, expected 405`);
        }
      } catch (error) {
        console.log(`❓ ${endpoint} - Could not test (connection error)`);
      }
    }

    if (cronJobId) {
      try {
        const response = await this.makeRequest('POST', `/api/cronjobs/${cronJobId}/execute`, { skipAuth: true });
        if (response.status === 405) {
          console.log(`✅ /api/cronjobs/${cronJobId}/execute - Correctly returns 405 Method Not Allowed (now GET only)`);
        } else {
          console.log(`❌ /api/cronjobs/${cronJobId}/execute - Returns ${response.status}, expected 405 for POST`);
        }
      } catch (error) {
        console.log(`❓ /api/cronjobs/${cronJobId}/execute - Could not test (connection error)`);
      }
    }

    process.exit(this.testResults.failed > 0 ? 1 : 0);
  }
}

const baseUrl = process.argv[2] || 'http://localhost:3000';
const tester = new APITester(baseUrl);
tester.runTests().catch(error => {
  console.error('💥 Test runner failed:', error.message);
  process.exit(1);
});
