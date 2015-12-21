var express = require('express');
var passport = require('passport');
//Require our account.js file which resides in models one dir up
var Account = require('../models/account');
var nodemailer = require('nodemailer');
var vars = require('../config/vars.json')
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res) {
    //res.send(req.session);
    res.render('index', { username : req.session.username });
});

////////////////////////////////////////
////////////////REGISTER////////////////
////////////////////////////////////////

// Get the register page
router.get('/register', function(req, res) {
    res.render('register', { });
});

//Post to the register page
router.post('/register', function(req, res) {
    //The mongo statement to insert the new vars into the db
    Account.register(new Account({ username : req.body.username }), req.body.password, function(err, account) {
        if (err) {
            return res.render('register', { err : err });
        }
        passport.authenticate('local')(req, res, function () {
            req.session.username = req.body.username;
            res.render('index', { username : req.session.username });
        });
    });
});

/* ---------------------------- */
/* ----------Login----------- */
/* ---------------------------- */
//Get the login page
router.get('/login', function(req, res) {

    //the user is already logged in
    if(req.session.username){
        res.redirect('/choices');
    }
    //req.query.login pulls the query parameters right out of the http headers!
    //They are here and failed a login
    if (req.query.failedlogin){
        res.render('login', { failed : "Your username or password is incorrect." });    
    }
    //They are here and aren't logged in
    res.render('login', { user : req.user });
}).post('/login', function(req, res, next) {

    if(req.body.getStarted){
        Account.register(new Account({ username : req.body.username }), req.body.password, function(err, account) {
            if (err) {
                return res.render('register', { err : err });
            }
            if(!err)
            passport.authenticate('local')(req, res, function () {
                req.session.username = req.body.username;
                res.render('choices', { username : req.session.username });
            });
        });        
    }

    if (!req.body.getStarted){
      passport.authenticate('local', function(err, user, info) {
        if (err) {
          return next(err); // will generate a 500 error
        }
        // Generate a JSON response reflecting authentication status
        if (! user) {
          return res.redirect('/login?failedlogin=1');
        }
        if (user){
            // Passport session setup.
            passport.serializeUser(function(user, done) {
              console.log("serializing " + user.username);
              done(null, user);
            });

            passport.deserializeUser(function(obj, done) {
              console.log("deserializing " + obj);
              done(null, obj);
            });        
            req.session.username = user.username;
        }

        return res.redirect('/choices');
      })(req, res, next);
    }
});

/* ---------------------------- */
/* ----------Logout----------- */
/* ---------------------------- */
router.get('/logout', function(req, res) {
    req.logout();
    req.session.destroy();
    res.redirect('/');
});
// ------------------------
// ---------Choices--------
// ------------------------
router.get('/choices', function (req, res, next){
    //make sure user is logged in
    if(req.session.username){
        //they do belong here
        //check for preferences
        Account.findOne(
            {username : req.session.username },
            function (err, doc){
                var currQuarterPounds = doc.quarterPounds ? doc.quarterPounds : undefined
                var currGrind = doc.grind ? doc.grind : undefined
                var currFrequency = doc.frequency ? doc.frequency : undefined
                res.render('choices', {user: req.session.username, currQuarterPounds : currQuarterPounds, currGrind:currGrind,currFrequency:currFrequency})
            }
            )
    }
    if(!req.session.username){
        res.redirect('/login')
    }
})

router.post('/choices', function(req,res,next){
    if(req.session.username){
        //yes
        var newGrind = req.body.grind;
        var newFrequency = req.body.frequency;
        var newPounds = req.body.quarterPounds;

        Account.findOneAndUpdate(
                { username : req.session.username },
                { grind : newGrind },
                { upsert : true },
                function (err, account){
                    if(err){
                        res.send('there was error')
                    }else{
                        account.save
                    }
                }
            )
        Account.findOneAndUpdate(
                { username : req.session.username },
                { frequency : newFrequency },
                { upsert : true },
                function (err, account){
                    if(err){
                        res.send('there was error')
                    }else{
                        account.save
                    }
                }
            )
        Account.findOneAndUpdate(
                { username : req.session.username },
                { quarterPounds : newPounds },
                { upsert : true },
                function (err, account){
                    if(err){
                        res.send('there was error')
                    }else{
                        account.save
                    }
                }
            )
        res.render('delivery')

    }else {
        res.render('/')
    }
})

router.get('/payment', function(req, res, next){
    if(req.session.username){
        Account.findOne(
            {username: req.session.username},
            function (err,doc){
                var currGrind = doc.grind ? doc.grind : "N/A";
                var currFrequency = doc.frequency ? doc.frequency : "N/A";
                var currQuarterPounds = doc.quarterPounds ? doc.quarterPounds: "N/A";
                var currFullName = doc.fullName ? doc.fullName : "N/A";
                var currAddress1 = doc.address1 ? doc.address1 : "N/A";
                var currAddress2 = doc.address2 ? doc.address2 : "N/A";
                var currCity = doc.city ? doc.city : "N/A";
                var currState = doc.state ? doc.state : "N/A";
                var currZipCode = doc.zipCode ? doc.zipCode : "N/A";
                var currDeliveryDate = doc.deliveryDate ? doc.deliveryDate : "N/A";
                var unalteredCharge = currQuarterPounds * 19.99;
                var totalCharge = (unalteredCharge + 5.95).toFixed(2);
                var currCharge = unalteredCharge.toFixed(2);
                req.session.charge = totalCharge * 100;
                res.render('payment', {username: req.session.username, grind: currGrind, 
                    frequency: currFrequency, quarterPounds: currQuarterPounds, 
                    fullName: currFullName, address1: currAddress1, address2: currAddress2, 
                    city: currCity, state: currState, zipCode: currZipCode, 
                    deliveryDate: currDeliveryDate, charge: currCharge, totalCharge : totalCharge, key: vars.key });

            });
    };
})

router.post('/payment', function(req, res, next){
    var stripe = require("stripe")(
      "sk_test_NWYwCkzv8zQo8EYerx33QyXW"
    );

    // var charge = req.body.totalCharge;
    console.log(req.body);
    console.log('----------------------------');

    stripe.charges.create({
      amount: req.session.charge,
      currency: "usd",
      source: req.body.stripeToken, // obtained with Stripe.js
      description: "Charge for " + req.body.stripeEmail
    }, function(err, charge) {
            console.log(charge);
    });
    res.redirect('/thankyou');
})

router.get('/email', function (res, res, next){
    var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: vars.email,
            pass: vars.password
        }
    });
    var text = "this is a test email sent from my node server";
    var mailOption = {
        from: 'Chance Rhodes <chance.rhodes5@gmail.com>', 
        to: 'Chance Rhodes <chance.rhodes5@gmail.com>',
        subject: 'Test Subject',
        text: text
    }

    transporter.sendMail(mailOption, function(error, info){
        if(error){
            console.log(error);
            res.json({response: error});
        }else{
            res.json({resonse: "success"});
        }
    })
});

router.get('/contact', function (req, res,next){
    res.render('contact')
})

module.exports = router;











