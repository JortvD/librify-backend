const shortid = require("shortid");
const semver = require("semver");
const GamesGetServer = require("../net/games/get");

module.exports = class GameManager {
	constructor(app) {
		this.app = app;

		this.getServer = new GamesGetServer(this.app);
	}

	initialize() {
		this.app.logger.timing("GameManager.initialize");

		this.collection = this.app.db.collection("games");
		this.getServer.initialize();
		//this.updateServer.initialize();

		this.app.logger.debug(`initialized games in ${this.app.logger.timing("GameManager.initialize")}`);
	}

	add({name, version}) {
		return this.collection.insertOne({name, version, id: shortid()});
	}

	get({id, name}) {
		return this.collection.findOne({id, name});
	}

	async update(game, version) {
		let gameObj = typeof game === "object" ? game : await this.get({id});
		gameObj.version = version;

		await this.collection.findOneAndReplace({id: gameObj.id}, gameObj);
	}
}