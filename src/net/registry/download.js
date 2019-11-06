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
		this.app.logger.timing("RegistryDownloadServer.handle");

		let pathname = url.parse(req.url).pathname;
		pathname = pathname.substring("/registry/download/".length, pathname.length);

		let args = pathname.split("/");

		if(args.length > 2 || args.length === 0) {
			res.statusCode = 400;
			res.end(JSON.stringify({status: 400, message: "The requested query is incorrect"}));

			this.app.logger.warn(`download request denied (incorrect query) in ${this.logger.timing("RegistryDownloadServer.handle")}`);

			return;
		}

		let librimod = await this.app.registry.get(args[0]);

		if(librimod == undefined) {
			res.statusCode = 404;
			res.end(JSON.stringify({status: 404, message: "The requested librimod doesn't exist"}));

			this.app.logger.warn(`download request denied (non-existant librimod) in ${this.logger.timing("RegistryDownloadServer.handle")}`);
			
			return;
		}

		this.app.logger.timingMove("RegistryDownloadServer.handle", `RegistryDownloadServer.handle.${librimod.name}`);

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

			this.app.logger.warn(`download request denied for ${librimod.name} (non-existant version) in ${this.app.logger.timing(`RegistryDownloadServer.handle.${librimod.name}`)}`);
			
			return;
		}

		res.setHeader("Content-Type", "application/x-gtar");
		res.setHeader("Content-Disposition", `attachment; filename=${librimod.name}-${version}.tar.gz`);

		let stream = fs.createReadStream(path.join(this.app.root, `./data/librimods/${librimod.name}/${librimod.name}-${version}.tar.gz`));
		stream.pipe(res);
		stream.on("close", () => {
			this.app.logger.debug(`download request for ${librimod.name} successfully handled in ${this.app.logger.timing(`RegistryDownloadServer.handle.${librimod.name}`)}`);
		});
	}
}