class CircuitBreaker {
    constructor(action, options = {}) {
      this.action = action;
      this.state = 'CLOSED';
      this.failureCount = 0;
      this.successCount = 0;
      this.nextAttempt = Date.now();
      this.options = {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 10000,
        ...options
      };
    }
  
    async fire(...args) {
      if (this.state === 'OPEN') {
        if (this.nextAttempt <= Date.now()) {
          this.state = 'HALF';
        } else {
          throw new Error('Service unavailable');
        }
      }
  
      try {
        const result = await this.action(...args);
        this.success();
        return result;
      } catch (err) {
        this.fail();
        throw err;
      }
    }
  
    success() {
      this.failureCount = 0;
      if (this.state === 'HALF') {
        this.successCount++;
        if (this.successCount > this.options.successThreshold) {
          this.state = 'CLOSED';
        }
      }
    }
  
    fail() {
      this.failureCount++;
      if (this.failureCount >= this.options.failureThreshold) {
        this.state = 'OPEN';
        this.nextAttempt = Date.now() + this.options.timeout;
      }
    }
  }
  
  module.exports = { CircuitBreaker };