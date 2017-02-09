Handlebars.registerHelper('formatMessage', function(text) {
  text = Handlebars.Utils.escapeExpression(text).replace(/(\r\n|\n|\r)/gm, '<br>');
  return new Handlebars.SafeString(text);
});

Fliplet.Widget.instance('chat', function (data) {
  data = data || {};

  // ---------------------------------------------------------------
  // const setup

  var DEFAULT_CHAT_NAME = 'Conversation';
  var USERID_STORAGE_KEY = 'fl-chat-user-id';
  var USERTOKEN_STORAGE_KEY = 'fl-chat-user-token';
  var CROSSLOGIN_EMAIL_KEY = 'fl-chat-auth-email';
  var ONLINE_INPUTS_SELECTOR = '[data-new-message] input';
  var SCROLL_TO_MESSAGE_SPEED = 500;
  var LOAD_MORE_MESSAGES_PAGE_SIZE = 50;

  // ---------------------------------------------------------------
  // jquery elements setup

  var $wrapper = $(this);
  var $loginForm = $wrapper.find('form.login');
  var $conversationsList = $wrapper.find('[data-conversations-list]');
  var $content = $wrapper.find('[data-conversation]');
  var $messages;

  /*if (!data.dataSourceId) {
    return $wrapper.find('.chat-not-configured').removeClass('hidden');
  }*/

  // ---------------------------------------------------------------
  // variables setup

  var chat;
  var conversations;
  var currentConversation;
  var messages = [];
  var messagesIds = [];
  var contacts = [];
  var currentUser;
  var scrollToMessageTimeout;
  var scrollToMessageTs = 0;
  var chatConnection = Fliplet.Chat.connect(data);
  var isActiveWindow = true;
  var crossLoginColumnName = data.crossLoginColumnName || 'email';
  var fullNameColumnName = data.fullNameColumnName || 'fullName';
  var avatarColumnName = data.avatarColumnName || 'avatar';
  var copiedElem;

  // ---------------------------------------------------------------
  // Copy to clipboard text prototype
  HTMLElement.prototype.copyText = function() {
    var range = document.createRange();
    this.style.webkitUserSelect = 'text';
    range.selectNode(this);
    window.getSelection().addRange(range);
    this.style.webkitUserSelect = 'inherit';

    try {
      // Now that we've selected the anchor text, execute the copy command
      var successful = document.execCommand('copy');
      var msg = successful ? 'successful' : 'unsuccessful';
    } catch(err) {
      console.error('Oops, unable to copy', err);
    }

    // Remove the selections - NOTE: Should use
    // removeRange(range) when it is supported
    window.getSelection().removeAllRanges();
  };

  if (typeof jQuery !== 'undefined') {
    $.fn.copyText = function(){
      return $(this).each(function(i){
        if (i > 0) return;
        this.copyText();
      });
    };
  }

  // ---------------------------------------------------------------
  // events setup

  // Offline/Online Listeners
  Fliplet.Navigator.onOffline(function () {
    $wrapper.addClass('offline');
  });

  Fliplet.Navigator.onOnline(function () {
    $wrapper.removeClass('offline');
  });

  // init bs tooltip
  $wrapper.tooltip({ selector: '[data-toggle="tooltip"]', trigger: 'manual' });

  // Handler to log out
  $wrapper.on('click', '[data-logout]', function (event) {
    //event.preventDefault();
    Fliplet.App.Storage.remove(USERTOKEN_STORAGE_KEY).then(function () {
      return chat.logout();
    }).then(function () {
      return Fliplet.App.Storage.remove(CROSSLOGIN_EMAIL_KEY);
    }).then(function () {
      showLoginForm();
    });
  });

  // Handler to view a conversation
  $wrapper.on('click', '[data-conversation-id]', function () {
    var id = $(this).data('conversation-id');
    var conversation = _.find(conversations, { id: id });
    $(this).parents('.chat-wrapper').addClass('overlay-open');

    scrollToMessageTs = 0;
    viewConversation(conversation);
  });

  $wrapper.on('click', '.profile-header .back-btn', function () {
    $('.chat-wrapper').removeClass('overlay-open');
  });

  $wrapper.on('click', '[data-directory]', function() {
    Fliplet.Navigate.to(data.contactLinkAction);
  });

  $wrapper.on('click', '[refresh-chat]', function() {
    location.reload();
  });

  $wrapper.on('click', '[data-user-profile]', function() {
    var userProfile = encodeURI($(this).data('user-profile'));
    data.contactLinkAction.query = "?action=search&value="+userProfile;
    Fliplet.Navigate.to(data.contactLinkAction);
  });

  $wrapper.on('click', '.chat-text', function() {
    getElemHandler($(this));
    $(this).tooltip('toggle');
    $(this).parents('.chat-body').toggleClass('selected');
    $(this).parents('.chats').find('.chat-text[aria-describedby]').not(this).parents('.chat-body').removeClass('selected');
    $(this).parents('.chats').find('.chat-text[aria-describedby]').not(this).tooltip('hide');
  });

  $(document).on('click', '.tooltip', function() {
    var $el = $(this);
    $(this).parents('.chat-body').removeClass('selected');
    copiedElem.copyText();
    $el.find('.tooltip-inner').text('Copied!');

    setTimeout(function() {
      $el.tooltip('hide');
    }, 500);
  });

  // Handler to view the frame to create a new conversation
  $wrapper.on('click', '[data-new-conversation]', function (event) {
    event.preventDefault();
    viewNewConversation();
  });

  // Handler to create a new conversation
  $wrapper.on('click', '[data-create-conversation]', function (event) {
    event.preventDefault();
    return createConversation($(this).data('create-conversation'));
  });

  // Handler to show who you are sending a message to on focus
  $wrapper.on('focus', '[data-message-body]', function (event) {
    $(this).parents('.input-holder').toggleClass('focus');
  });

  // Handler to show who you are sending a message to on blur
  $wrapper.on('blur', '[data-message-body]', function (event) {
    $(this).parents('.input-holder').toggleClass('focus');
  });

  // Handler to view more messages for a conversation
  $wrapper.on('click', '[data-load-more]', function (event) {
    event.preventDefault();
    var $loadMore = $(this);

    // Take a note of current scroll position
    var $container = $messages.parent();
    var currentHeight = $container[0].scrollHeight;
    var currentPosition = $container.scrollTop();

    loadMoreMessagesForCurrentConversation().then(function (messages) {
      // Update scroll to match previous position
      var newHeight = $container[0].scrollHeight;
      var newPosition = currentPosition + (newHeight - currentHeight);

      // If we got at least how many messages we requested, means we might need the "load more"
      if (!messages.length || messages.length < LOAD_MORE_MESSAGES_PAGE_SIZE) {
        newPosition -= $loadMore.outerHeight();
        $loadMore.hide();
      }

      $container.stop(true, true).scrollTop(newPosition);
    });
  });

  // Handler to post a message to a conversation
  $wrapper.on('click', '[data-new-message] .message-input-btn', function (event) {
    event.preventDefault();

    var _this = $(this);
    var holder = $(this).parents('.input-holder');
    var $message = $('[data-message-body]');
    var text = $message.val();

    if (!text.length) {
      return;
    }

    $(this).addClass('sending');
    holder.addClass('sending');

    chat.message(currentConversation.id, {
      body: text
    }).then(function() {
      $message.val('');
      $message.focus();
      autosize.update($message);

      setTimeout(function() {
        $(_this).removeClass('sending');
        $(holder).removeClass('sending');
      }, 200);

      moveConversationToTop(currentConversation);
    }).catch(function(error) {
      $(holder).addClass('error');
      $(_this).removeClass('sending');
      $(holder).removeClass('sending');

      setTimeout(function() {
        $(holder).removeClass('error');
      }, 1000);
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
      return setCurrentUser(user.data);
    }).then(function () {
      $loginForm.addClass('hidden');
      return onLogin();
    })
    .catch(function (error) {
      // TODO: replace with better error UI
      $wrapper.removeClass('loading empty');
      $wrapper.addClass('error');
    });
  });

  // ---------------------------------------------------------------
  // private methods
  function showLoginForm() {
    // Disable login form for now
    //$wrapper.addClass('loading');
    //$loginForm.removeClass('hidden');
  }

  function onLogin() {
    Notification.requestPermission();

    $wrapper.removeClass('loading');
    $wrapper.removeClass('empty');
    $wrapper.removeClass('error');

    getContacts(false).then(function () {
      return getConversations();
    }).then(function () {
      return chat.stream(onNewMessage);
    }).then(function () {
      var userId = Fliplet.Navigate.query.contactConversation;

      if (userId) {
        createConversation(userId);
      }
    }).catch(function(error) {
      console.warn(error);
      //$wrapper.addClass('error');
    });
  }

  function setCurrentUser(user) {
    currentUser = user;

    return Fliplet.App.Storage.set(USERID_STORAGE_KEY, user.flUserId).then(function () {
      return Fliplet.App.Storage.set(USERTOKEN_STORAGE_KEY, user.flUserToken);
    });
  }

  function createConversation(userId) {
    userId = parseInt(userId, 10);

    return getConversations().then(function () {
      return chat.create({
        name: DEFAULT_CHAT_NAME,
        participants: [userId]
      });
    }).then(function (conversation) {
      var fetchRequiredData = conversation.isNew
        ? getContacts(false).then(function () { return getConversations(); })
        : Promise.resolve();

      return fetchRequiredData.then(function () {
        $wrapper.find('[data-conversation-id="' + conversation.id + '"]').click();
      });
    });
  }

  // All contacts apart from the logged user
  function getContactsWithoutCurrentUser() {
    return _.reject(contacts, function (c) {
      return c.data.flUserId === currentUser.flUserId;
    });
  }

  var getConversationsReqPromise;

  function getConversations() {
    if (getConversationsReqPromise) {
      return getConversationsReqPromise;
    }

    getConversationsReqPromise = chat.conversations().then(function (response) {
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

      $wrapper.toggleClass('empty', !conversations.length);

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
          return c.data[fullNameColumnName];
        })).join(', ').trim();

        var friend = _.find(otherPeople, function (p) {
          return participants.indexOf(p.data.flUserId) !== -1;
        });

        conversation.name = conversationName || conversation.name;
        conversation.avatar = friend ? friend.data[avatarColumnName] : '';
      });

      $conversationsList.html('');
      conversations.forEach(function (conversation) {
        renderConversationItem(conversation);
      });

      getConversationsReqPromise = undefined;
      return Promise.resolve(conversations);
    });

    return getConversationsReqPromise;
  }

  function viewConversation(conversation) {
    currentConversation = conversation;

    var html = Fliplet.Widget.Templates['templates.conversation-content'](conversation);
    $content.html(html);

    $messages = $content.find('[data-conversation-messages]');

    var conversationMessages = _.filter(messages, { dataSourceId: conversation.id });

    conversationMessages.forEach(function (message) {
      renderMessage(message);
    });

    if (!conversationMessages.length) {
      $wrapper.find('[data-load-more]').click();
    }

    //$('[data-message-body]').focus();

    chat.markMessagesAsRead(messages);

    currentConversation.unreadMessages = 0;

    conversations.forEach(function (c) {
      c.isCurrent = c.id === currentConversation.id;
      renderConversationItem(c, true);
    });
  }

  var contactsReqPromise;

  function getContacts(cache) {
    if (!contactsReqPromise) {
      contactsReqPromise = chat.contacts({ cache: cache }).then(function (response) {
        contacts = response;
        contactsReqPromise = undefined;
        return Promise.resolve();
      });
    }

    return contactsReqPromise;
  }

  function moveConversationToTop(conversation) {
    var $el = $('[data-conversation-id="' + conversation.id + '"]');

    if ($el.index()) {
      $el.parent().prepend($el);
    }
  }

  function loadMoreMessagesForCurrentConversation() {
    var conversationMessages = _.filter(messages, { dataSourceId: currentConversation.id });
    var firstMessage = _.minBy(conversationMessages, 'createdAt');

    var where = {};

    if (firstMessage) {
      where.createdAt = { $lt: firstMessage.createdAt };
    }

    return chat.messages({
      conversations: [currentConversation.id],
      limit: LOAD_MORE_MESSAGES_PAGE_SIZE,
      where: where
    }).then(function (previousMessages) {
      previousMessages.forEach(function (message) {
        if (messagesIds.indexOf(message.id) !== -1) {
          return;
        }

        if (currentConversation && currentConversation.id === message.dataSourceId) {
          addMetadataToMessage(message);
          renderMessage(message, true);
        }

        messagesIds.push(message.id);
        messages.unshift(message);
      });

      if (currentConversation && !firstMessage && previousMessages) {
        setConversationLastMessage(currentConversation, previousMessages[0]);

        // Let's update the UI to reflect the last message
        renderConversationItem(currentConversation, true);
      }

      return Promise.resolve(previousMessages);
    });
  }

  function viewNewConversation() {
    return getContacts(false).then(function () {
      var html = Fliplet.Widget.Templates['templates.new-conversation']({
        contacts: getContactsWithoutCurrentUser().map(function (contact) {
          var data = contact.data;
          data.id = contact.id;
          return data;
        })
      });

      $content.html(html);
      return Promise.resolve();
    });
  }

  function addMetadataToMessage(message) {
    message.createdAtDate = moment(message.createdAt);
  }

  function setConversationLastMessage(conversation, message) {
    if (!message || !conversation) {
      return;
    }

    conversation.lastMessage = {
      body: message.data.body,
      date: message.createdAtDate.calendar(null, {
          sameDay: '[Today]',
          nextDay: '[Tomorrow]',
          nextWeek: 'dddd',
          lastDay: '[Yesterday]',
          lastWeek: '[Last] dddd',
          sameElse: 'DD/MM/YYYY'
      })
    };
  }

  function onNewMessage(message) {
    if (messagesIds.indexOf(message.id) !== -1) {
      return;
    }

    addMetadataToMessage(message);

    messages.push(message);
    messagesIds.push(message.id);

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
      setConversationLastMessage(conversation, message);

      if (!message.isReadByCurrentUser) {
        if (!currentConversation || currentConversation.id !== message.dataSourceId) {
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
              timestamp: message.createdAtDate.unix(),
              tag: 'message' + message.id
            });

            notification.onclick = function () {
              window.focus();
              setTimeout(function () {
                viewConversation(conversation);
              }, 0);
            };
          }
        }
      }

      // Let's update the UI to reflect the last message
      renderConversationItem(conversation, true);
    }

    if (messages.length >= chat.getBatchSize()) {
      $wrapper.addClass('show-load-more');
    }
  }

  function findContact(flUserId) {
    return _.find(contacts, function (contact) {
      return contact.data.flUserId === flUserId;
    });
  }

  function renderMessage(message, prepend) {
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
        name: sender.data[fullNameColumnName],
        avatar: sender.data[avatarColumnName],
        message: message.data,
        timeAgo: message.createdAtDate.calendar(null, {
            sameDay: '[Today] HH:mm',
            nextDay: '[Tomorrow] HH:mm',
            nextWeek: 'DD/MM/YYYY',
            lastDay: 'DD/MM - HH:mm',
            lastWeek: 'DD/MM - HH:mm',
            sameElse: 'DD/MM/YYYY'
        })
      }));

      var scrollTop = $messages.scrollTop();
      var shouldScrollToBottom = scrollTop === 0 || $messages[0].scrollHeight - scrollTop === $messages.outerHeight();

      $message.css('opacity', 0);
      $messages[prepend ? 'prepend' : 'append']($message);
      $message.animate({ opacity: 1}, 500);

      // scroll to bottom
      if (shouldScrollToBottom && !prepend) {
        scrollToMessageTimeout = setTimeout(function () {
          $messages.parents('.msg-chats').stop(true, true).animate({
            scrollTop: $messages.parents('.msg-chats').prop('scrollHeight')
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

  function getElemHandler(el){
    copiedElem = el;
  }

  // ---------------------------------------------------------------
  // init

  if (!Fliplet.Navigator.isOnline()) {
    $wrapper.addClass('offline');
  }

  $(document).on('focus', '.chat-wrapper textarea', function() {
    autosize($(this));
  });

  $(window).blur(function() { isActiveWindow = false; });
  $(window).focus(function() { isActiveWindow = true; });

  Fliplet.Navigator.onOnline(function () {
    $(ONLINE_INPUTS_SELECTOR).prop('disabled', false);
  });

  Fliplet.Navigator.onOffline(function () {
    $(ONLINE_INPUTS_SELECTOR).prop('disabled', true);
  });

  chatConnection.then(function onChatConnectionAvailable (chatInstance) {
    chat = chatInstance;

    // Log in with the stored details
    return Fliplet.App.Storage.get(USERTOKEN_STORAGE_KEY).then(function (userToken) {
      if (userToken) {
        return Promise.resolve({
          flUserToken: userToken
        });
      }

      // Log in using authentication from a different component
      return Fliplet.App.Storage.get(CROSSLOGIN_EMAIL_KEY).then(function (email) {
        if (email) {
          var where = {};
          where[crossLoginColumnName] = email;
          return Promise.resolve(where);
        }

        return Promise.reject('User is not logged in');
      });
    });
  }).then(function onLocalLoginAvailable (loginQuery) {
    return chat.login(loginQuery);
  }).then(function onLoginSuccess (user) {
    return setCurrentUser(user.data).then(onLogin);
  }).catch(showLoginForm);
});
