Fliplet.Widget.instance('chat', function (data) {

  // ---------------------------------------------------------------
  // const setup

  var USERTOKEN_STORAGE_KEY = '__flChatUserToken';

  // ---------------------------------------------------------------
  // jquery elements setup

  var $wrapper = $(this);
  var $loginForm = $wrapper.find('form.login');
  var $chat = $wrapper.find('.chat');
  var $conversationsList = $chat.find('.conversations ul');
  var $content = $chat.find('.chat-content');

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

  $chat.on('submit', '.new-message', function (event) {
    event.preventDefault();
    var $message = $('[type="text"]');
    var text = $message.val();

    if (!text) {
      return;
    }

    $message.val('');

    chat.message(currentConversation.id, {
      body: text
    }).then(function () {
      // TODO: scroll to bottom on next frame (or CPU cycle)
      // No need to render messages as observables will run automatically
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
      $conversationsList.html('');

      conversations = response;
      conversations.forEach(renderConversationItem);
    })
  }

  function viewConversation(conversation) {
    currentConversation = conversation;

    var html = Fliplet.Widget.Templates['templates.conversation-content'](conversation);
    $content.html(html);

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
    var sender = _.find(contacts, function (contact) {
      return contact.data.flUserId === message.data.fromUserId;
    })

    if (!sender) {
      return;
    }

    var html = Fliplet.Widget.Templates['templates.message']({
      sender: sender.data,
      message: message.data,
      timeAgo: moment(message.createdAt).fromNow()
    });

    $content.find('.messages').append(html);
  }

  function renderConversationItem(conversation) {
    var html = Fliplet.Widget.Templates['templates.conversation-item'](conversation);
    $conversationsList.append(html);
  }

  // ---------------------------------------------------------------
  // init

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