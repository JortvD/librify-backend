const winston = require("winston");
const path = require("path");
const prettyMilliseconds = require("pretty-ms");

module.exports = class Logger {
	constructor() {
		this.tags = new Map();
	}

	isProduction() {
		return process.env.NODE_ENV !== "development";
	}

	create() {
		const defaultFormat = winston.format.combine(
			winston.format.timestamp(),
			winston.format.json()
		);

		const logger = new winston.createLogger({
			transports: [
				new winston.transports.File({
					format: defaultFormat,
					level: this.isProduction() ? "info" : "debug",
					filename: path.join(process.cwd(), "logs/info.log"),
				}),
				new winston.transports.File({
					format: defaultFormat,
					level: "error",
					filename: path.join(process.cwd(), "logs/error.log"),
				})
			],
			exceptionHandlers: [
				new winston.transports.File({
					format: defaultFormat,
					filename: path.join(process.cwd(), "logs/exceptions.log"),
				})
			]
		});

		logger.timing = tag => {
			let newTime = new Date().getTime();
			let oldTime = this.tags.get(tag) || new Date().getTime();

			this.tags.set(tag, newTime);

			return prettyMilliseconds(newTime - oldTime);
		}

		logger.timingMove = (oldTag, newTag) => {
			this.tags.set(newTag, this.tags.get(oldTag));
		}

		if(this.isProduction()) {
			return logger;
		}

		logger.add(new winston.transports.Console({
			format: winston.format.simple(),
			level: "debug"
		}));

		return logger;
	}
}