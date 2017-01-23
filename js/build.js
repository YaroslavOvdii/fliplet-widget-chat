Fliplet.Widget.instance('chat', function (data) {

  // ---------------------------------------------------------------
  // variables setup

  var USER_STORAGE_KEY = '__flChatUser';

  var $wrapper = $(this);
  var $login = $wrapper.find('form.login');
  var $chat = $wrapper.find('.chat');
  var $conversations = $chat.find('.conversations ul');
  var chat;

  if (!data.dataSourceId) {
    return;
  }

  var chatConnection = Fliplet.Chat.connect(data);

  // ---------------------------------------------------------------
  // events setup

  $chat.find('[data-logout]').click(function (event) {
    event.preventDefault();
    Fliplet.Storage.remove(USER_STORAGE_KEY).then(function () {
      showLoginForm();
    });
  });

  $login.submit(function (event) {
    event.preventDefault();

    chatConnection.then(function () {
      return chat.login({
        email: $login.find('[type="email"]').val(),
        password: $login.find('[type="password"]').val()
      });
    }).then(function onLogin(user) {
      $login.addClass('hidden');
      return Fliplet.Storage.set(USER_STORAGE_KEY, user);
    }).then(onLogin);
  });

  // ---------------------------------------------------------------
  // private methods

  function showLoginForm() {
    $chat.addClass('hidden');
    $login.removeClass('hidden');
  }

  function onLogin() {
    $chat.removeClass('hidden');
    getConversations().then(function () {
      return chat.stream(renderMessage);
    })
  }

  function getConversations() {
    $conversations.html('');

    return chat.conversations().then(function (conversations) {
      conversations.forEach(renderConversation);
    })
  }

  function renderMessage(message) {
    console.log(message)
  }

  function renderConversation(conversation) {
    console.log(conversation)
    // $conversations.append()
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