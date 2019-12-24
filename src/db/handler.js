const MongoClient = require("mongodb").MongoClient;

module.exports = class DatabaseHandler {
	constructor(app, databaseName) {
		this.app = app;
		this.databaseName = databaseName;
		this.client = new MongoClient("mongodb://localhost:27017/", {
			useNewUrlParser: true,
			useUnifiedTopology: true
		});
	}

	async connect() {
		this.app.logger.timing("DatabaseHandler.connect");

		this.db = (await this.client.connect()).db(this.databaseName);

		this.app.logger.debug(`connected to database ${this.databaseName} in ${this.app.logger.timing("DatabaseHandler.connect")}`);
	}

	async terminate() {
		this.app.logger.timing("DatabaseHandler.terminate");

		await this.app.db.close();

		this.app.logger.debug(`terminated database in ${this.app.logger.timing("DatabaseHandler.terminate")}`);
	}

	collection(name) {
		return this.db.collection(name);
	}

	async close() {
		this.app.logger.timing("DatabaseHandler.close");

		await this.client.close();

		this.app.logger.debug(`closed database ${this.databaseName} in ${this.app.logger.timing("DatabaseHandler.close")}`);
	}
}