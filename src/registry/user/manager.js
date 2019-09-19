const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const util = require("util");
const shortid = require("shortid");
const keys = require("../../../secrets.json");

module.exports = class RegistryUserManager {
	constructor(app) {
		this.app = app;
	}

	initialize() {
		this.collection = this.app.registry.db.collection("users");
	}

	get(username) {
		return this.collection.findOne({username});
	}

	async getFromToken(token) {
		let username;
		
		try {
			username = (await util.promisify(jwt.verify)(token, keys.secret)).iss;
		}
		catch {
			return;
		}

		return await this.get(username);
	}

	create({username, password}) {
		let hashedPassword = crypto.createHash("sha512").update(password).digest("hex");

		return this.collection.insertOne({username, password: hashedPassword, tokens: {}});
	}

	async login({username, password}) {
		let hashedPassword = crypto.createHash("sha512").update(password).digest("hex");

		let user = await this.get(username);

		if(user.password !== hashedPassword) return;

		let subject = shortid(16);
		let token = await util.promisify(jwt.sign)({}, keys.secret, {issuer: user.username, subject});

		user.tokens[subject] = token;

		await this.collection.findOneAndReplace({username}, user);

		return token;
	}

	async logout(token) {
		let user = await this.getFromToken(token);

		if(user === undefined) return;
		
		let subject = jwt.decode(token).sub;

		if(subject === undefined) return;

		delete user.tokens[subject];

		await this.collection.findOneAndReplace({username: user.username}, user);

		return user.username;
	}
}