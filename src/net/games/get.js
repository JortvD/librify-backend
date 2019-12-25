const semver = require("semver");

module.exports = class GamesGetServer {
	constructor(app) {
		this.app = app;
	}
	
	initialize() {
		this.app.server.addRoute({path: "/games/get", method: "POST", handle: this.handle.bind(this)});
	}

	async handle(req, res) {
		this.app.logger.timing("GamesGetServer.handle");

		let data = await this.app.server.waitForJSONData(req);
		let games = data.games;
		let responseData = {games: []};

		this.app.logger.timingMove("GamesGetServer.handle", `GamesGetServer.handle.${games.map(game => game.id || game.name).join(".")}`);

		for(let game of games) {
			if(!game.name && !game.id) continue;

			let query;

			if(game.id) query = {id: game.id};
			else query = {name: game.name};

			let cachedGame = await this.app.games.get(query);

			// TODO: Check if game.name is safe

			if(cachedGame === null) {
				cachedGame = await this.app.games.add({
					name: game.name,
					version: semver.valid(game.version) ? game.version : "0.0.0"
				});
			}
			else if(semver.valid(game.version) && semver.lt(cachedGame.version, game.version)) {
				cachedGame.version = game.version;
				await this.app.games.update(cachedGame, game.version);
			}

			responseData.games.push({
				id: cachedGame.id,
				name: cachedGame.name,
				version: cachedGame.version
			});
		}

		res.end(JSON.stringify(responseData));

		this.app.logger.debug(`get request for ${games.length} games successfully handled in ${this.app.logger.timing(`GamesGetServer.handle.${games.map(game => game.id || game.name).join(".")}`)}`);
	}
}