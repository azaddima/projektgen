// Express init

const express = require("express");
const app = express();

// body-parser init

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));

// ejs initialisieren

app.engine(".ejs", require("ejs").__express);
app.set("view engine", "ejs");

// Server starten
const port = 3001;
app.listen(port, function() {
	console.log("listening to port" + port);
});

// Startseite
app.get("/", (request,response) => {
	response.sendFile(__dirname + "/index.html");
});

// boyysss