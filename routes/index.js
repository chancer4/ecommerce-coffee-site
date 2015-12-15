var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var router = express.Router();


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/register', function(req,res,next){
	res.render('index')
})

router.get('/login', function(req,res,next){
	res.render('login')
})

router.post('/register', function(req, res, next){
	Account.register(new Account({
		username: req.body.username
	}),
	req.body.password,
	function(error, account){
		if(error){
			console.log(error);
			return res.render('index');
		}else{
			passport.authenticate('local')(req,res,function(){
				res.redirect('/')
			});
		}
	});
});

module.exports = router;
