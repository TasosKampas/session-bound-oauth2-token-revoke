/**
 * Node imports
 */
var javaImports = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    org.forgerock.http.protocol.Request,
    org.forgerock.http.protocol.Response
);

/**
 * Node outcomes
 */
var nodeOutcomes = {
    TRUE: "true",
    ERROR: "error"
};

/**
 * Node config
 */
var nodeConfig = {
    nodeName: "***OAuth2RevokeHook",
  	cookieName: "iplanetDirectoryPro",
  	AM_URI: "http://anastasios-kampas-am-dihcahr.test:8080/openam",
  	realm: "machine2machine"
};

/**
 * Node logger
 */

var nodeLogger = {
    debug: function(message) {
        logger.message("***" + nodeConfig.nodeName + " " + message);
    },
    warning: function(message) {
        logger.warning("***" + nodeConfig.nodeName + " " + message);
    },
    error: function(message) {
        logger.error("***" + nodeConfig.nodeName + " " + message);
    }
};



/**
 * Returns authenticates as admin and returns the SSO token. 
 * @param admin - the admin username
 * @param password - the admin password
 * @returns an admin token
 */

function getAdminToken() {
    nodeLogger.error("Authenticating as administrator");
  	var admin = "amadmin";
  	var pass = "cangetinam";
    var restBody = "{}";
    var authEndpoint = nodeConfig.AM_URI + "/json/realms/root/authenticate";
    try {
        var request = new org.forgerock.http.protocol.Request();
        request.setMethod('POST');
        request.setUri(authEndpoint);
        request.getHeaders().add("X-OpenAM-Username", admin);
        request.getHeaders().add("X-OpenAM-Password", pass);
        request.getHeaders().add("content-type", "application/json");
        request.getHeaders().add("Accept-API-Version", "resource=2.0, protocol=1.0");
        request.getEntity().setString(restBody);
        var response = httpClient.send(request).get();
        var jsonResult = JSON.parse(response.getEntity().getString());
        nodeLogger.error("Returning admin token " + jsonResult.tokenId);
        return jsonResult.tokenId;
    } catch (e) {
        nodeLogger.error("Failure to call the AM authenticate endpoint");
        nodeLogger.error("Exception: " + e);
        return null;
    }
}

/**
 * Returns authenticates as admin and returns the SSO token. 
 * @param adminToken - the admin token Id
 * @param user - the user Id
 * @param sessionIdentifier - the session identifier of the session
 * @returns a map with the authorized clients
 */

function retrieveSessionBoundTokens(adminToken, user, sessionIdentifier) {
    nodeLogger.error("Retrieving tokens");
    var response;
  	var frrestEndpoint = nodeConfig.AM_URI + "/frrest/oauth2/token?_queryId=userName%3D" + user + "%2Crealm%3D%2F" + nodeConfig.realm + "&_fields=sessionIdentifier";
  	nodeLogger.error("Calling: " + frrestEndpoint + " with admin token " + adminToken);
    try {
        var request = new org.forgerock.http.protocol.Request();
        request.setUri(frrestEndpoint);
        request.setMethod("GET");
        request.getHeaders().add(nodeConfig.cookieName, adminToken);
        response = httpClient.send(request).get();
    } catch (e) {
        nodeLogger.error("Failure to call the AM endpoint");
        nodeLogger.error("Exception: " + e);
        return null;
    }
  	nodeLogger.error("The response was: " + response.getEntity().getString());
    if (!(response.getStatus().getCode() == 200)) {
        nodeLogger.debug("Didn't get a 200 OK from frrest endpoint");
        return null;
    }

    var jsonResponse = JSON.parse(response.getEntity().getString());
  	//jsonResponse["resultCount"]
    nodeLogger.debug("Got 200 OK. Tokens count: " + jsonResponse.resultCount);
    if (!(jsonResponse.resultCount != 0)) {
        nodeLogger.debug("Result count is not zero.");
        return null;
    }
  	nodeLogger.error("Collect session-bound tokens.");
    var tokens = [];
    for (var i = 0; i < jsonResponse.result.length; i++) {
      if (jsonResponse.result[i].sessionIdentifier) {
        nodeLogger.debug("incoming sessionIdentifier " + jsonResponse.result[i].sessionIdentifier + " and checking against sessionIdentifier " + sessionIdentifier);
        if (jsonResponse.result[i].sessionIdentifier == sessionIdentifier) {
          var token = jsonResponse.result[i]._id;
          nodeLogger.debug("Found session-bound token " + token);
          tokens.push(token);
        }
      }
    };
    nodeLogger.error("Returning session-bound tokens.");
    return tokens;
}

