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
		let data = await this.app.server.waitForJSONData(req);

		let username = data.username;
		let password = data.password;

		if(username === undefined || password === undefined) {
			res.statusCode = 400;

			return res.end(JSON.stringify({status: 400, message: "The username and/or password were not supplied"}));
		}

		let user = await this.app.registry.users.get(username);

		if(user) {
			res.statusCode = 400; 

			return res.end(JSON.stringify({status: 400, message: "The username is already used"}));
		}

		this.app.registry.users.create({username, password})
		.then(user => res.end(JSON.stringify({status: 200, username: user.username})))
		.catch(error => {
			console.error(error);
			
			res.statusCode = 500; 
			res.end(JSON.stringify({status: 500, message: "The server has made an oopsy"}));
		});
	}

	async login(req, res) {
		let data = await this.app.server.waitForJSONData(req);

		let username = data.username;
		let password = data.password;

		if(username === undefined || password === undefined) {
			res.statusCode = 400; 
			
			return res.end(JSON.stringify({status: 400, message: "The username and/or password is incorrect"}));
		} 

		this.app.registry.users.login({username, password})
		.then(token => {
			if(token === undefined) {
				res.statusCode = 400; 
				res.end(JSON.stringify({status: 400, message: "The username and/or password is incorrect"}));
			}
			else res.end(JSON.stringify({status: 200, token, username}))
		})
		.catch(error => {
			console.error(error);

			res.statusCode = 500; 
			res.end(JSON.stringify({status: 500, message: "The server has made an oopsy"}));
		});
	}

	logout(req, res) {
		this.app.registry.users.logout(this.app.server.getToken(req))
		.then(username => {
			if(username === undefined) {
				res.statusCode = 400;
				res.end(JSON.stringify({status: 400, message: "The supplied token was incorrect"}));
			}
			else res.end(JSON.stringify({status: 200, username}));
		})
		.catch(error => {
			console.error(error);

			res.statusCode = 500; 
			res.end(JSON.stringify({status: 500, message: "The server has made an oopsy"}));
		});
	}

	async publish(req, res) {
		let data = await this.app.server.waitForData(req);
		let user = await this.app.registry.users.getFromToken(this.app.server.getToken(req));

		data = data.split("\n\n");
		if(user === undefined) {
			res.statusCode = 400;

			return res.end(JSON.stringify({status: 400, message: "The supplied token was incorrect"}));
		}

		let config;
		let zip = data[1];

		try {
			config = JSON.parse(data[0]);
		} 
		catch {
			res.statusCode = 400;

			return res.end(JSON.stringify({status: 400, message: "The config was incorrect"}));
		}

		if(config.author !== user.username && config.contributors !== undefined && !config.contributors.includes(user.username)) {
			res.statusCode = 403;

			return res.end(JSON.stringify({status: 403, message: "You aren't a contributor or the author of this librimod"}));
		}

		this.app.registry.publish(config, zip, user)
		.then(name => {
			if(name === undefined) {
				res.statusCode = 400;
				res.end(JSON.stringify({status: 400, message: "The config was incorrect"}));
			}
			else res.end(JSON.stringify({status: 200, name}));
		})
		.catch(error => {
			console.error(error);

			res.statusCode = 500; 
			res.end(JSON.stringify({status: 500, message: "The server has made an oopsy"}));
		});
	}
}