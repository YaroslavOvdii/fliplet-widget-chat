Fliplet.Widget.instance('chat', function (data) {

  // ---------------------------------------------------------------
  // const setup

  var DEFAULT_CHAT_NAME = 'Conversation';
  var USERTOKEN_STORAGE_KEY = 'fl-chat-user-token';
  var ONLINE_INPUTS_SELECTOR = '[data-new-message] input';
  var PARTICIPANT_FULLNAME_COLUMN = 'fullName';
  var SCROLL_TO_MESSAGE_SPEED = 500;

  // ---------------------------------------------------------------
  // jquery elements setup

  var $wrapper = $(this);
  var $loginForm = $wrapper.find('form.login');
  var $chat = $wrapper.find('.chat');
  var $conversationsList = $chat.find('[data-conversations-list]');
  var $content = $chat.find('[data-conversation]');
  var $messages;

  if (!data.dataSourceId) {
    return $wrapper.find('.chat-not-configured').removeClass('hidden');
  }

  if (typeof data.pushNotifications === 'undefined') {
    data.pushNotifications = true;
  }

  // ---------------------------------------------------------------
  // variables setup

  var chat;
  var conversations;
  var currentConversation;
  var messages = [];
  var contacts = [];
  var currentUser;
  var scrollToMessageTimeout;
  var scrollToMessageTs = 0;
  var chatConnection = Fliplet.Chat.connect(data);
  var isActiveWindow = true;

  // ---------------------------------------------------------------
  // events setup

  // Handler to log out
  $chat.find('[data-logout]').click(function (event) {
    event.preventDefault();
    Fliplet.App.Storage.remove(USERTOKEN_STORAGE_KEY).then(function () {
      return chat.logout();
    }).then(function () {
      showLoginForm();
    });
  });

  // Handler to view a conversation
  $chat.on('click', '[data-conversation-id]', function (event) {
    event.preventDefault();

    var id = $(this).data('conversation-id');
    var conversation = _.find(conversations, { id: id });

    scrollToMessageTs = 0;
    viewConversation(conversation);
  });

  // Handler to view the frame to create a new conversation
  $chat.on('click', '[data-new-conversation]', function (event) {
    event.preventDefault();
    viewNewConversation();
  });

  // Handler to create a new conversation
  $chat.on('click', '[data-create-conversation]', function (event) {
    event.preventDefault();
    var targetUserId = $(this).data('create-conversation');

    return getConversations().then(function () {
      return chat.create({
        name: DEFAULT_CHAT_NAME,
        participants: [targetUserId]
      });
    }).then(function (conversation) {
      var fetchRequiredData = conversation.isNew
        ? getContacts(false).then(function () { return getConversations(); })
        : Promise.resolve();

      return fetchRequiredData.then(function () {
        $chat.find('[data-conversation-id="' + conversation.id + '"]').click();
      });
    });
  });

  // Handler to post a message to a conversation
  $chat.on('submit', '[data-new-message]', function (event) {
    event.preventDefault();
    var $message = $('[data-message-body]');
    var text = $message.val();

    if (!text) {
      return;
    }

    $message.val('');

    chat.message(currentConversation.id, {
      body: text
    });
  });

  // Handler to log the user in by email and password
  $loginForm.submit(function (event) {
    event.preventDefault();

    chatConnection.then(function () {
      return chat.login({
        email: $loginForm.find('[type="email"]').val(),
        password: $loginForm.find('[type="password"]').val()
      });
    }).then(function onLogin(user) {
      setCurrentUser(user.data);
      $loginForm.addClass('hidden');
      return Fliplet.App.Storage.set(USERTOKEN_STORAGE_KEY, user.data.flUserToken);
    }).then(onLogin)
    .catch(function (error) {
      // TODO: replace with better error UI
      alert(error.message || error);
    });
  });

  // ---------------------------------------------------------------
  // private methods

  function showLoginForm() {
    $chat.addClass('hidden');
    $loginForm.removeClass('hidden');
  }

  function onLogin() {
    Notification.requestPermission();

    $chat.removeClass('hidden');

    getContacts(false).then(function () {
      return getConversations();
    }).then(function () {
      return chat.stream(onMessage);
    });
  }

  function setCurrentUser(user) {
    currentUser = user;
  }

  // All contacts apart from the logged user
  function getContactsWithoutCurrentUser() {
    return _.reject(contacts, function (c) {
      return c.data.flUserId === currentUser.flUserId;
    });
  }

  function getConversations() {
    return chat.conversations().then(function (response) {
      conversations = response.map(function (c) {
        var existingConversation = _.find(conversations, { id: c.id });
        if (existingConversation) {
          c.unreadMessages = existingConversation.unreadMessages;
          c.lastMessage = existingConversation.lastMessage;
        } else {
          c.unreadMessages = 0;
        }

        return c;
      });

      var otherPeople = getContactsWithoutCurrentUser();

      // Add a readable name to the conversation, based on the other people in the group
      conversations.forEach(function (conversation) {
        // Let's first check whether the conversation name has been changed by the user
        if (conversation.name !== DEFAULT_CHAT_NAME) {
          return;
        }

        var participants = conversation.definition.participants;

        var conversationName = _.compact(_.filter(otherPeople, function (c) {
          return participants.indexOf(c.data.flUserId) !== -1;
        }).map(function (c) {
          return c.data[PARTICIPANT_FULLNAME_COLUMN];
        })).join(', ').trim();

        conversation.name = conversationName || conversation.name;
      });

      $conversationsList.html('');
      conversations.forEach(function (conversation) {
        renderConversationItem(conversation);
      });
    });
  }

  function viewConversation(conversation) {
    currentConversation = conversation;

    var html = Fliplet.Widget.Templates['templates.conversation-content'](conversation);
    $content.html(html);

    $messages = $content.find('[data-conversation-messages]');

    var conversationMessages = _.filter(messages, { dataSourceId: conversation.id });
    conversationMessages.forEach(renderMessage);

    $('[data-message-body]').focus();

    chat.markMessagesAsRead(messages);

    currentConversation.unreadMessages = 0;
    renderConversationItem(conversation, true);
  }

  function getContacts(cache) {
    return chat.contacts({ cache: cache }).then(function (response) {
      contacts = response;
      return Promise.resolve();
    });
  }

  function viewNewConversation() {
    getContacts(false).then(function () {
      var html = Fliplet.Widget.Templates['templates.new-conversation']({
        contacts: getContactsWithoutCurrentUser().map(function (contact) {
          var data = contact.data;
          data.id = contact.id;
          return data;
        })
      });

      $content.html(html);
    });
  }

  function onMessage(message) {
    message.createdAtDate = moment(message.createdAt);

    messages.push(message);

    var isCurrentConversation = currentConversation && message.dataSourceId === currentConversation.id;

    if (isCurrentConversation) {
      renderMessage(message);
    }

    var conversation = _.find(conversations, { id: message.dataSourceId });

    if (!conversation) {
      // If we don't find the conversation of this message, most likely means a user just
      // started messaging us on a new conversation so let's just refetch the list
      getConversations();
    } else {
      conversation.lastMessage = {
        body: message.data.body,
        date: message.createdAtDate.calendar()
      };

      if (!message.isReadByCurrentUser) {
        if (!currentConversation) {
          // Message is unread and is not in the current conversation
          conversation.unreadMessages++;
        } else {
          // Mark the message as read by the current user, since he's looking at this conversation
          chat.markMessagesAsRead([message]);
        }

        if (!currentConversation || !isActiveWindow) {
          var sender = findContact(message.data.fromUserId);
          if (sender) {
            var notification = Notification(sender.data.fullName, {
              body: message.data.body,
              icon: $('link[rel="icon"]').attr('href'),
              timestamp: message.createdAtDate.unix()
            });

            notification.onclick = function () {
              viewConversation(conversation);
            };
          }
        }
      }

      // Let's update the UI to reflect the last message
      renderConversationItem(conversation, true);
    }
  }

  function findContact(flUserId) {
    return _.find(contacts, function (contact) {
      return contact.data.flUserId === flUserId;
    });
  }

  function renderMessage(message) {
    if (scrollToMessageTimeout) {
      clearTimeout(scrollToMessageTimeout);
      scrollToMessageTimeout = undefined;
    }

    var sender = findContact(message.data.fromUserId);
    var fetchContactsIfRequired = sender ? Promise.resolve() : getContacts(false);

    fetchContactsIfRequired.then(function () {
      sender = findContact(message.data.fromUserId);

      if (!sender) {
        return;
      }

      var $message = $(Fliplet.Widget.Templates['templates.message']({
        isFromCurrentUser: currentUser.flUserId === message.data.fromUserId,
        sender: sender.data,
        message: message.data,
        timeAgo: message.createdAtDate.fromNow()
      }));

      var scrollTop = $messages.scrollTop();
      var shouldScrollToBottom = scrollTop === 0 || $messages[0].scrollHeight - scrollTop === $messages.outerHeight();

      $message.css('opacity', 0);
      $messages.append($message);
      $message.animate({ opacity: 1}, 500);

      // scroll to bottom
      if (shouldScrollToBottom) {
        scrollToMessageTimeout = setTimeout(function () {
          $messages.stop( true, true ).animate({
            scrollTop: $messages.prop('scrollHeight')
          }, scrollToMessageTs ? SCROLL_TO_MESSAGE_SPEED : 0);
          scrollToMessageTs = 10;
        }, scrollToMessageTs);
      }
    });
  }

  function renderConversationItem(data, replace) {
    var html = Fliplet.Widget.Templates['templates.conversation-item'](data);

    if (replace === true) {
      return $('[data-conversation-id="' + data.id + '"]').replaceWith(html);
    }

    $conversationsList.append(html);
  }

  // ---------------------------------------------------------------
  // init

  $(window).blur(function() { isActiveWindow = false; });
  $(window).focus(function() { isActiveWindow = true; });

  Fliplet.Navigator.onOnline(function () {
    $(ONLINE_INPUTS_SELECTOR).prop('disabled', false);
  });

  Fliplet.Navigator.onOffline(function () {
    $(ONLINE_INPUTS_SELECTOR).prop('disabled', true);
  });

  chatConnection.then(function (chatInstance) {
    chat = chatInstance;
    return Fliplet.App.Storage.get(USERTOKEN_STORAGE_KEY);
  }).then(function (userToken) {
    if (userToken) {
      return chat.login({
        flUserToken: userToken
      }).then(function (user) {
        setCurrentUser(user.data);
        onLogin();
      }, showLoginForm);
    }

    showLoginForm();
  });
});