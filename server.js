

// Express init

const express = require("express");
const app = express();

// css
app.use(express.static(__dirname + '/public'));

// body-parser init

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));

// ejs initialisieren

app.engine(".ejs", require("ejs").__express);
app.set("view engine", "ejs");

// Database setup
const DB_COLLECTION = 'users';
const DB_DEVICES = 'devices'
const Db = require('tingodb')().Db;
const db = new Db(__dirname + '/userdata', {})
const ObjectID = require('tingodb')().ObjectID


// password encryption
const passwordHash = require('password-hash'); 

// init session
const session = require("express-session");
app.use(session({
	secret: "example",
	resave: false,
	saveUninitialized: true,
}));


//// logic

// Server starten
const port = 3001;
app.listen(port, function() {
	console.log("listening to port" + port);
});

// Startseite
app.get("/", (request,response) => {

	let account = "Einloggen";
	let sendTo = "/user/login";

	// Try programm it in HTML!
	if(request.session.authenticated == true) {
		sendTo = "/user/myaccount"
		account = "My Account";

	}
	
	response.render("index", {'sendTo': sendTo, 'account': account});

});

// Global error message
let globalMessage = "";

app.get("/user/login", (request, response) => {
	response.render("login", {'message': globalMessage})
});

app.post("/user/login", (request,response) => {
	const username = request.body["username"];
	const password = request.body["password"];

	// looking for the given username
	db.collection(DB_COLLECTION).findOne({'username': username}, (error,result) => {

		// If account is found in databank
		if(result != null) {
			accExtists = true;	
			console.log(result.password);

			// if given password matches with account username
			// Uing passwordHash to decrypt the password and compare them
			if (passwordHash.verify(password,result.password)) {

				request.session['authenticated'] = true;
				request.session["username"] = username;
				response.redirect("/content");

			// wrong password given
			} else {
				console.log(error);
				response.render("login", {'message': "You password is wrong."});
			}			
		} 

		// username is not in the databank
		else {
			response.render("login", {'message': "The user " + '"' + username + '"' + " does not exist."});
		}
	});

});


// REGISTER

// Always have different ways to access to one side. Really important for user experience.

app.get("/user/register", (request, response) => {
	// "error" and "on" have to be initialized as empty objects, otherwise you get an error globalMessage.
	response.render('register', {"error": "","on": ""});
});


app.post("/user/registerverify", (request, response) => {
	const username = request.body["username"];
	const password = request.body["password"];
	const passwordrepeat = request.body["passwordrepeat"];
	const email = request.body["email"];
	const adress = request.body.adress
	const adressNr = request.body.adressNr;
	const place = request.body.place;
	const plz = request.body.plz
	let error = [];

	let allowRegister = true;


	// search for the username in database
	db.collection(DB_COLLECTION).findOne({'username': username}, (err,result) => {
		
		if(result == null) {
			
			// checks for mistakes in typed userdata
			if(username == "" || username == null) {
				error.push("Geben Sie einen Benutzernamen ein.");
			}
		
			if(password == "" || password == null){
				error.push("Geben Sie ein Passwort ein.");
		
			} else {
		
				if(passwordrepeat == "" || passwordrepeat == null) {
					error.push("Passwort bitte wiederholen.")
				} 
				else if(password != passwordrepeat) {
					error.push("Passwörter stimmen nicht überein.")
				}
			}
			
			// not needed due to updated html - html can check by itself if it's an email,
			// with type="email"
		
			if(email == "" || email == null || !email.includes("@")) {
				error.push("Bitte geben Sie eine korrekte E-Mail-Adresse an.")
			}

			if(adress == "" || adress == null) {
				error.push("Bitte geben Sie eine Adresse an.")
			} else {

				if(adressNr == "" || adressNr == null) {
					error.push("Bitte geben Sie eine Hausnummer an.")
				}
			}


			if(place == "" || place == null) {
				error.push("Bitte geben Sie ihren Wohnort an.");
			} else {

				if(plz == "" || plz == null) {
				error.push("Bitte geben Sie ihre Postleitszahl an.")
				}

			}
		
		
			// save userdata in databank
			if(error.length == 0) {
				// Password encryption
				const on = "Erfolgreich registriert!";
				const encryptedPass = passwordHash.generate(password);
				const documents = {
					'username': username,
					'password': encryptedPass,
					'email': email, 
					'adress': adress,
					'adressNr' : adressNr,
					'place': place,
					'plz': plz
				};
		
				db.collection(DB_COLLECTION).save(documents, (err, result) =>  {
					if(err) return console.log(err);
					console.log("saved to database");
				});
				
				// Redirect should  be changed to login page!
				response.render('register', {"error": error, "on": on});
			} else {

				// response with error globalMessage
				response.render('register', {"error": error, 'on': ""});
			}
			
		} else {
			error.push("Benutzername schon vergeben.");
			response.render('register', {'error': error, 'on': ""});
		} 
	});
});


app.get("/content", (request, response) => {
	if(request.session['authenticated'] == true) {
		const username = request.session['username'];
		response.render("content", {"user": username });
	} else {
		response.render('login', {'message': "Kein Zugriffsrecht! Bitte melden Sie sich an."})
	}

});

app.get("/logout", (request,response) => {
	delete request.session.authenticated;
	delete request.session.username;
	response.render('login', {'message': "Erfolgreich abgemeldet!"})
});

app.get('/user/myaccount', (request, response) => {
	if(request.session.authenticated) {
		response.render('myaccount', {'accountName': request.session.username});
	} else {
		response.render('login', {'message': "Kein Zugriffsrecht! Bitte melden Sie sich an."})
	}
});



// function hinzufügen
/*
let noPermit = function(request, response) {
	response.render('login', {'message': "No permission! Please login."});
}; */


app.get('/user/passwordChange', (request,response) => {
	const user = request.session['username'];


	response.render("changePassword", {'user' : user});

});
