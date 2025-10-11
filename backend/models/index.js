// Export all models from a single entry point
module.exports = {
  Case: require('./Case'),
  Conversation: require('./Conversation'),
  ConversationalCase: require('./ConversationalCase'), // Keep for backward compatibility
  User: require('./User'),
  Witness: require('./Witness'),
  Evidence: require('./Evidence'),
  Document: require('./Document')
};
