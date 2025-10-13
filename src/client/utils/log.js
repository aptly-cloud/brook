export default class Log {
	constructor(config) {
		this.verbose = config.verbose;
	}

	info(...args) {
		if (this.verbose) {
			console.log(...args);
		}
	}

	error(...args) {
		if (this.verbose) {
			console.error(...args);
		}
	}

	warn(...args) {
		if (this.verbose) {
			console.warn(...args);
		}
	}

	debug(...args) {
		if (this.verbose) {
			console.debug(...args);
		}
	}
}

function info(...args) {
	if (process.env.NODE_ENV === 'development') {
		console.log(...args);
	}
}

function error(...args) {
	if (process.env.NODE_ENV === 'development') {
		console.error(...args);
	}
}

function warn(...args) {
	if (process.env.NODE_ENV === 'development') {
		console.warn(...args);
	}
}

function debug(...args) {
	if (process.env.NODE_ENV === 'development') {
		console.debug(...args);
	}
}

export { info, error, warn, debug };
