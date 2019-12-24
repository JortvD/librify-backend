const path = require("path");
const Logger = require("./logger");
const Server = require("./net/server");
const DatabaseHandler = require("./db/handler");
const RegistryManager = require("./registry/manager");
const GamesManager = require("./games/manager");

module.exports = class Application {
	constructor() {
		this.root = path.join(__dirname, "../");
		this.logger = new Logger().create();
		this.db = new DatabaseHandler(this, "librify");
		this.server = new Server(this);
		this.registry = new RegistryManager(this);
		this.games = new GamesManager(this);
	}

	async start() {
		this.logger.debug("starting application").timing("Application.start");

		await this.db.connect();
		await this.server.start();
		this.registry.initialize();
		this.games.initialize();

		this.logger.info(`started application in ${this.logger.timing("Application.start")}`);
	}

	async stop() {
		this.logger.debug("stopping application").timing("Application.stop");

		await this.server.stop();
		await this.db.terminate();

		this.logger.info(`stopped application in ${this.logger.timing("Application.stop")}`);
	}
}