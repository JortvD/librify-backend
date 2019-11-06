const url = require("url");
const toSemver = require("to-semver");

module.exports = class RegistryVersionServer {
	constructor(app) {
		this.app = app;
	}
	
	initialize() {
		this.app.server.addRoute({path: "/registry/version/*", method: "ALL", handle: this.handle.bind(this)});
	}

	async handle(req, res) {
		let pathname = url.parse(req.url).pathname;
		pathname = pathname.substring("/registry/version/".length, pathname.length);

		let args = pathname.split("/");

		if(args.length > 1 || args.length === 0) {
			res.statusCode = 400;
			res.end(JSON.stringify({status: 400, message: "The requested query is incorrect"}));

			return;
		}

		let librimod = await this.app.registry.get(args[0]);

		if(librimod == undefined) {
			res.statusCode = 404;
			res.end(JSON.stringify({status: 404, message: "The requested librimod doesn't exist"}));
			
			return;
		}

		let versions = toSemver(librimod.versions.map(version => version.value));

		res.end(versions[0]);
	}
}