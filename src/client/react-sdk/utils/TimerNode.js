/**
 * Timer node for linked list implementation.
 * Represents a single timeout operation in the queue.
 */
export default class TimerNode {
	/**
	 * Creates a new timer node.
	 *
	 * @param {Function} callback - Function to execute when timer fires.
	 * @param {number} delay - Delay in milliseconds before execution.
	 */
	constructor(callback, delay) {
		this.callback = callback;
		this.delay = delay;
		this.next = null;
		this.timeoutId = null;
	}

	/**
	 * Sets the next node in the queue.
	 *
	 * @param {TimerNode} next - The next timer node.
	 */
	setNext(next) {
		this.next = next;
	}

	/**
	 * Executes this timer node and schedules the next one.
	 *
	 * @param {Function} onComplete - Callback when this node completes.
	 */
	execute(onComplete) {
		this.timeoutId = setTimeout(() => {
			try {
				this.callback?.();
			} catch (error) {
				console.error('Timer callback error:', error);
			}
			onComplete(this.next);
		}, this.delay);
	}

	/**
	 * Cancels the timeout if it hasn't executed yet.
	 */
	cancel() {
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
	}
}