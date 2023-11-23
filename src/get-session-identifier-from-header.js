/**
 * Node imports
 */
var javaImports = JavaImporter(
    org.forgerock.openam.auth.node.api.Action
);

/**
 * Node outcomes
 */
var nodeOutcomes = {
    TRUE: "true",
    FALSE: "false"
};

/**
 * Node config
 */
var nodeConfig = {
    nodeName: "***get-session-identifier-from-header",
  	sessionHeader: "X-OpenAM-SessionIdentifier",
    sessionIdentifierSharedStateProperty: "sessionIdentifier"
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
 * Returns the specified header value
 * @param headerName - the header name
 * @returns the header value
 */

function getHeader(headerName) {
  var header = requestHeaders.get(headerName);
  if (header === null) {
    return null;
  }
  return String(header.get(0));
}

/**
 * Node entry point
 */


(function() {
    nodeLogger.error("node executing");
  	var sessionIdentifier = getHeader(nodeConfig.sessionHeader);
  	if (!(sessionIdentifier)) {
        nodeLogger.error("Couldn't get session identifier from header");
        action = javaImports.Action.goTo(nodeOutcomes.FALSE).build();
        return;
    } else {
       nodeLogger.error("UserId retrieved. Updating Tree state with session identifier: " + sessionIdentifier);
       sharedState.put(nodeConfig.sessionIdentifierSharedStateProperty, sessionIdentifier);
       action = javaImports.Action.goTo(nodeOutcomes.TRUE).build();
    }
})();