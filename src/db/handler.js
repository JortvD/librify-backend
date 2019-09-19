const MongoClient = require("mongodb").MongoClient;

module.exports = class DatabaseHandler {
	constructor(databaseName) {
		this.databaseName = databaseName;
		this.client = new MongoClient("mongodb://localhost:27017/", {
			useNewUrlParser: true,
			useUnifiedTopology: true
		});
	}

	async connect() {
		this.db = (await this.client.connect()).db("librimods");
	}

	collection(name) {
		return this.db.collection(name);
	}

	close() {
		return this.client.close();
	}
}