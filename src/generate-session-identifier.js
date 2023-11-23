/**
 * Node imports
 */
var javaImports = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
  java.util.UUID
);

/**
* Node outcomes
*/
var nodeOutcomes = {
  TRUE: "true"
};

/**
* Node config
*/
var nodeConfig = {
  nodeName: "***TasosDebug::generate-session-identifier",
    sessionPropertyName: "sessionIdentifier"
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
* Node entry point
*/


(function() {
  nodeLogger.error("node executing");
  var sessionUUID = javaImports.UUID.randomUUID();
  nodeLogger.debug("Session bound ID: " + sessionUUID);
  action = javaImports.Action.goTo(nodeOutcomes.TRUE).putSessionProperty(nodeConfig.sessionPropertyName, sessionUUID).build();
})();