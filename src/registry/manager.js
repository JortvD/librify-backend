const fs = require("fs");
const path = require("path");
const util = require("util");
const semver = require("semver");
const RegistryApiServer = require("../net/registry/api");
const RegistryDownloadServer = require("../net/registry/download");
const RegistryVersionServer = require("../net/registry/version");
const RegistryUserManager = require("./user/manager");
const DatabaseHandler = require("../db/handler");

module.exports = class RegistryManager {
	constructor(app) {
		this.app = app;

		this.db = new DatabaseHandler(this.app, "librimods");
		this.users = new RegistryUserManager(this.app);
		this.apiServer = new RegistryApiServer(this.app);
		this.downloadServer = new RegistryDownloadServer(this.app);
		this.versionServer = new RegistryVersionServer(this.app);
	}

	async initialize() {
		this.app.logger.timing("RegistryManager.initialize");

		await this.db.connect();
		this.collection = this.db.collection("registry");
		this.users.initialize();
		this.apiServer.initialize();
		this.downloadServer.initialize();
		this.versionServer.initialize();

		this.app.logger.debug(`initialized registry in ${this.app.logger.timing("RegistryManager.initialize")}`);
	}

	async terminate() {
		this.app.logger.timing("RegistryManager.terminate");

		await this.db.close();

		this.app.logger.debug(`terminated registry in ${this.app.logger.timing("RegistryManager.terminate")}`);
	}
	
	get(name) {
		return this.collection.findOne({name});
	}

	async publish(config, data, user) {
		this.app.logger.timing("RegistryManager.publish");

		if(config.name === undefined || !semver.valid(config.version) || config.author === undefined) return;

		let librimod = await this.get(config.name);

		if(librimod === null) {
			librimod = {
				name: config.name,
				version: config.version,
				author: config.author,
				contributors: config.contributors || [],
				versions: [{value: config.version, createdAt: new Date().getTime(), updatedAt: new Date().getTime()}],
				createdAt: new Date().getTime(),
				updatedAt: new Date().getTime()
			};

			await this.collection.insertOne(librimod);
		}
		else {
			if(librimod.author !== user.username && !librimod.contributors.includes(user.username)) return;

			if(semver.gt(config.version, librimod.version)) {
				librimod.version = config.version;
			}

			if(!librimod.versions.find(version => version.value === config.version)) {
				librimod.versions.push({value: config.version, createdAt: new Date().getTime(), updatedAt: new Date().getTime()});
			}
			else {
				let newVersion = librimod.versions.find(version => version.value === config.version);
				newVersion.updatedAt = new Date().getTime();

				librimod.versions = librimod.versions.map(version => version.value === config.version ? newVersion : version);
			}

			if(librimod.contributors !== config.contributors && librimod.author === user.username) {
				librimod.contributors = config.contributors || [];
			}

			librimod.updatedAt = new Date().getTime();

			await this.collection.findOneAndReplace({name: librimod.name}, librimod);
		}

		let folder = path.join(this.app.root, `data/librimods/${librimod.name}`);

		if(!fs.existsSync(folder) || !(await util.promisify(fs.stat)(folder)).isDirectory()) {
			await util.promisify(fs.mkdir)(folder);
		}

		let file = path.join(folder, `${librimod.name}-${config.version}.tar.gz`);

		await util.promisify(fs.writeFile)(file, data);

		this.app.logger.debug(`published librimod ${librimod.name} in ${this.app.logger.timing("RegistryManager.publish")}`);

		return librimod.name;
	}
}