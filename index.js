var request = require('request');
var querystring = require('querystring');

var BaseURL = 'https://api.hubapi.com/';

module.exports = function(inputOptions){
	var options;
	var acceptableOptions = [
		'entryPoint',
		'exitPoint',
		'cookieName',
		'client_id',
		'client_secret',
		'redirect_uri',
		'hapikey'
	];
	acceptableOptions.forEach(function(optionName){
		var inputValue = acceptableOptions[optionName];
		if(!input){
			throw('Missing Hubspot auth option ' + optionName);
		}else{
			options[optionName] = acceptableOptions[optionName];
		}
	});
	return {
		auth: {
			check: function(){
				return function(req, res, next){
					if(process.env['NODE_ENV'] == 'development' || req.cookies[options.cookieName]){
						next();
					}else{
						return res.redirect(options.authEntryPoint);
					}
				}
			},
			init: function(){
				return function(req, res, next){
					res.redirect('https://app.hubspot.com/oauth/authorize?' + querystring.stringify({
						client_id: options.client_id,
						redirect_uri: options.redirect_uri,
						scope: 'contacts'
					}));
				}
			},
			redirect: function(){
				return function(req, res, next){
					var requestToken = req.query.code;
					request({
						method: 'POST',
						url: 'https://api.hubapi.com/oauth/v1/token',
						headers: {
							'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
						},
						form: {
							grant_type: 'authorization_code',
							client_id: options.client_id,
							client_secret: options.client_secret,
							redirect_uri: options.redirect_uri,
							code: requestToken
						}
					}, function(error, response, body){
						if(error){
							res.clearCookie(options.cookieName);
							res.redirect(options.authEntryPoint);
						}else{
							res.cookie(options.cookieName, JSON.parse(body)[options.cookieName]);
							res.redirect(options.authExitPoint);
						}
					});
				}
			},
			reset: function(){
				return function(req, res, next){
					res.clearCookie(options.cookieName);
					res.redirect(options.authEntryPoint);
				}
			}
		},
		api: function(params){
			params.url = BaseURL + params.url;
			return function(req, res, next){
				if(process.env['NODE_ENV'] == 'development'){
					params.qs = (params.qs || {})
					params.qs['hapikey'] = options.hapikey;
				}else if(process.env['NODE_ENV'] == 'production'){
					params.headers = (params.headers || {});
					params.headers['Authorization'] = 'Bearer ' + req.cookies[options.cookieName];
				}
				console.log(params.url);
				request(params, function(error, response, body){
					var isAjaxRequest = (req.headers.accept.indexOf('json') > -1);
					var result = {
						success: true,
						statusCode: response.statusCode
					};
					console.log(response.statusCode);
					if(result.statusCode == 401){
						if(isAjaxRequest){
							return res.json(result);
						}else{
							return res.redirect(options.authEntryPoint);
						}
					}else if(error || result.statusCode >= 400){
						result.success = false;
					}
					try{
						result.body = JSON.parse(body || '{}');
					}catch(e){
						result.body = (error || body);
					}
					res.apiResponse = result;
					next();
				});
			}
		}
	}
}
