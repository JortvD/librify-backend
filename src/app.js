const path = require("path");
const Logger = require("./logger");
const Server = require("./net/server");
const RegistryManager = require("./registry/manager");

module.exports = class Application {
	constructor() {
		this.root = path.join(__dirname, "../");
		this.logger = new Logger().create();
		this.server = new Server(this);
		this.registry = new RegistryManager(this);
	}

	async start() {
		this.logger.debug("starting application").timing("Application.start");

		await this.server.start();
		await this.registry.initialize();

		this.logger.info(`started application in ${this.logger.timing("Application.start")}`);
	}

	async stop() {
		this.logger.debug("stopping application").timing("Application.stop");

		await this.server.stop();
		await this.registry.terminate();

		this.logger.info(`stopped application in ${this.logger.timing("Application.stop")}`);
	}
}