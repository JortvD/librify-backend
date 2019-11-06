const http = require("http");
const url = require("url");
const util = require("util");

module.exports = class Server {
	constructor(app) {
		this.app = app;
		this.server = http.createServer((req, res) => this.handle(req, res).catch(e => {throw e}));
		this.routes = [];
	}

	addRoute(route) {
		this.routes.push(route);
	}

	async handle(req, res) {
		let path = url.parse(req.url).pathname;
		
		this.app.logger.debug(`request received for ${path}`);

		for(let route of this.routes) {
			if(((route.path.endsWith("*") && path.startsWith(route.path.substring(0, route.path.length - 1))) || route.path === path) && (route.method === req.method || route.method === "ALL")) {
				let notFound = await route.handle(req, res);

				if(notFound) break;
				else return; 
			}
		}

		res.statusCode = 404;
		res.end("The requested page could not be found.");
	}

	waitForData(req) {
		let buffer = Buffer.from("");
		
		return new Promise(success => {
			req.on("data", chunk => buffer = Buffer.concat([buffer, chunk]));
			req.on("end", () => success(buffer));
		});
	}

	async waitForJSONData(req) {
		try {
			return JSON.parse(await this.waitForData(req));
		}
		catch {
			return {};
		}
	}

	getToken(req) {
		let authorization = req.headers.authorization;

		if(authorization === undefined) return;
		
		let authorizationArgs = authorization.split(" ");

		if(authorizationArgs[0] !== "Bearer") return;

		return authorizationArgs[1];
	}
	
	async start() {
		this.app.logger.timing("Server.start");

		await util.promisify(this.server.listen.bind(this.server))(80);

		this.app.logger.debug(`started server in ${this.app.logger.timing("Server.start")}`);
	}

	async stop() {
		this.app.logger.timing("Server.stop");

		await util.promisify(this.server.close.bind(this.server))();

		this.app.logger.debug(`stopped server in ${this.app.logger.timing("Server.stop")}`);
	}
}