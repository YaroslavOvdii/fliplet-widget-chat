var ChatMessagesQueue = function () {
  this.messageQueue = [];
};

ChatMessagesQueue.prototype.push = function (message) {
  this.messageQueue.push(message);
  return this.messageQueue;
};

ChatMessagesQueue.prototype.init = function (messages) {
  this.messageQueue = messages;
};

ChatMessagesQueue.prototype.getMessages = function () {
  return this.messageQueue;
};

ChatMessagesQueue.prototype.sent = function (messages) {
  var messageQueue = this.messageQueue;
  messages.forEach(function (sentItem) {
    messageQueue.forEach(function (message) {
      if (message.guid === sentItem.guid) {
        message.sent = true;
      }
    });
  });
};

ChatMessagesQueue.prototype.getUnsent = function () {
  return _.filter(this.messageQueue, ['sent', false]);
};

ChatMessagesQueue.prototype.pull = function (message) {
  _.remove(this.messageQueue, function (messageQueued) {
    return messageQueued.guid === message.data.guid;
  });
};
