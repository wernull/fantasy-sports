var Q = require("q"),
    NA = require("nodealytics"),
    tracking = false;

if(process.env.NODE_GA_ID && process.env.NODE_APP_URL){
    NA.initialize(process.env.NODE_GA_ID, process.env.NODE_APP_URL, function () {});
    tracking = true;
}

function FantasyRequest(auth, req, res) {
    this.auth = auth;
    this.req = req;
    this.res = res;
}

FantasyRequest.prototype.isAuthenticated = function() {
    return !!this.req.session.oauthAccessToken;
};

FantasyRequest.prototype.api = function(url, type, data) {

    if(tracking){
        NA.trackEvent('Yahoo! Request', url, function (err, resp) {
            if (!err && resp.statusCode === 200) {
                console.log('GA Track Yahoo! Request');
            }else{
                console.log(err, resp);
            }
        });
    }

    var deferred = Q.defer();

    if (!this.req.session.oauthAccessToken) {
        throw new Error("No access token");
    }

    if (arguments.length === 2) {
        data = type;
        type = "POST";
    }

    if (this.auth.isTokenExpired(this.req.session.timestamp)) {
        this.auth.refreshAuthentication(this.req, this.res)
            .done(function() {
                this._request(deferred, url, type, data);            
            }.bind(this));
    }
    else {
        this._request(deferred, url, type, data);
    }

    return deferred.promise;
};

FantasyRequest.prototype._request = function(deferred, url, type, data) {
    var oauth = this.auth.getOAuth();
    
    switch (type) {
        case "POST":
        case "PUT":
            oauth[type.toLowerCase()](url,
                this.req.session.oauthAccessToken,
                this.req.session.oauthAccessTokenSecret,
                data,
                "application/xml",
                function(err, data) {
                    var json = {};

                    if (err) {
                        if(tracking){
                            NA.trackEvent('Yahoo! Request error', err.statusCode, function (error, resp) {
                                if (!error && resp.statusCode === 200) {
                                    console.log('GA Track Yahoo! Request Error ' + err.statusCode);
                                }else{
                                    console.log(error, resp);
                                }
                            });
                        }
                        return deferred.resolve(err);
                    } else {
                        json = typeof data === "string" ? JSON.parse(data) : data;
                    }
                    
                    deferred.resolve(json);
                });
            break;
        default: 
            oauth.getProtectedResource(
                url,
                "GET",
                this.req.session.oauthAccessToken,
                this.req.session.oauthAccessTokenSecret,
                function(err, data) {
                    var json = {};

                    if (err) {
                        if(tracking){
                            NA.trackEvent('Yahoo! Request error', err.statusCode, function (error, resp) {
                                if (!error && resp.statusCode === 200) {
                                    console.log('GA Track Yahoo! Request Error ' + err.statusCode);
                                }else{
                                    console.log(error, resp);
                                }
                            });
                        }
                        return deferred.resolve(err);
                    } else {
                        json = typeof data === "string" ? JSON.parse(data) : data;
                    }

                    deferred.resolve(json);
                });
    }
    
};

exports = module.exports = FantasyRequest;
