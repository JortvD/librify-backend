const onExit = require("async-exit-hook");
const Application = require("./src/app");
const app = new Application();

app.start();

onExit(callback => {
	app.stop().then(() => callback());
});

onExit.uncaughtExceptionHandler(err => {
    app.logger.error(err);
});

onExit.unhandledRejectionHandler(err => {
    app.logger.error(err);
});