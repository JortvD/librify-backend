const Application = require("./src/app");
const app = new Application();

app.start()
.then(() => console.log("Librify-backend has started"))
.catch(e => {throw e})