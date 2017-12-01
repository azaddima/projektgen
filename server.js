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
const itemsData = 'items';
const Db = require('tingodb')().Db;
const db = new Db(__dirname + '/userdata', {})
const ObjectID = require('tingodb')().ObjectID


// password encryption
const passwordHash = require('password-hash'); 

//file upload -- multer
const multer = require('multer');

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
app.get("/", (request, response) => {

// if nothing is in items data make sure no error is shown -- code genuss

	let indexDevices = db.collection(itemsData).find().toArray(

		function (err, result) {

			response.render("index", {
					'devices': result,
					'userAuth': request.session.authenticated
				});
		}
	);
});


//  view device
app.get('/viewDevice/:_id', (request, response) => {

	db.collection(itemsData).findOne( {_id: request.params._id}, (error, result) => {
		response.render("viewDevice", {'device': result, 'userAuth': request.session.authenticated});
	});
});

// device renting
app.post('/user/rentDevice/:_id', (request, response) => {
	
	//prepare variables
	let currentUserId = request.session.userId;
	let currentDeviceId = request.params._id;
	let isRented = false;

	db.collection(itemsData).findOne({ '_id': currentDeviceId }, (err, result) => {
		if (err) return console.log(err);

		if (request.session.authenticated && !result.isRented) {


			// first check if devices 


			let daysRented = parseFloat(request.body.days);
			let date = new createDate(daysRented, 23, 59, 59);

			console.log('-------\ngive back date: ' + date);

			// prepare - update DEVICE data
			let deviceId = { '_id': currentDeviceId };
			let updateDevice = {
				$set:
					{
						'rentedTo': currentUserId,
						'rentedTill': date,
						'isRented': true
					}
			}

			// update DEVICE data
			db.collection('items').update(deviceId, updateDevice, (error, result) => {
				if (error) return console.log(error + "\nzwei error");

				console.log('device data updated');
			})

			// search for DEVICEDATA to write in USERDATA 
			db.collection(itemsData).findOne({ '_id': currentDeviceId }, (error, result) => {
				if (error) {
					console.log(error + ' \n1 error :)');
					return

				} else {

					//update the USER data with given _id
					console.log('\n' + result.deviceName + '\n');
					let userId = {
						'_id': currentUserId
					};

					let updateUser = {

						// write object data for mutliple devices
						$push:
							{
								rented: {
									'id': result._id,
									'name': result.deviceName,
									'date': date,
									'price': result.price,
									'totalPrice': totalPrice(result.price, daysRented),
									'isPaid': false
								}
							}
					};

					db.collection(DB_COLLECTION).update(userId, updateUser, (error, result) => {
						if (error) {
							console.log(error + "drei error");
							return
						}

						console.log('user data updated')
					});
				}
			});

			response.redirect('/');

		} else {
			response.redirect('/user/myaccount');
		}

	})
});


// Global error message
let globalMessage = "";


app.get("/user/login", (request, response) => {

	if(!request.session.authenticated) {

		response.render("login", {'message': globalMessage})
	
		// Error message is set blank after rendering
		// otherwise the message wouldnt dissapear until overwriting
		// !!!! important
		globalMessage = "";
		
	} else  {
		response.redirect('/');
	}

});

// LOGIN management

app.post("/user/login", (request,response) => {
	const username = request.body["username"];
	const password = request.body["password"];

	// looking for the given username
	db.collection(DB_COLLECTION).findOne( {'username': username}, (error,result) => {

		// If account is found in databank
		if(result != null) {
			accExtists = true;	
			console.log(result.password);
			
			// if given password matches with account username
			// Uing passwordHash to decrypt the password and compare them
			if (passwordHash.verify(password, result.password)) {


				request.session['authenticated'] = true;
				request.session['username'] = username;
				request.session['userId'] = result._id;

				if(request.session.username == "admin") {
					request.session.adminAuthenticated = true;
				}

				response.redirect("/");

			// wrong password given
			} else {
				console.log(error);
				response.render("login", {'message': "Falsches Passwort."});
			}			
		} 

		// username is not in the databank
		else {
			response.render("login", {'message': "The user " + '"' + username + '"' + " does not exist."});
		}
	});

});


// REGISTER

// Always have different ways to access to an SITE. Really important for user experience.

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

				error.push("Bitte geben Sie eine Adresse an.");

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
					'plz': plz,
					'rented': [],
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



// USER management

app.get("/logout", (request,response) => {
	delete request.session.authenticated;
	delete request.session.username;
	delete request.session.userId;

	if(request.session.adminAuthenticated){
		delete request.session.adminAuthenticated;
	}

	globalMessage = "Erfolgreich abgemeldet!"
	response.redirect('/user/login');
});

app.get('/user/myaccount', (request, response) => { 
	if(request.session.authenticated) {
		response.render('myaccount', {

			'accountName': request.session.username, 
			'adminAuth': request.session.adminAuthenticated

		});


	} else {
		globalMessage = "Kein Zugriffsrecht! Bitte melden Sie sich an.";
		response.redirect('/user/login');
	}
});



