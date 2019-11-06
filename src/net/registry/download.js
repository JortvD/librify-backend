const url = require("url");
const fs = require("fs");
const path = require("path");
const toSemver = require("to-semver");
const semver = require("semver");

module.exports = class RegistryDownloadServer {
	constructor(app) {
		this.app = app;
	}
	
	initialize() {
		this.app.server.addRoute({path: "/registry/download/*", method: "ALL", handle: this.handle.bind(this)});
	}

	async handle(req, res) {
		let pathname = url.parse(req.url).pathname;
		pathname = pathname.substring("/registry/download/".length, path.length);

		let args = pathname.split("/");

		if(args.length > 2 || args.length === 0) {
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

		let versions = librimod.versions.map(version => version.value);
		let version;

		if(args[1] === "latest" || args[1] === undefined) {
			version = toSemver(versions, {includePrereleases: false})[0];
		}

		if(!version) version = versions.find(version => version === args[1]);
		if(!version) version = toSemver(versions).find(version => semver.satisfies(version, args[1]));

		if(!version) {
			res.statusCode = 404;
			res.end(JSON.stringify({status: 404, message: "The requested version is not available"}));
			
			return;
		}

		res.setHeader("Content-Type", "application/x-gtar");
		res.setHeader("Content-Disposition", `attachment; filename=${librimod.name}-${version}.tar.gz`);

		fs.createReadStream(path.join(this.app.root, `./data/librimods/${librimod.name}/${librimod.name}-${version}.tar.gz`)).pipe(res);
	}
}