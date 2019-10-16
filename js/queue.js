var Queue = function () {
  this.messageQueue = [];
};

Queue.prototype.add = function (message) {
  this.messageQueue.push(message);
  return this.messageQueue;
};

Queue.prototype.init = function (messages) {
  this.messageQueue = messages;
};

Queue.prototype.getAllQueue = function () {
  return this.messageQueue;
};

Queue.prototype.sended = function (messages) {
  var messageQueue = this.messageQueue;
  messages.forEach(function (sendedItem) {
    messageQueue.forEach(function (message) {
      if (message.guid === sendedItem.guid) {
        message.sended = true;
      }
    });
  });

  return this.messageQueue;
};

Queue.prototype.getNotSended = function () {
  return _.filter(this.messageQueue, ['sended', false]);
};

Queue.prototype.remove = function (message) {
  _.remove(this.messageQueue, function (messageQueued) {
    return messageQueued.guid === message.data.guid;
  });
};
