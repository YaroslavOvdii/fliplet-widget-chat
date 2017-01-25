Fliplet.Widget.instance('chat', function (data) {

  // ---------------------------------------------------------------
  // const setup

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

  // Handler to create a new conversation
  $chat.on('click', '[data-new-conversation]', function (event) {
    event.preventDefault();
    viewNewConversation();
  });

  $chat.on('click', '[data-create-conversation]', function (event) {
    event.preventDefault();
    var targetUserId = $(this).data('create-conversation');

    chat.create({
      participants: [targetUserId]
    }).then(function (conversationId) {
      return getConversations();
    }).then(function () {
      // we assume the new conversation is the first one in the list
      $chat.find('[data-conversation-id]:eq(0)').click();
    });
  });

  $chat.on('submit', '[data-new-message]', function (event) {
    event.preventDefault();
    var $message = $('[type="text"]');
    var text = $message.val();

    if (!text) {
      return;
    }

    $message.val('');

    chat.message(currentConversation.id, {
      body: text
    });
  });

  // Handler to log in
  $loginForm.submit(function (event) {
    event.preventDefault();

    chatConnection.then(function () {
      return chat.login({
        email: $loginForm.find('[type="email"]').val(),
        password: $loginForm.find('[type="password"]').val()
      });
    }).then(function onLogin(user) {
      currentUser = user.data;
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
    $chat.removeClass('hidden');

    getContacts().then(function () {
      return getConversations();
    }).then(function () {
      return chat.stream(onMessage);
    });
  }

  function getConversations() {
    return chat.conversations().then(function (response) {
      conversations = response;

      var otherPeople = _.reject(contacts, function (c) {
        return c.data.flUserId === currentUser.flUserId;
      });

      // Add a readable name to the conversation, based on the other people in the group
      conversations.forEach(function (conversation) {
        var participants = conversation.definition.participants;

        var conversationName = _.compact(_.filter(otherPeople, function (c) {
          return participants.indexOf(c.data.flUserId) !== -1;
        }).map(function (c) {
          return c.data[PARTICIPANT_FULLNAME_COLUMN];
        })).join(', ').trim();

        conversation.name = conversationName || conversation.name;
      });

      $conversationsList.html('');
      conversations.forEach(renderConversationItem);
    })
  }

  function viewConversation(conversation) {
    currentConversation = conversation;

    var html = Fliplet.Widget.Templates['templates.conversation-content'](conversation);
    $content.html(html);

    $messages = $content.find('[data-conversation-messages]');

    var conversationMessages = _.filter(messages, { dataSourceId: conversation.id });
    conversationMessages.forEach(renderMessage);
  }

  function getContacts(cache) {
    return chat.contacts().then(function (response) {
      contacts = response;
      return Promise.resolve();
    });
  }

  function viewNewConversation() {
    getContacts().then(function () {
      var html = Fliplet.Widget.Templates['templates.new-conversation']({
        contacts: _.reject(
          contacts.map(function (contact) {
            var data = contact.data;
            data.id = contact.id;
            return data;
          }), function (contact) {
            return contact.flUserId === currentUser.flUserId;
          })
      });

      $content.html(html);
    });
  }

  function onMessage(message) {
    messages.push(message);

    if (currentConversation && message.dataSourceId === currentConversation.id) {
      renderMessage(message);
    }

    var conversation = _.find(conversations, { id: message.dataSourceId });
    if (!conversation) {
      // If we don't find the conversation of this message, most likely means a user just
      // started messaging us on a new conversation so let's just refetch the list
      getConversations();
    }
  }

  function renderMessage(message) {
    if (scrollToMessageTimeout) {
      clearTimeout(scrollToMessageTimeout);
      scrollToMessageTimeout = undefined;
    }

    var sender = _.find(contacts, function (contact) {
      return contact.data.flUserId === message.data.fromUserId;
    })

    if (!sender) {
      return;
    }

    var $message = $(Fliplet.Widget.Templates['templates.message']({
      sender: sender.data,
      message: message.data,
      timeAgo: moment(message.createdAt).fromNow()
    }));

    $message.css('opacity', 0);

    $messages.append($message);

    $message.animate({ opacity: 1}, 500);

    // scroll to bottom
    scrollToMessageTimeout = setTimeout(function () {
      $messages.stop( true, true ).animate({
        scrollTop: $messages.prop('scrollHeight')
      }, scrollToMessageTs ? SCROLL_TO_MESSAGE_SPEED : 0);
      scrollToMessageTs = 10;
    }, scrollToMessageTs);
  }

  function renderConversationItem(conversation) {
    var html = Fliplet.Widget.Templates['templates.conversation-item'](conversation);
    $conversationsList.append(html);
  }

  // ---------------------------------------------------------------
  // init

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
        currentUser = user.data;
        onLogin();
      }, showLoginForm);
    }

    showLoginForm();
  });
});