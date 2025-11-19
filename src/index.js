const axios = require('axios');

class RekLog {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.apiUrl = options.apiUrl || 'https://api.reklog.com/api';
    this.activeLogs = new Map();
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.debug = options.debug || false;
    this.environment = options.environment || 'development';
    this.host = options.host || null;

    if (!apiKey) {
      throw new Error('RekLog: API key is required');
    }
  }

  /**
   * Start tracking a request
   * @param {string} endpoint - The endpoint being called
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @returns {string} logId - Unique identifier for this log
   */
  start(endpoint, method = 'GET') {
    const logId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.activeLogs.set(logId, {
      endpoint,
      method: method.toUpperCase(),
      startTime: performance.now()
    });

    return logId;
  }

  /**
   * End tracking a request and send log to server
   * @param {string} logId - The log identifier from start()
   * @param {object} options - Additional options (statusCode, metadata, environment)
   */
  async end(logId, options = {}) {
    const log = this.activeLogs.get(logId);

    if (!log) {
      console.warn(`RekLog: No active log found for ID ${logId}`);
      return;
    }

    const responseTime = performance.now() - log.startTime;

    if (this.debug) {
      console.log('RekLog.end() options:', options);
    }

    const logData = {
      endpoint: log.endpoint,
      method: log.method,
      responseTime,
      statusCode: options.statusCode || 200,
      environment: options.environment || this.environment,
      host: this.host,
      body: options.body || null,
      params: options.params || null,
      requestHeaders: options.requestHeaders || null,
      response: options.response || null,
      metadata: options.metadata || {}
    };

    this.activeLogs.delete(logId);

    await this.sendLog(logData);
  }

  /**
   * Send log data to server with retry mechanism
   * @param {object} logData - The log data to send
   * @param {number} attempt - Current retry attempt
   */
  async sendLog(logData, attempt = 1) {
    try {
      if (this.debug) {
        console.log('RekLog sending:', JSON.stringify(logData, null, 2));
      }

      await axios.post(`${this.apiUrl}/logs`, logData, {
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      if (this.debug) {
        console.log('RekLog sent successfully');
      }
    } catch (error) {
      if (attempt < this.retryAttempts) {
        console.warn(`RekLog: Failed to send log (attempt ${attempt}/${this.retryAttempts}). Retrying...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        return this.sendLog(logData, attempt + 1);
      } else {
        console.error('RekLog: Failed to send log after multiple attempts:', error.message);
      }
    }
  }

  /**
   * Express middleware for automatic request logging
   * @returns {Function} Express middleware function
   */
  middleware() {
    return (req, res, next) => {
      const logId = this.start(req.path, req.method);
      const startTime = performance.now();

      const originalSend = res.send;
      const self = this;

      res.send = function(data) {
        const responseTime = performance.now() - startTime;

        // Parse response
        let response = null;
        try {
          if (data && typeof data === 'string') {
            response = JSON.parse(data);
          } else if (data && typeof data === 'object') {
            response = data;
          }
        } catch (e) {
          // Response not JSON, ignore
        }

        const logData = {
          endpoint: req.path,
          method: req.method,
          responseTime,
          statusCode: res.statusCode,
          environment: self.environment,
          host: self.host || req.get('host') || null,
          // Request body (for POST, PUT, PATCH)
          body: req.body || null,
          // Query parameters (for GET)
          params: req.query && Object.keys(req.query).length > 0 ? req.query : null,
          // Request headers (selected headers)
          requestHeaders: {
            'content-type': req.get('content-type'),
            'user-agent': req.get('user-agent'),
            'accept': req.get('accept')
          },
          // Response (optional, can be removed if too large)
          response: response,
          metadata: {
            routeParams: req.params
          }
        };

        self.sendLog(logData).catch(err => {
          console.error('RekLog middleware error:', err.message);
        });

        self.activeLogs.delete(logId);
        originalSend.call(this, data);
      };

      next();
    };
  }
}

/**
 * Initialize RekLog with API key
 * @param {string} apiKey - Your RekLog API key
 * @param {object} options - Configuration options
 * @returns {RekLog} RekLog instance
 */
function init(apiKey, options = {}) {
  return new RekLog(apiKey, options);
}

module.exports = {
  init,
  RekLog
};
