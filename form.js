const express = require('express');
const app = express();
const port = 3000;
const request = require('request');
const path = require('path');
const admin = require('firebase-admin');
const bcrypt = require('bcrypt'); 

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true })); 


var serviceAccount = require('./key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(__dirname + '/public'));


app.get('/weather', function (req, res) {
  res.render('search');
});


app.get('/signin', function (req, res) {
  res.sendFile(__dirname + '/public/' + 'sign.html');
});


app.post('/signinSubmit', function (req, res) {
  const email = req.body.email;
  const password = req.body.password;

  bcrypt.hash(password, 10, function (err, hashedPassword) {
    if (err) {
      return res.status(500).send('Error occurred while hashing the password.');
    }

    
    db.collection('web_application') 
    
      .where('email', '==', email)
      .get()
      .then((docs) => {
        if (docs.size > 0) {
          res.send('Email already exists. Please use a different email address.');
        } else {
          db.collection('web_application') 
            .add({
              Fullname: req.body.FullName,
              email: email,
              dob: req.body.dob,
              Password: hashedPassword, 
            })
            .then(() => {
              res.send('Signup successful. Please login.');
            })
            .catch((error) => {
              res.status(500).send('Error occurred while signing up: ' + error);
            });
        }
      })
      .catch((error) => {
        res.status(500).send('Error occurred while checking email existence: ' + error);
      });
  });
});


app.get('/login', function (req, res) {
  res.sendFile(__dirname + '/public/' + 'login.html');
});


app.post('/loginsubmit', function (req, res) {
  const email = req.body.Email;
  const password = req.body.Password;

  db.collection('web_application') 
    .where('email', '==', email)
    .get()
    .then((docs) => {
      if (docs.size === 0) {
        res.send('Email not found. Please sign up or check your email.');
      } else {
        const userDoc = docs.docs[0]; 
        const storedHashedPassword = userDoc.data().Password;

        
        bcrypt.compare(password, storedHashedPassword, function (err, result) {
          if (err) {
            return res.status(500).send('Error occurred while comparing passwords: ' + err);
          }

          if (result) {
            res.render('location'); 
          } else {
            res.send('Incorrect password. Please try again.');
          }
        });
      }
    })
    .catch((error) => {
      res.status(500).send('Error occurred while checking email existence: ' + error);
    });
});


app.get('/weathersubmit', (req, res) => {
  const location = req.query.location;
  request(
    'https://api.openweathermap.org/data/2.5/weather?q=' +
      location +
      '&appid=ee105770f47410d41e658e851095a80b&units=metric', 
    function (error, response, body) {
      if (error) {
        console.error(error);
        return res.status(500).send('Error occurred while fetching weather data.');
      }
      try {
        const responseBody = JSON.parse(body);
        if ('error' in responseBody) {
          if (responseBody.error.code.toString().length > 0) {
            return res.render('location');
          }
        } else {
          const temperature = responseBody.main.temp; 
          const feels = responseBody.main.feels_like;
          const sealevel = responseBody.main.sea_level;
          const country = responseBody.sys.country;
          const speed = responseBody.wind.speed;
          const humidity = responseBody.main.humidity;
          const name = responseBody.name;
          const sunrise = responseBody.sys.sunrise;
          res.render('weather', {
            Temperature: temperature, 
            Feels: feels,
            Sea_Level: sealevel,
            Country: country,
            Speed: speed,
            Humidity: humidity,
            Name: name,
            Sunrise: sunrise,
          });
        }
      } catch (parseError) {
        console.error(parseError);
        return res.status(500).send('Error occurred while parsing weather data.');
      }
    }
  );
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