// PASSWORD management
 
app.get('/user/passwordChange', (request,response) => {
	const user = request.session['username'];
	response.render("changePassword", {'user' : user});

});


// password change verification

app.post('/user/passwordChange_verify', (request,response) => {

	const oldPass = request.body.oldPass;
	const newPass = passwordHash.generate(request.body.newPass);
	const userId = request.session.userId;


	console.log("userId: " + userId + " user name: " + request.session.username);

		db.collection(DB_COLLECTION).findOne( {'_id': userId}, (error, result) => {
			
			if(error) return console.log(error);

			if(!passwordHash.verify(oldPass, result.password)) {
				console.log("Dein Password ist nicht korrekt!");
				response.redirect('/user/passwordChange');
			} 
			//passwords match
			else {

				db.collection(DB_COLLECTION).update(

					{ '_id': userId }, 
					{ $set: {password : newPass } }

				);

				response.redirect('/user/passwordChange')
			}
			
		});	
});


app.get('/admin/upload', (request, response) => {
	
	if(request.session.adminAuthenticated) {
		response.render("upload");
	} else {
		globalMessage = "Kein Zugriff!";
		response.redirect('../user/login')
	}
});


// Upload

//set storage folder and filenames
let storage = multer.diskStorage({
	destination: function(request, file, callback) {
		callback(null, 'public/uploads'); //define folder for uploaded files
	},

	filename: function(request, file, callback) {
		callback(null, file.originalname); // define filename of original file
	}

});


// upload methods
//single
let upload = multer({storage: storage}).single('filename');



// mutliple
//let upload = multer({ storage: storage}).array(fieldname, [maxcount]);

app.post('/admin/upload_image', function(request, response) {
	
	upload(request, response, function(err) {
		if(err) {
			console.log('Error occured: ', err);
			return;
		}

		console.log(request.file.filename + " request.file");

		const items = {

			'imageName' : [request.file.filename],
			'deviceName': request.body.deviceName,
			'price' : request.body.price,
			'description' : request.body.description,
		};

		db.collection(itemsData).save(items, (err, result) =>  {
			if(err) return console.log(err);
			console.log("saved to database");
		});

		response.end('Your File is uploaded');

	});
});


app.get('/user/personaldata', (request, response) => {

	if(request.session.authenticated){
		db.collection(DB_COLLECTION).findOne({ _id: request.session.userId }, (error, result) => {
			if (error) return console.log(error);
			
			response.render('personaldata', { 'accountName': request.session.username, devices: result });

		})
	} else {
		response.redirect('/user/myaccount');
	}
});

app.post('/user/payDevice/:deviceName', (request,response)=> {
	let deviceName = request.params.deviceName;

	/*
	let search = { _id: request.session.userId, 'rented.name': deviceName};
	let update = {$set: {'rented.$.isPaid': true}};	
	*/

	//from  https://stackoverflow.com/questions/4993764/removing-numbers-from-string
	let withNoDigits = deviceName.replace(/[0-9, $]/g, '');
	console.log(withNoDigits);
	console.log(deviceName);

	if(request.session.authenticated) {
		
		db.collection(DB_COLLECTION).findOne( { '_id': request.session.userId }, function (err, doc) {
			for (i = 0; i < doc.rented.length; i++) {
				//do what you gotta do
				if(doc.rented[i].name == deviceName) {
		
					doc.rented[i].isPaid = true;
					console.log(doc.rented[i].isPaid);
				}
			}
			db.collection(DB_COLLECTION).update({ '_id': request.session.userId }, { $set: { 'rented': doc.rented } }, (error, doc) => {
				if (error) return console.log(error);
				
			});
		});

		response.redirect('/user/personaldata');

	} else {
		
		response.redirect('/user/myaccount');
	}

});

app.post('/user/returnDevice/:deviceName', (request, response) => {
	let deviceName = request.params.deviceName;
	 // let withNoDigits = deviceName.replace(/[0-9, $]/g, '');
	
	 if(request.session.authenticated) {
		 
		 // remove device object with $pull --- 
		db.collection(DB_COLLECTION).update({ '_id': request.session.userId }, { $pull: {'rented.$.name': deviceName  } }, (error, doc) => {
			if (error) return console.log(error);
			console.log('object removed')
			console.log(doc.rented);
		});

		// wörkt
		db.collection(itemsData).update({ deviceName: deviceName }, { $set: { isRented: false } }, (err, doc) => {
			if (err) return console.log(err);
			console.log(doc);
		});
		

		response.redirect('/user/personaldata');
	} else {
		response.redirect('/user/myaccount');
	}
});


// functions

function createDate (daysRented, h, m, s) {
	let date = new Date();
	date.setDate(date.getDate() + daysRented);
	date.setHours(h);
	date.setMinutes(s);
	date.setSeconds(m);

	return date;
}

function totalPrice(price, days){
	let total = price * days;
	return total;
}

