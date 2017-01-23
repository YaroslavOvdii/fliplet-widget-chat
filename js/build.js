Fliplet.Widget.instance('chat', function (data) {
  if (!data.dataSourceId) {
    return;
  }

  // ---------------------------------------------------------------
  // const setup

  var USER_STORAGE_KEY = '__flChatUser';

  // ---------------------------------------------------------------
  // jquery elements setup

  var $wrapper = $(this);
  var $loginForm = $wrapper.find('form.login');
  var $chat = $wrapper.find('.chat');
  var $conversationsList = $chat.find('.conversations ul');
  var $content = $chat.find('.chat-content');

  // ---------------------------------------------------------------
  // variables setup

  var chat;
  var conversations;
  var chatConnection = Fliplet.Chat.connect(data);

  // ---------------------------------------------------------------
  // events setup

  // Handler to log out
  $chat.find('[data-logout]').click(function (event) {
    event.preventDefault();
    Fliplet.Storage.remove(USER_STORAGE_KEY).then(function () {
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
    var id = $(this).data('create-conversation');

    chat.create({
      name: $(this).text(),
      group: [id]
    }).then(function (conversationId) {
      return getConversations();
    }).then(function () {
      // we assume the new conversation is the first one in the list
      $chat.find('[data-conversation-id]:eq(0)').click();
    });
  })

  // Handler to log in
  $loginForm.submit(function (event) {
    event.preventDefault();

    chatConnection.then(function () {
      return chat.login({
        email: $loginForm.find('[type="email"]').val(),
        password: $loginForm.find('[type="password"]').val()
      });
    }).then(function onLogin(user) {
      $loginForm.addClass('hidden');
      return Fliplet.Storage.set(USER_STORAGE_KEY, user);
    }).then(onLogin);
  });

  // ---------------------------------------------------------------
  // private methods

  function showLoginForm() {
    $chat.addClass('hidden');
    $loginForm.removeClass('hidden');
  }

  function onLogin() {
    $chat.removeClass('hidden');
    getConversations().then(function () {
      return chat.stream(renderMessage);
    })
  }

  function getConversations() {
    return chat.conversations().then(function (response) {
      $conversationsList.html('');

      conversations = response;
      conversations.forEach(renderConversation);
    })
  }

  function viewConversation(conversation) {
    var html = Fliplet.Widget.Templates['templates.conversation-content'](conversation);
    $content.html(html);
  }

  function viewNewConversation() {
    chat.contacts().then(function (contacts) {
      var html = Fliplet.Widget.Templates['templates.new-conversation']({
        contacts: contacts.map(function (contact) {
          return {
            id: contact.id,
            name: contact.data.Name
          }
        })
      });

      $content.html(html);
    });
  }

  function renderMessage(message) {
    console.log(message)
  }

  function renderConversation(conversation) {
    var html = Fliplet.Widget.Templates['templates.conversation-item'](conversation);
    $conversationsList.append(html);
  }

  // ---------------------------------------------------------------
  // init

  chatConnection.then(function (chatInstance) {
    chat = chatInstance;
    return Fliplet.Storage.get(USER_STORAGE_KEY);
  }).then(function (user) {
    if (user) {
      return chat.authenticate(user).then(onLogin, showLoginForm);
    }

    console.log('show')

    showLoginForm();
  });
});