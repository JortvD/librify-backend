const path = require("path");
const Server = require("./net/server");
const RegistryManager = require("./registry/manager");

module.exports = class Application {
	constructor() {
		this.root = path.join(__dirname, "../");
		this.server = new Server(this);
		this.registry = new RegistryManager(this);
	}

	async start() {
		await this.server.start();
		await this.registry.initialize();
	}

	async stop() {
		await this.server.stop();
		await this.registry.terminate();
	}
}