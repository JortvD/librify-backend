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
		let responseData = {};

		console.log(data);

		this.app.logger.timingMove("GamesGetServer.handle", `GamesGetServer.handle.${games.map(game => game.id || game.name).join(".")}`);

		for(let game of games) {
			if(!game.name && !game.id) continue;

			let cachedGame = await this.app.games.get({name: game.name, id: game.id});

			// TODO: Check if game.name is safe

			if(cachedGame === null) {
				await this.app.games.add({
					name: game.name,
					version: semver.valid(game.version) ? game.version : "0.0.0"
				});

				cachedGame = game;
			}
			else if(semver.lt(cachedGame.version, game.version) && semver.valid(game.version)) {
				cachedGame.version = game.version;
				await this.app.games.update(cachedGame, game.version);
			}

			responseData[game.name] = {
				id: cachedGame.id,
				name: cachedGame.name,
				version: cachedGame.version
			}
		}

		res.end(JSON.stringify(responseData));

		this.app.logger.debug(`get request for ${games.map(game => game.id || game.name).join(", ")} successfully handled in ${this.app.logger.timing(`GamesGetServer.handle.${games.map(game => game.id || game.name).join(".")}`)}`);
	}
}