/**
 * Revokes all OAuth2 tokens bound to a session Id
 * @param adminToken - the admin token Id
 * @param user - the user Id
 * @param sessionBoundTokens - session-bound tokens
 * @returns true or null
 */

/**
1st way
curl \
 --request DELETE \
 --header "iplanetDirectoryPro: AQIC5wM2LY4Sfcxs…​EwNDU2NjE0*" \
 "https://openam.example.com:8443/openam/frrest/oauth2/token/f5fb4833-ba3d-41c8-bba4-833b49c3fe2c"
 */
/**
2nd way
$ curl \
--request POST \
--user "myClient:forgerock" \
--data "client_id=myClient" \
--data "token=<refresh-token>" \
"https://openam.example.com:8443/openam/oauth2/realms/root/realms/alpha/token/revoke"
{}
 */
function revokeSessionBoundTokens(adminToken, user, sessionBoundTokens) {

    nodeLogger.error("Revoking tokens");
    var response;
    try {
        sessionBoundTokens.forEach(function(token) {
            var request = new org.forgerock.http.protocol.Request();
            request.setUri(nodeConfig.AM_URI + "/frrest/oauth2/token/" + token)
            request.setMethod("DELETE");
            request.getHeaders().add(nodeConfig.cookieName, adminToken);
            nodeLogger.debug("Attempting to delete token: " + token);
            response = httpClient.send(request).get();
            if (response.getStatus().getCode() == 200) {
                nodeLogger.debug("the token " + token + " has been revoked")
            } else {
                nodeLogger.debug("Failed to revoke tuken " + token)
            }
        });
    } catch (e) {
        nodeLogger.error("Failure to call the endpoint");
        nodeLogger.error("Exception: " + e);
        return false;
    }
    return true;
}


/**
 * Node entry point
 */


(function() {
    nodeLogger.error("node executing");
    // Prerequisites
    var user = sharedState.get("username");
  	if (!(user)) {
  		nodeLogger.error("Couldn't get the username from the Tree state.");
        action = javaImports.Action.goTo(nodeOutcomes.ERROR).withErrorMessage("Something went wrong!").build();
        return;
    }
	nodeLogger.error("The user is " + user);
    var sessionIdentifier = sharedState.get("sessionIdentifier");
  	if (!(sessionIdentifier)) {
  		nodeLogger.error("Couldn't get the sessionIdentifier from the Tree state.");
        action = javaImports.Action.goTo(nodeOutcomes.ERROR).withErrorMessage("Something went wrong!").build();
        return;
    }
	nodeLogger.debug("The sessionIdentifier is " + sessionIdentifier);
  
    // Step1 get an admin token 
    var adminToken = getAdminToken();
    if (!(adminToken)) {
        nodeLogger.error("Couldn't get an admin token. Exiting");
        action = javaImports.Action.goTo(nodeOutcomes.ERROR).withErrorMessage("Something went wrong!").build();
        return;
    }
    // Step2: Get all Access / Refresh tokens
    var sessionBoundTokens = retrieveSessionBoundTokens(adminToken, user, sessionIdentifier);
    if (!(sessionBoundTokens)) {
        nodeLogger.error("Couldn't get the tokens. Exiting");
        action = javaImports.Action.goTo(nodeOutcomes.ERROR).withErrorMessage("Something went wrong!").build();
        return;
    }
  	//nodeLogger.error("The tokens are:" + sessionBoundTokens );
    // Step3: Revoke Session bound tokens
    var revokeOutcome = revokeSessionBoundTokens(adminToken, user, sessionBoundTokens);
    if (!(revokeOutcome)) {
        nodeLogger.error("Couldn't revoke the tokens. Exiting");
        action = javaImports.Action.goTo(nodeOutcomes.ERROR).withErrorMessage("Something went wrong!").build();
        return;
    } else {
        nodeLogger.error("OAuth2 Logout was successful");
        action = javaImports.Action.goTo(nodeOutcomes.TRUE).build();
    }
})();