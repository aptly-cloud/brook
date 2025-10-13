/**
 * Exponential backoff implementation with 1.5x multiplier and jitter.
 * Prevents thundering herd problem during reconnection scenarios.
 */

/**
 * Manages exponential backoff timing for reconnection attempts.
 */
class ExponentialBackoff {
	/**
	 * Creates a new ExponentialBackoff instance.
	 *
	 * @param {Object} options - Configuration options.
	 * @param {number} [options.initialDelay=3000] - Initial delay in milliseconds.
	 * @param {number} [options.multiplier=1.5] - Backoff multiplier factor.
	 * @param {number} [options.maxDelay=30000] - Maximum delay cap in milliseconds.
	 * @param {number} [options.jitter=0.1] - Jitter factor (0-1) to add randomness.
	 * @param {number} [options.maxAttempts=Infinity] - Maximum number of attempts.
	 * @param {Log} log - Log instance.
	 */
	constructor(options = {}) {
		this.initialDelay = options.initialDelay || 3000; // 3 seconds
		this.multiplier = options.multiplier || 1.5; // 1.5x multiplier as per PRP
		this.maxDelay = options.maxDelay || 30000; // 30 seconds max
		this.jitter = options.jitter || 0.1; // 10% jitter
		this.maxAttempts = options.maxAttempts || Infinity;

		this.attempts = 0;
		this.currentDelay = this.initialDelay;
		this.log = options.log;
	}

	/**
	 * Gets the next delay value with exponential backoff and jitter.
	 *
	 * @returns {number} Delay in milliseconds for the next attempt.
	 */
	getDelay() {
		if (this.attempts >= this.maxAttempts) {
			throw new Error('Maximum reconnection attempts exceeded');
		}

		this.attempts += 1;

		// Calculate base delay with exponential backoff
		let delay = this.currentDelay;

		// Apply jitter to prevent thundering herd
		// Jitter adds randomness between -jitter% and +jitter%
		const jitterAmount = delay * this.jitter;
		const jitterOffset = (Math.random() * 2 - 1) * jitterAmount;
		delay += jitterOffset;

		// Ensure delay is positive and within bounds
		delay = Math.max(100, Math.min(delay, this.maxDelay));

		// Update current delay for next attempt
		this.currentDelay = Math.min(
			this.currentDelay * this.multiplier,
			this.maxDelay
		);

		return Math.floor(delay);
	}

	/**
	 * Resets the backoff state after a successful connection.
	 *
	 * @returns {void}
	 */
	reset() {
		this.attempts = 0;
		this.currentDelay = this.initialDelay;
	}

	/**
	 * Gets the current number of attempts made.
	 *
	 * @returns {number} Number of connection attempts.
	 */
	getAttempts() {
		return this.attempts;
	}

	/**
	 * Checks if maximum attempts have been reached.
	 *
	 * @returns {boolean} True if max attempts exceeded.
	 */
	isMaxAttemptsReached() {
		return this.attempts >= this.maxAttempts;
	}

	/**
	 * Gets the next delay without incrementing the attempt counter.
	 * Useful for previewing the next delay value.
	 *
	 * @returns {number} Next delay in milliseconds.
	 */
	peekNextDelay() {
		let delay = this.currentDelay * this.multiplier;
		delay = Math.min(delay, this.maxDelay);

		// Apply jitter
		const jitterAmount = delay * this.jitter;
		const jitterOffset = (Math.random() * 2 - 1) * jitterAmount;
		delay += jitterOffset;

		return Math.max(100, Math.floor(delay));
	}

	/**
	 * Creates a promise that resolves after the backoff delay.
	 * Convenient for async/await usage patterns.
	 *
	 * @returns {Promise<number>} Promise resolving to the delay used.
	 */
	async wait() {
		const delay = this.getDelay();

		return new Promise((resolve) => {
			setTimeout(() => {
				resolve(delay);
			}, delay);
		});
	}

	/**
	 * Gets configuration summary for debugging.
	 *
	 * @returns {Object} Configuration and state information.
	 */
	getStatus() {
		return {
			attempts: this.attempts,
			currentDelay: this.currentDelay,
			nextDelay: this.attempts < this.maxAttempts ? this.peekNextDelay() : null,
			maxAttempts: this.maxAttempts,
			config: {
				initialDelay: this.initialDelay,
				multiplier: this.multiplier,
				maxDelay: this.maxDelay,
				jitter: this.jitter,
			},
		};
	}
}

export default ExponentialBackoff;
