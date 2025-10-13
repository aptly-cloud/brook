import TimerNode from './TimerNode';

/**
 * Sequential timer implementation using a linked list.
 * Executes timeouts one after another in the order they were added.
 */
export default class Timer {
	/**
	 * Creates a new Timer instance.
	 */
	constructor() {
		this.head = null;
		this.tail = null;
		this.isExecuting = false;
	}

	/**
	 * Adds a timeout to the execution queue.
	 *
	 * @param {Function} callback - Function to execute when timer fires.
	 * @param {number} delay - Delay in milliseconds before execution.
	 * @returns {TimerNode} The created timer node for potential cancellation.
	 */
	setTimeout(callback, delay) {
		const node = new TimerNode(callback, delay);

		// Add to queue
		if (!this.head) {
			this.head = node;
			this.tail = node;
			this._startExecution();
		} else {
			this.tail.setNext(node);
			this.tail = node;
		}

		return node;
	}

	/**
	 * Starts executing the timer queue.
	 *
	 * @private
	 */
	_startExecution() {
		if (this.isExecuting || !this.head) return;

		this.isExecuting = true;
		this._executeNext(this.head);
	}

	/**
	 * Executes the next timer in the queue.
	 *
	 * @param {TimerNode} currentNode - The current node to execute.
	 * @private
	 */
	_executeNext(currentNode) {
		if (!currentNode) {
			this._onQueueComplete();
			return;
		}

		currentNode.execute((nextNode) => {
			this.head = nextNode;
			if (!nextNode) {
				this.tail = null;
			}
			this._executeNext(nextNode);
		});
	}

	/**
	 * Called when the timer queue is complete.
	 *
	 * @private
	 */
	_onQueueComplete() {
		this.isExecuting = false;
	}

	/**
	 * Clears all pending timers in the queue.
	 */
	clear() {
		let current = this.head;
		while (current) {
			current.cancel();
			current = current.next;
		}
		this.head = null;
		this.tail = null;
		this.isExecuting = false;
	}

	/**
	 * Checks if the timer queue is currently executing.
	 *
	 * @returns {boolean} True if executing, false otherwise.
	 */
	isRunning() {
		return this.isExecuting;
	}

	/**
	 * Gets the number of pending timers in the queue.
	 *
	 * @returns {number} Number of pending timers.
	 */
	getPendingCount() {
		let count = 0;
		let current = this.head;
		while (current) {
			count++;
			current = current.next;
		}
		return count;
	}
}