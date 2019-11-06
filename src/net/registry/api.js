const url = require("url");

module.exports = class RegistryApiServer {
	constructor(app) {
		this.app = app;
		this.routes = new Map();
		this.routes.set("/register", this.register.bind(this));
		this.routes.set("/login", this.login.bind(this));
		this.routes.set("/logout", this.logout.bind(this));
		this.routes.set("/publish", this.publish.bind(this));
	}
	
	initialize() {
		this.app.server.addRoute({path: "/registry/api/*", method: "ALL", handle: this.handle.bind(this)});
	}

	async handle(req, res) {
		let path = url.parse(req.url).pathname;
		path = path.substring("/registry/api".length, path.length);

		if(!this.routes.has(path)) return true;

		await this.routes.get(path)(req, res);
	}

	async register(req, res) {
		this.app.logger.timing("RegistryApiServer.register");

		let data = await this.app.server.waitForJSONData(req);

		let username = data.username;
		let password = data.password;

		if(username === undefined || password === undefined) {
			res.statusCode = 400;
			res.end(JSON.stringify({status: 400, message: "The username and/or password were not supplied"}));

			return this.app.logger.warn(`register request for a user denied (no username/password) in ${this.app.logger.timing("RegistryApiServer.register")}`);
		}

		let user = await this.app.registry.users.get(username);

		if(user) {
			res.statusCode = 400;
			res.end(JSON.stringify({status: 400, message: "The username is already used"}));

			return this.app.logger.warn(`register request for a user denied (username taken) in ${this.app.logger.timing("RegistryApiServer.register")}`);
		}

		this.app.registry.users.create({username, password})
		.then(user => {
			res.end(JSON.stringify({status: 200, username: user.username}));

			this.app.logger.debug(`register request for ${username} handled successfully in ${this.app.logger.timing("RegistryApiServer.register")}`);

		})
		.catch(err => {
			res.statusCode = 500; 
			res.end(JSON.stringify({status: 500, message: "The server has made an oopsy"}));

			this.app.logger.error(`an error occured while trying to register ${username} (${err.message})`);
		});
	}

	async login(req, res) {
		this.app.logger.timing("RegistryApiServer.login");

		let data = await this.app.server.waitForJSONData(req);

		let username = data.username;
		let password = data.password;

		if(username === undefined || password === undefined) {
			res.statusCode = 400;
			res.end(JSON.stringify({status: 400, message: "The username and/or password is incorrect"}));

			return this.app.logger.warn(`login request for a user denied (incorrect username/password) in ${this.app.logger.timing("RegistryApiServer.login")}`);
		} 

		this.app.registry.users.login({username, password})
		.then(token => {
			if(token === undefined) {
				res.statusCode = 400; 
				res.end(JSON.stringify({status: 400, message: "The username and/or password is incorrect"}));

				this.app.logger.warn(`login request for a user denied (incorrect username/password) in ${this.app.logger.timing("RegistryApiServer.login")}`);
			}
			else {
				res.end(JSON.stringify({status: 200, token, username}));

				this.app.logger.debug(`login request for ${username} handled successfully in ${this.app.logger.timing("RegistryApiServer.login")}`);
			}
		})
		.catch(err => {
			res.statusCode = 500; 
			res.end(JSON.stringify({status: 500, message: "The server has made an oopsy"}));

			this.app.logger.error(`an error occured while trying to login ${username} (${err.message})`);
		});
	}

	logout(req, res) {
		this.app.logger.timing("RegistryApiServer.logout");

		this.app.registry.users.logout(this.app.server.getToken(req))
		.then(username => {
			if(username === undefined) {
				res.statusCode = 400;
				res.end(JSON.stringify({status: 400, message: "The supplied token was incorrect"}));

				this.app.logger.warn(`logout request for a user denied (incorrect token) in ${this.app.logger.timing("RegistryApiServer.logout")}`);
			}
			else {
				res.end(JSON.stringify({status: 200, username}));

				this.app.logger.debug(`logout request for ${username} handled successfully in ${this.app.logger.timing("RegistryApiServer.logout")}`);
			}
		})
		.catch(err => {
			res.statusCode = 500; 
			res.end(JSON.stringify({status: 500, message: "The server has made an oopsy"}));

			this.app.logger.error(`an error occured while trying to logout a user (${err.message})`);
		});
	}

	async publish(req, res) {
		this.app.logger.timing("RegistryApiServer.publish");

		let data = await this.app.server.waitForData(req);
		let user = await this.app.registry.users.getFromToken(this.app.server.getToken(req));

		if(user === undefined) {
			res.statusCode = 400;
			res.end(JSON.stringify({status: 400, message: "The supplied token was incorrect"}));
			
			return this.app.logger.warn(`publish request for ${name} denied (non-existant user) in ${this.app.logger.timing("RegistryApiServer.publish")}`);
		}

		let config;
		let configData = String(data).split("\n\n").shift();
		let zip = data.slice(configData.length + 2);

		try {
			config = JSON.parse(configData);
		} 
		catch {
			res.statusCode = 400;
			res.end(JSON.stringify({status: 400, message: "The config was incorrect"}));

			return this.app.logger.warn(`publish request for ${name} denied (incorrect config) in ${this.app.logger.timing("RegistryApiServer.publish")}`);
		}

		if(config.author !== user.username && config.contributors !== undefined && !config.contributors.includes(user.username)) {
			res.statusCode = 403;
			res.end(JSON.stringify({status: 403, message: "You aren't a contributor or the author of this librimod"}));

			return this.app.logger.warn(`publish request for ${name} denied (not-contributor) in ${this.app.logger.timing("RegistryApiServer.publish")}`);
		}

		this.app.registry.publish(config, zip, user)
		.then(name => {
			if(name === undefined) {
				res.statusCode = 400;
				res.end(JSON.stringify({status: 400, message: "The config was incorrect"}));

				this.app.logger.info(`publish request for ${name} handled successfully in ${this.app.logger.timing("RegistryApiServer.publish")}`);
			}
			else {
				res.end(JSON.stringify({status: 200, name}));

				this.app.logger.warn(`publish request for ${name} denied (incorrect config) in ${this.app.logger.timing("RegistryApiServer.publish")}`);
			}
		})
		.catch(err => {
			res.statusCode = 500; 
			res.end(JSON.stringify({status: 500, message: "The server has made an oopsy"}));

			this.app.logger.error(`an error occured while trying to publish ${config.name} (${err.message})`);
		});
	}
}