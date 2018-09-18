/* Handlebars Helpers */
Handlebars.registerHelper('formatMessage', function(text) {
  // User separate var lines ending in ; so that each line can be stepped over individually when necessary
  var breakRegExp = /(\r\n|\n|\r)/gm;
  var emailRegExp = /(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/gm;
  var numberRegExp = /[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,8}/gm;
  var urlRegExp = /(?:^|[^@\.\w-])([a-z0-9]+:\/\/)?(\w(?!ailto:)\w+:\w+@)?([\w.-]+\.[a-z]{2,4})(:[0-9]+)?(\/.*)?(?=$|[^@\.\w-])/ig;

  if (text) {
    /* capture email addresses and turn into mailto links */
    text = text.replace(emailRegExp, '<a href="mailto:$&">$&</a>');

    /* capture phone numbers and turn into tel links */
    text = text.replace(numberRegExp, '<a href="tel:$&">$&</a>');

    /* capture URLs and turn into links */
    text = text.replace(urlRegExp, function(match, p1, p2, p3, p4, p5, offset, string) {
      return breakRegExp.test(string) ? ' <a href="' + (typeof p1 !== "undefined" ? p1 : "http://") + p3 + (typeof p5 !== "undefined" ? p5 : "") + '">' + (typeof p1 !== "undefined" ? p1 : "") + p3 + (typeof p5 !== "undefined" ? p5 : "") + '</a><br>' :
        ' <a href="' + (typeof p1 !== "undefined" ? p1 : "http://") + p3 + (typeof p5 !== "undefined" ? p5 : "") + '">' + (typeof p1 !== "undefined" ? p1 : "") + p3 + (typeof p5 !== "undefined" ? p5 : "") + '</a>';
    });

    /* capture line break and turn into <br> */
    text = text.replace(breakRegExp, '<br>');
  }

  return new Handlebars.SafeString(text);
});
Handlebars.registerHelper('ifIs', function(v1, v2, options) {
  if (v1 === v2) {
    return options.fn(this);
  }
  return options.inverse(this);
});

Fliplet.Widget.instance('chat', function (data) {
  data = data || {};

  var screenWidth = $(window).width();
  var PAN_VELOCITY_BOUNDARY = 0.5;
  var PAN_WINDOW_FRACTION = 3;
  var ANIMATION_SPEED_SLOW = 200;
  var ANIMATION_SPEED_FAST = 100;
  var hammer;
  var $wrapper = $('.chat-holder');
  var $chatOverlay = $('.chat-area');
  var $contactOverlay = $('.contacts-holder-overlay');
  var $groupCreationOverlay = $('.group-name-holder');
  var $list = $('.chat-list');
  var $messagesHolder = $('.chat-messages-holder');
  var $messageArea = $('[data-message-body]');
  var $participantsList = $('.group-participants-list');
  var $messages;
  var $conversationsList = $wrapper.find('.chat-list');
  var listOffset;
  var opacity = 0.3;
  var allowClick = true;
  var autosizeInit = false;
  /** PHOTOSWIPE **/
  var photoswipeHtml = '<!-- Root element of PhotoSwipe. Must have class pswp. --> <div class="pswp" tabindex="-1" role="dialog" aria-hidden="true"> <!-- Background of PhotoSwipe. It s a separate element as animating opacity is faster than rgba(). --> <div class="pswp__bg"></div> <!-- Slides wrapper with overflow:hidden. --> <div class="pswp__scroll-wrap"> <!-- Container that holds slides. PhotoSwipe keeps only 3 of them in the DOM to save memory. Don t modify these 3 pswp__item elements, data is added later on. --> <div class="pswp__container"> <div class="pswp__item"></div> <div class="pswp__item"></div> <div class="pswp__item"></div> </div> <!-- Default (PhotoSwipeUI_Default) interface on top of sliding area. Can be changed. --> <div class="pswp__ui pswp__ui--hidden"> <div class="pswp__top-bar"> <!-- Controls are self-explanatory. Order can be changed. --> <div class="pswp__counter"></div> <button class="pswp__button pswp__button--close" title="Close (Esc)"></button> <!-- <button class="pswp__button pswp__button--share" title="Share"> --> </button> <button class="pswp__button pswp__button--fs" title="Toggle fullscreen"></button> <button class="pswp__button pswp__button--zoom" title="Zoom in/out"></button> <!-- Preloader demo http://codepen.io/dimsemenov/pen/yyBWoR --> <!-- element will get class pswp__preloader--active when preloader is running --> <div class="pswp__preloader"> <div class="pswp__preloader__icn"> <div class="pswp__preloader__cut"> <div class="pswp__preloader__donut"></div> </div> </div> </div> </div> <div class="pswp__share-modal pswp__share-modal--hidden pswp__single-tap"> <div class="pswp__share-tooltip"></div> </div> <button class="pswp__button pswp__button--arrow--left" title="Previous (arrow left)"> </button> <button class="pswp__button pswp__button--arrow--right" title="Next (arrow right)"> </button> <div class="pswp__caption"> <div class="pswp__caption__center"></div> </div> </div> </div> </div>';
  // Check if there's already
  if (!$('.pswp').length) {
    $("body").append($(photoswipeHtml));
  }
  var pswpElement = document.querySelectorAll('.pswp')[0];
  var galleries = {};

  /* Templates */
  var conversationGroupsTemplate = Handlebars.compile(Fliplet.Widget.Templates['templates.conversations-group']());
  var conversationTemplate = Handlebars.compile(Fliplet.Widget.Templates['templates.conversation-item']());
  var chatHeaderTemplate = Handlebars.compile(Fliplet.Widget.Templates['templates.chat-header']());
  var chatMessageTemplate = Handlebars.compile(Fliplet.Widget.Templates['templates.message-item']());
  var chatQueueMessageTemplate = Handlebars.compile(Fliplet.Widget.Templates['templates.message-queue']());
  var contactsListTemplate = Handlebars.compile(Fliplet.Widget.Templates['templates.contacts-list']());
  var adminButtonsTemplate = Handlebars.compile(Fliplet.Widget.Templates['templates.admin-button-group']());
  var selectedContactTemplate = Handlebars.compile(Fliplet.Widget.Templates['templates.select-contact-bubble']());
  var groupContactTemplate = Handlebars.compile(Fliplet.Widget.Templates['templates.group-contacts-template']());

  /* Chat variables */
  var QUEUE_MESSAGE_KEY = 'fl-msg-queue';
  var DEFAULT_CHAT_NAME = 'Group';
  var USERID_STORAGE_KEY = 'fl-chat-user-id';
  var USERTOKEN_STORAGE_KEY = 'fl-chat-user-token';
  var CROSSLOGIN_EMAIL_KEY = 'fl-chat-auth-email';
  var messagesQueue;
  var chat;
  var conversations;
  var currentConversation;
  var messages = [];
  var messagesIds = [];
  var messageToEdit;
  var contacts = [];
  var otherPeople = [];
  var contactsSelected = [];
  var currentUser;
  var scrollToMessageTimeout;
  var scrollToMessageTs = 0;
  var searchTimeout;
  var messageClickTimeout = 0;
  var messageClickTimeout, lockTimer;
  var longPressed = false;
  var touchduration = 400;
  var SCROLL_TO_MESSAGE_SPEED = 200;
  var LOAD_MORE_MESSAGES_PAGE_SIZE = 50;
  var isActiveWindow = true;
  var crossLoginColumnName = data.crossLoginColumnName;
  var fullNameColumnName = data.fullNameColumnName;
  var firstNameColumnName = data.firstNameColumnName;
  var lastNameColumnName = data.lastNameColumnName;
  var avatarColumnName = data.avatarColumnName;
  var titleColumnName = data.titleColumnName;
  var multipleNameColumns = !!(firstNameColumnName && lastNameColumnName);

  var securityScreenAction = data.securityLinkAction;
  var chatConnection = Fliplet.Chat.connect({
    encryptMessages: true,
    pushNotifications: true,
    dataSourceId: data.dataSourceId,
    crossLoginColumnName: crossLoginColumnName,
    fullNameColumnName: fullNameColumnName
      ? fullNameColumnName
      : firstNameColumnName + ' ' + lastNameColumnName,
    avatarColumnName: avatarColumnName
  });

  var fileImages = {};
  var selectedFileInputName;
  var jpegQuality = 80;
  var customWidth = 1024;
  var customHeight = 1024;

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

  function panChat(e) {
    listOffset = listOffset || $list.offset().left;

    // Prevent scrolling right when scrolling up and bit to the right
    var deltaY = e.deltaY;
    var deltaX = e.deltaX;
    var distanceY = e.distance - Math.abs(deltaY);
    var distanceX = e.distance - Math.abs(deltaX);
    var position = listOffset + (deltaX / 4);

    if (distanceX < distanceY) {
      onMessageAreaBlur();

      $chatOverlay.css({
        'transition': 'none',
        '-webkit-transform': 'translate3d(' + Math.max(deltaX, 0) + 'px, 0, 0)',
        'transform': 'translate3d(' + Math.max(deltaX, 0) + 'px, 0, 0)'
      });

      $list.css({
        'transition': 'none',
        '-webkit-transform': 'translate3d(' + position + 'px, 0, 0)',
        'transform': 'translate3d(' + position + 'px, 0, 0)'
      });
    }
  }

  function panChatEnd(e) {
    // Prevent closing animation
    var deltaY = e.deltaY;
    var deltaX = e.deltaX;
    var distanceY = Math.abs(deltaY);
    var distanceX = Math.abs(deltaX);
    var velocityX = e.velocityX;
    var animationSpeed = (velocityX < PAN_VELOCITY_BOUNDARY)
      ? ANIMATION_SPEED_SLOW
      : ANIMATION_SPEED_FAST;

    $chatOverlay.css({
      'transition': 'all ' + animationSpeed + 'ms ease-out'
    });
    $list.css({
      'transition': 'all ' + animationSpeed + 'ms ease-out'
    });

    if (distanceX > distanceY && velocityX > PAN_VELOCITY_BOUNDARY) {
      closeConversation();
      return;
    }

    if (deltaX > screenWidth / PAN_WINDOW_FRACTION && distanceX > distanceY) {
      closeConversation();
      return;
    }

    $chatOverlay.css({
      '-webkit-transform': 'translate3d(0, 0, 0)',
      'transform': 'translate3d(0, 0, 0)'
    });
    $list.css({
      '-webkit-transform': 'translate3d(-25%, 0, 0)',
      'transform': 'translate3d(-25%, 0, 0)'
    });
  }

  function openConversation(conversationId) {
    if (screenWidth < 640) {
      $chatOverlay.css({
        '-webkit-transform': 'translate3d(0, 0, 0)',
        'transform': 'translate3d(0, 0, 0)',
        'transition': 'all ' + ANIMATION_SPEED_SLOW + 'ms ease-out'
      });
      $list.css({
        '-webkit-transform': 'translate3d(-25%, 0, 0)',
        'transform': 'translate3d(-25%, 0, 0)',
        'transition': 'all ' + ANIMATION_SPEED_SLOW + 'ms ease-out'
      });
      bindChatTouchEvents();
    }
    $('.chat-card-holder').removeClass('open');
    $('.chat-card-holder[data-conversation-id="'+ conversationId +'"]').addClass('open');
  }

  function openContacts() {
    $wrapper.addClass('in-contacts');
  }

  function openGroupCreationSettings() {
    checkGroupCanBeCreated();
    $('.participant-count').text(contactsSelected.length);

    $wrapper.addClass('in-create-group');
  }

  function openGroupParticipantsPanel() {
    var participantsIds = currentConversation.definition.participants;
    var participants = [];
    var participants = _.filter(contacts, function(contact) {
      return participantsIds.indexOf(contact.data.flUserId) > -1;
    });
    var participantsHTML = groupContactTemplate(participants);

     $('.participants-info').html(currentConversation.name);
    $participantsList.html(participantsHTML);
    $wrapper.addClass('in-group-info');
  }

  function closeGroupParticipantsPanel() {
    $wrapper.removeClass('in-group-info');
  }

  function closeGroupCreationSettings() {
    $('.group-name-field').val('');
    $wrapper.removeClass('in-create-group');
  }

  function removeSelected() {
    contactsSelected = [];
    $('.contact-card.contact-selected').removeClass('contact-selected');
    $('.contact-image-holder').remove();
    $('.show-selected-users').removeClass('showing');

    checkHowManySelected();
  }

  function closeContacts() {
    removeSelected();
    $wrapper.removeClass('in-contacts');
  }

  function closeConversation(clickedChat) {
    $wrapper.removeClass('chat-open');
    $('.long-pressed').removeClass('long-pressed');
    $('.chat-area').removeClass('message-focused');
    $('.chat-card-holder').removeClass('open');

    $chatOverlay.css({
      '-webkit-transform': 'translate3d(100%, 0, 0)',
      'transform': 'translate3d(100%, 0, 0)'
    });
    $list.css({
      '-webkit-transform': 'translate3d(0, 0, 0)',
      'transform': 'translate3d(0, 0, 0)'
    });
    unbindTouchEvents();
    $messageArea.blur();

    currentConversation = undefined;
  }

  function bindChatTouchEvents() {
    var handle = document.getElementById('chat-handle');
    hammer = hammer || new Hammer(handle);

    hammer.on('panright panleft', panChat);
    hammer.on('panend', panChatEnd);
  }

  function unbindTouchEvents() {
    hammer.off('panright panleft', panChat);
    hammer.off('panend', panChatEnd);
  }

  function checkGroupCanBeCreated() {
    var count = contactsSelected.length;
    var groupName = $('.group-name-field').val();

    if (count && groupName.length) {
      $('.group-top-header').addClass('ready');
      return;
    }

    $('.group-top-header').removeClass('ready');
  }

  function checkHowManySelected() {
    checkGroupCanBeCreated();
    var count = contactsSelected.length;

    if (count) {
      $('.contacts-top-header').addClass('ready');
      $('.contacts-holder-overlay').addClass('selecting');
      return;
    }

    $('.contacts-top-header').removeClass('ready');
    $('.contacts-holder-overlay').removeClass('selecting');
  }

  function removeContactSelectedByIcon(element, userId) {
    _.remove(contactsSelected, function(obj) {
      return obj.id === userId;
    });

    $('[data-selected-contact-id="' + userId + '"]').remove();
    $('[data-contact-id="' + userId + '"].contact-card').removeClass('contact-selected');

    if (!contactsSelected.length && $('.show-selected-users').hasClass('showing')) {
      $('.show-selected-users').removeClass('showing');
    }

    checkHowManySelected();
  }

  function handleContactSelection(element, selectedUserInfo, userId) {
    var $selectedUsers = $('.show-selected-users');
    var selectedContactHTML = selectedContactTemplate(selectedUserInfo[0]);
    var totalWidth = 0;

    if (element.hasClass('contact-selected')) {
      contactsSelected.push(selectedUserInfo[0]);
      $selectedUsers.addClass('showing');
      $selectedUsers.append(selectedContactHTML);

      // Animates after adding the element
      $selectedUsers.find('.contact-image-holder').each(function(idx, element) {
        var elementWidth = $(element).outerWidth(true);
        totalWidth += elementWidth;
      });
      $selectedUsers.animate({
        scrollLeft: totalWidth
      }, 200, 'swing');
    } else {
      _.remove(contactsSelected, function(obj) {
        return obj.id === userId;
      });

      $selectedUsers.find('[data-selected-contact-id="' + selectedUserInfo[0].id + '"]').remove();

      if (!contactsSelected.length) {
        $selectedUsers.removeClass('showing');
      }
    }

    checkHowManySelected();
  }

  function updateMessage(button) {
    var $parentHolder = button.parents('.chat-input-controls');
    var $holder = button.parents('.input-second-row');
    var text = $messageArea.val();
    var messageToReplace;

    $holder.addClass('sending');

    chat.updateMessage(currentConversation.id, messageToEdit, {
      body: text,
      isEdited: true
    })
    .then(function(newMessageFromDS) {
      // Update message locally
      messages.forEach(function(obj, index) {
        if (obj.id === messageToEdit) {
          messages[index].data.body = text;
          messages[index].data.isEdited = true;
          messageToReplace = messages[index];
        }
      });

      renderMessageInPlace(messageToReplace, true);

      $messageArea.val('');
      onMessageAreaInput();
      autosize.update($messageArea);
      $parentHolder.removeClass('editing-message');
      $holder.removeClass('sending');
      messageToEdit = undefined;

      // Update conversation UI
      var conversationMessages = _.filter(messages, { dataSourceId: currentConversation.id });
      setConversationLastMessage(currentConversation, conversationMessages[conversationMessages.length - 1]);
      renderConversations(currentConversation, true);
    })
    .catch(function(error) {
      var actions = [];

      $parentHolder.removeClass('editing-message');
      $holder.removeClass('sending');

      if (error) {
        actions.push({
          label: 'Details',
          action: function () {
            Fliplet.UI.Toast({
              message: Fliplet.parseError(error)
            });
          }
        });
      }
      Fliplet.UI.Toast({
        message: 'Error updating the message. Please try again.',
        actions: actions
      });
    });
  }

  function deleteMessage(messageHolder) {
    var messageId = messageHolder.data('message-id');

    Fliplet.DataSources.connect(currentConversation.id).then(function (connection) {
      connection.removeById(messageId).then(function onRemove() {
        // Remove from local messages array
        _.remove(messages, function(obj) {
          return obj.id === messageId;
        });

        _.remove(messagesIds, function(id) {
          return id === messageId;
        });

        var conversationMessages = _.filter(messages, { dataSourceId: currentConversation.id });
        messageHolder.remove();
        setConversationLastMessage(currentConversation, conversationMessages[conversationMessages.length - 1]);
        renderConversations(currentConversation, true);
      });
    })
    .catch(function(error) {
      var actions = [];
      if (error) {
        actions.push({
          label: 'Details',
          action: function () {
            Fliplet.UI.Toast({
              message: Fliplet.parseError(error)
            });
          }
        });
      }
      Fliplet.UI.Toast({
        message: 'Error deleting the message. Please try again.',
        actions: actions
      });
    });
  }

  function deleteConversation(conversationId, userToRemove, isGroup) {
    var options = {
      title: isGroup ? 'Leave group' : 'Delete conversation',
      message: isGroup ? 'Are you sure you want to leave this group?' : 'Are you sure you want to delete this conversation?',
      labels: isGroup ? ['Leave','Cancel'] : ['Delete','Cancel'] // Native only (defaults to [OK,Cancel])
    };

    Fliplet.Navigate.confirm(options)
      .then(function(result) {
        if (!result) {
          return;
        }

        // Get the conversation
        conversationToBeRemoved = _.filter(conversations, function(conversation) {
          return conversation.id === conversationId;
        });

        // Remove current user from conversation
        conversationToBeRemoved[0].participants.remove(userToRemove.id);

        // Remove the conversation from the stored list
        _.remove(conversations, function(conversation) {
          return conversation.id === conversationId;
        });

        // Remove conversation UI from screen
        $('.chat-card[data-conversation-id="' + conversationId + '"]').remove();

        // Check if time group is empty, if it is, remove it
        $('.chat-group-holder').each(function() {
          if ( !$.trim( $(this).html() ).length ){
            $(this).parents('.chat-users-group').remove();
          }
        });

        // Check if conversation list is empty, if it is add empty state
        if ( !$.trim( $('.chat-list').html() ).length ){
          $('.chat-holder').addClass('empty');
        }
      });
  }

  function onMessageAreaBlur() {
    if (!Modernizr.ios) {
      return;
    }
  
    setTimeout(function() {
      $messageArea.parents('.chat-input-controls').removeClass('open');
      $messageArea.parents('.chat-area').removeClass('open');

      // Removes binding
      $(document).off('touchstart', '[data-message-body]');
    }, 0);
  }

  function messageAreaFocus() {
    if (!Modernizr.ios) {
      $messageArea.focus();
      return;
    }    
  
    // For iOS we need to trigger the touchstart event for the .focus() to register
    // It's not ideal but required
    $messageArea.trigger('touchstart');
  }

  function onMessageAreaTouchStart() {
    $messageArea.focus();
  }

  function onMessageAreaFocus() {
    if (!Modernizr.ios) {
      return;
    }

    // Fixes chat area height on iOS
    // @TODO: Test other keyboards
    // Still buggy
    // $('.chat-area').animate({
    //   'bottom': 0
    // }, {
    //   progress: function() {
    //     $(this).css({
    //       'bottom': document.body.scrollTop
    //     });
    //   },
    //   complete: function() {
    //     document.body.scrollTop = 0;
    //   }
    // });

    setTimeout(function() {
      $messageArea.parents('.chat-input-controls').addClass('open');
      $messageArea.parents('.chat-area').addClass('open');

      // Adds binding
      $(document).on('touchstart', '[data-message-body]', onMessageAreaTouchStart);
    }, 0);
  }

  function onMessageAreaInput() {
    var value = $messageArea.val();

    if (value.length || $('.chat-area').hasClass('image-selected')) {
      $messageArea.parents('.chat-input-controls').addClass('ready');
    } else {
      $messageArea.parents('.chat-input-controls').removeClass('ready');
    }
  }

  function createChatPresetGroup() {
    var groupData = $(this).data('group');
    $('.contacts-done-holder').addClass('creating');

    if (!Fliplet.Navigator.isOnline()){
      options = {
        title: 'You are offline',
        message: 'An internet connection is necessary to create a conversation or group.'
      };

      Fliplet.UI.Toast(options);
      $('.contacts-done-holder').removeClass('creating');
      return;
    }

    createGroupConversation(groupData);
  }

  function createNewChatGroup() {
    var groupName = $('.group-name-field').val();
    var userIds = _.map(contactsSelected, function (el) { return el.id; });
    $('.contacts-done-holder').addClass('creating');

    if (!Fliplet.Navigator.isOnline()){
      options = {
        title: 'You are offline',
        message: 'An internet connection is necessary to create a conversation or group.'
      };

      Fliplet.UI.Toast(options);
      $('.contacts-done-holder').removeClass('creating');
      return;
    }

    createConversation(userIds, false, groupName);
  }

  function createNewChatGroupSettings() {
    if (!Fliplet.Navigator.isOnline()){
      options = {
        title: 'You are offline',
        message: 'An internet connection is necessary to create a conversation or group.'
      };

      Fliplet.UI.Toast(options);
      return;
    }

    // If only one user is selected, create direct conversation
    if (contactsSelected.length === 1) {
      $('.contacts-done-holder').addClass('creating');
      var userIds = _.map(contactsSelected, function (el) { return el.id; });
      createConversation(userIds);
      return;
    }

    openGroupCreationSettings();
  }

  function attacheEventListeners() {
    var elementStartX;
    var totalMove;
    var deviceEvents;
    var startTouchEvent = Modernizr.touchevents ? 'touchstart' : 'mousedown';
    var endTouchEvent = Modernizr.touchevents ? 'touchend' : 'mouseup';

    $(window).blur(function() { isActiveWindow = false; });
    $(window).focus(function() { isActiveWindow = true; });
    
    Fliplet.Navigator.onOffline(function() {
      $wrapper.addClass('offline');
      Fliplet.UI.Toast('You are offline');
    });

    Fliplet.Navigator.onOnline(function() {
      $wrapper.removeClass('offline');
      Fliplet.UI.Toast('You are back online');
    });

    $(window).resize(function() {
      screenWidth = $(window).width();
    });

    $(document)
      .on('click', '.chat-image', function(e) {
        e.stopPropagation();
        
        // If offline, don't start gallery
        var offlineHolder = $(this).find('.offline-image-holder');
        if (!offlineHolder.hasClass('hidden')) {
          return;
        }

        var imgElement = $(this).find('img');
        expandImage(imgElement);
      })
      .on('click', '.chat-user-info.group', openGroupParticipantsPanel)
      .on('click', '.group-participants-back', closeGroupParticipantsPanel)
      .on('click', '.btn-create-group', createChatPresetGroup)
      .on('click', '.start-new', openContacts)
      .on('click', '.contacts-back', closeContacts)
      .on('click', '.clear-selection', removeSelected)
      .on('input', '.group-name-field', checkGroupCanBeCreated)
      .on('click', '.contacts-create-back', closeGroupCreationSettings)
      .on('click', '.contacts-create', createNewChatGroup)
      .on('click', '.contacts-done', createNewChatGroupSettings)
      .on('click', '.contact-image-holder .fa-times', function() {
        var userId = $(this).parents('.contact-image-holder').data('selected-contact-id');
        removeContactSelectedByIcon($(this), userId);
      })
      .on('click', '.chat-card-holder[data-conversation-id]', function() {
        if (allowClick) {
          var id = $(this).data('conversation-id');
          var conversation = _.find(conversations, { id: id });

          scrollToMessageTs = 100;
          $messagesHolder.html('');
          viewConversation(conversation);
        }
      })
      .on('click', '.contacts-user-list .contact-card', function() {
        var userId = $(this).data('contact-id');
        var selectedUserInfo = _.filter(otherPeople, function(o) { return o.id === userId; });

        if (allowClick) {
          $(this).toggleClass('contact-selected');
          handleContactSelection($(this), selectedUserInfo, userId);
        }
      })
      .on('click', '.show-more', function(e) {
        e.stopPropagation();
        $(this).parents('.chat-card-holder').toggleClass('show-delete');
      })
      .on('click', '.delete-conversation', function() {
        var isGroup = $(this).parents('.chat-card').find('.chat-card-holder').hasClass('group');
        var conversationId = $(this).parents('.chat-card').find('.chat-card-holder').data('conversation-id');

        deleteConversation(conversationId, currentUserAllData, isGroup);
      })
      .on('click', '.chat-back', closeConversation)
      .on('touchstart', '.contact-card', function(event) {
        event.stopPropagation();
        $(this).addClass('hover');
      })
      .on('touchstart', '.chat-card-holder', function(event) {
        event.stopPropagation();
        var rect = event.target.getBoundingClientRect();
        elementStartX = event.originalEvent.touches[0].pageX - rect.left;

        $(this).addClass('draggable');
        $(this).addClass('hover');
      })
      .on('touchend touchcancel', '.chat-card-holder, .contact-card', function() {
        $(this).removeClass('hover');
        // Delay to compensate for the fast click event
        setTimeout(function() {
          allowClick = true;
        }, 100);
      })
      .on('touchmove', '.contact-card', function() {
        allowClick = false;
        $(this).removeClass('hover');
      })
      .on('touchmove', '.chat-card-holder', function(event) {
        allowClick = false;
        $(this).removeClass('hover');

        var touchX = event.originalEvent.touches[0].clientX;
        totalMove = touchX - elementStartX;

        if (totalMove >= 0) { return; }

        $(this).css({
          'transition': 'none',
          '-webkit-transform': 'translate3d(' + totalMove + 'px, 0px, 0px)',
          'transform': 'translate3d(' + totalMove + 'px, 0px, 0px)'
        });
      })
      .on('touchend', '.chat-card-holder', function() {
        if (totalMove > -66) {
          $(this).removeClass('draggable').css({
            'transition': 'all 150ms ease-out',
            '-webkit-transform': 'translate3d(0px, 0px, 0px)',
            'transform': 'translate3d(0px, 0px, 0px)'
          });
          $(this).removeClass('toLeftProxy');
        } else {
          $(this).removeClass('draggable').css({
            'transition': 'all 150ms ease-out',
            '-webkit-transform': 'translate3d(-67px, 0px, 0px)',
            'transform': 'translate3d(-67px, 0px, 0px)'
          });
          $(this).addClass('toLeftProxy');
          totalMove = 0;
        }
      })
      .on('focus', '[data-message-body]', onMessageAreaFocus)
      .on('blur', '[data-message-body]', onMessageAreaBlur)
      .on('input', '[data-message-body]', onMessageAreaInput)
      .on('click', '[refresh-chat]', function() {
        location.reload();
      })
      .on('click', '.chat-body', function(e) {
        var parent = $(this).parents('.chat');

        $('.chat.tapped').not(parent).removeClass('tapped');
        parent.toggleClass('tapped');
      })
      .on('click', '.copy-message', function() {
        var _this = $(this);
        var elementToCopy = $(this).parents('.chat').find('.chat-text');
        elementToCopy.copyText();

        $('.chat-area').addClass('copied');
        $('.chat.tapped').removeClass('tapped');
        setTimeout(function() {
          $('.chat-area').removeClass('copied');
        }, 1200);
      })
      .on('click', '.edit-message', function() {
        messageToEdit = $(this).parents('.chat').data('message-id');
        var textToEdit = $(this).parents('.chat').find('.chat-text').text().trim();

        $(this).parents('.chat').addClass('editing');
        $('.chat.tapped').removeClass('tapped');
        $messageArea.val(textToEdit);
        onMessageAreaInput();
        autosize.update($messageArea);
        $('.chat-input-controls').addClass('editing-message');
        messageAreaFocus();
      })
      .on('click', '.cancel-editing-button', function() {
        $messageArea.val('');
        autosize.update($messageArea);
        $('.chat').removeClass('editing');
        $('.chat-input-controls').removeClass('editing-message ready');
      })
      .on('click', '.delete-message', function() {
        var deleteButton = $(this);
        var message = $(this).parents('.chat');

        var options = {
          title: 'Delete message',
          message: 'Are you sure you want to delete this message?',
          labels: ['Delete','Cancel'] // Native only (defaults to [OK,Cancel])
        };

        if (!Fliplet.Navigator.isOnline()){
          options = {
            title: 'You are offline',
            message: 'An internet connection is necessary to delete a message.'
          };

          Fliplet.UI.Toast(options);
          return;
        }

        Fliplet.Navigate.confirm(options)
          .then(function(result) {
            if (!result) {
              return;
            }

            $(this).find('span').text('Deleting...')

            deleteMessage(message);
          });
      })
      .on('click', '.send-save-button', function(e) {
        e.preventDefault();

        updateMessage($(this));
      })
      .on('click', '.send-button', function(e) {
        e.preventDefault();

        var _this = $(this);
        var $parentHolder = $(this).parents('.chat-input-controls');
        var $holder = $(this).parents('.input-second-row');
        var text = $messageArea.val();
        var files;

        $holder.addClass('sending');

        messageAreaFocus();

        getFileData().then(function(files) {
          if (!$.trim(text).length && (typeof files === 'undefined' || files === '')) {
            return;
          }

          var messageData = {
            guid: Fliplet.guid(),
            body: text,
            file: files ? files.file : [],
            fileType: files ? files.fileType : undefined,
            imageWidth: files ? files.imageWidth : undefined,
            imageHeight: files ? files.imageHeight : undefined,
            sentTime: new Date(),
            conversationId: currentConversation.id
          };

          messagesQueue.push(messageData);

          // Saves new message in QUEUE
          Fliplet.Storage.set(QUEUE_MESSAGE_KEY, messagesQueue)
            .then(function(newQueue) {
              renderQueueMessage(messageData);

              // UI CHANGES
              $messageArea.val('');
              autosize.update($messageArea);
              $parentHolder.removeClass('ready');
              $holder.removeClass('sending');
              resetImages();

              // RETURN
              return Promise.resolve(newQueue);
            })
            .then(function(savedQueue) {
              var sendReqPromises = [];
              if (Fliplet.Navigator.isOnline()){
                savedQueue.forEach(function(message) {
                  sendReqPromises.push(chat.message(currentConversation.id, message));
                });

                return Promise.all(sendReqPromises).then(function(results) {
                  moveConversationToTop(currentConversation);
                });
              }
            });
        })
        .catch(function(error) {
          $holder.addClass('error');

          setTimeout(function() {
            $holder.removeClass('error');
          }, 1000);
        });
      })
      .on('keyup paste', '.search-holder input', function(e) {
        var searchQuery = $(this).val().toLowerCase();
        $('.section-label-wrapper').addClass('is-searching');

        if (searchTimeout) {
          clearTimeout(searchTimeout);
          searchTimeout = null;
        }

        searchTimeout = setTimeout(function() {
          searchData(searchQuery);
        }, 350);
      })
      .on('click', '.search-holder .fa-times', function() {
        clearSearch();
      })
      .on('click', '.image-button input', function(event) {
        var fileInput = event.target;
        fileInput.newValue = [];

        // Web
        if (Fliplet.Env.is('web') || !navigator.camera) {
          return;
        }

        event.preventDefault();

        requestPicture(fileInput).then(function onRequestedPicture(options) {
          getPicture(options);
        });
      })
      .on('change', '.image-button input', function(e) {
        var files = e.target.files;
        selectedFileInputName = e.target.name;
        var maxWidth = customWidth;
        var maxHeight = customHeight;
        var file;
        for (var i = 0, l = files.length; i < l; i++) {
          if (i > 0) {
            // Restrict support to only 1 file at the moment
            return;
          }

          file = files[i];
          // Prevent any non-image file type from being read.
          if (!file.type.match(/image.*/)) {
            return console.warn("File is not an image: ", file.type);
          }

          // In case it's an animated GIF
          if (file.type === 'image/gif') {
            previewFile(file);
            return;
          }

          processWebSelectedImage(file, maxWidth, maxHeight);
        }
      })
      .on('click', '.clear-image', function() {
        resetImages();
      });

    var iScrollPos = 0;
    var loadMoreReqPromise;
    $('.chat-messages-holder').on('scroll', function(event) {
      var iCurScrollPos = $(this).scrollTop();

      if (iCurScrollPos < iScrollPos && iCurScrollPos < 250 && !loadMoreReqPromise) {
        loadMoreReqPromise = loadMoreMessagesForCurrentConversation(currentConversation).then(function(messages) {
          if (!messages.length || messages.length < LOAD_MORE_MESSAGES_PAGE_SIZE) {
            return Promise.resolve();
          }
          loadMoreReqPromise = undefined;
          return Promise.resolve();
        })
        .catch(function(error) {
          var actions = [];
          if (error) {
            actions.push({
              label: 'Details',
              action: function () {
                Fliplet.UI.Toast({
                  message: Fliplet.parseError(error)
                });
              }
            });
          }
          Fliplet.UI.Toast({
            message: 'Error loading more messages.',
            actions: actions
          });
        });
      }
      iScrollPos = iCurScrollPos;
    });
  }

  /** IMAGE UPLOAD **/
  function requestPicture(fileInput) {
    selectedFileInputName = fileInput.name;
    var boundingClientRectTarget = fileInput;
    var boundingRect = boundingClientRectTarget.getBoundingClientRect();
    while (boundingRect.width === 0 || boundingRect.height === 0) {
      if (!boundingClientRectTarget.parentNode) {
        break;
      }
      boundingClientRectTarget = boundingClientRectTarget.parentNode;
      boundingRect = boundingClientRectTarget.getBoundingClientRect();
    }

    return new Promise(function(resolve, reject) {
      var cameraOptions = {
        boundingRect: boundingRect
      };
      navigator.notification.confirm(
        'How do you want to choose your image?',
        function onSelectedImageMethod(button) {
          document.body.focus();
          switch (button) {
            case 1:
              cameraOptions.source = Camera.PictureSourceType.CAMERA;
              return resolve(cameraOptions);
            case 2:
              cameraOptions.source = Camera.PictureSourceType.PHOTOLIBRARY;
              return resolve(cameraOptions);
            case 3:
              return;
            default:
              return reject('Not implemented');
          }
        },
        'Choose Image', ['Take Photo', 'Choose Existing Photo', 'Cancel']
      );
    });
  }

  function getPicture(options) {
    options = options || {};
    var popoverOptions = {
      arrowDir: Camera.PopoverArrowDirection.ARROW_ANY
    };

    if (typeof options.boundingRect === 'object') {
      var boundingRect = options.boundingRect;
      popoverOptions.x = boundingRect.left;
      popoverOptions.y = boundingRect.top;
      popoverOptions.width = boundingRect.width;
      popoverOptions.height = boundingRect.height;
    }

    navigator.camera.getPicture(onSelectedPicture, function getPictureSuccess(message) {
      console.error('Error getting picture with navigator.camera.getPicture');
    }, {
      quality: jpegQuality,
      destinationType: Camera.DestinationType.DATA_URL,
      sourceType: (options.source) ? options.source : Camera.PictureSourceType.PHOTOLIBRARY,
      targetWidth: (options.width) ? options.width : customWidth,
      targetHeight: (options.height) ? options.height : customHeight,
      popoverOptions: popoverOptions,
      encodingType: Camera.EncodingType.JPEG,
      mediaType: Camera.MediaType.PICTURE,
      correctOrientation: true // Corrects Android orientation quirks
    });
  }

  function onSelectedPicture(imageURI, type) {
    type = type || 'image/jpeg';
    imageURI = (imageURI.indexOf('base64') > -1) ? imageURI : 'data:' + type + ';base64,' + imageURI;

    fileImages[selectedFileInputName] = {
      base64: imageURI
    };

    $('.chat-area').addClass('image-selected');
    onMessageAreaInput();

    $('canvas#image-canvas').each(function forEachCanvas() {
      var canvas = this;
      var imgSrc = imageURI;
      var canvasWidth = canvas.clientWidth;
      var canvasHeight = canvas.clientHeight;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      var canvasRatio = canvasWidth / canvasHeight;
      var context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);

      var img = new Image();
      img.onload = function imageLoadedFromURI() {
        drawImageOnCanvas(this, canvas);
      };
      img.src = imgSrc;
    });
  }

  function drawImageOnCanvas(img, canvas) {
    var imgWidth = img.width;
    var imgHeight = img.height;
    var imgRatio = imgWidth / imgHeight;
    var canvasWidth = canvas.width;
    var canvasHeight = canvas.height;
    var canvasRatio = canvasWidth / canvasHeight;
    var context = canvas.getContext('2d');

    // Re-interpolate image draw dimensions based to CONTAIN within canvas
    if (imgRatio < canvasRatio) {
      // IMAGE RATIO is slimmer than CANVAS RATIO, i.e. margin on the left & right
      if (imgHeight > canvasHeight) {
        // Image is taller. Resize image to fit height in canvas first.
        imgHeight = canvasHeight;
        imgWidth = imgHeight * imgRatio;
      }
    } else {
      // IMAGE RATIO is wider than CANVAS RATIO, i.e. margin on the top & bottom
      if (imgWidth > canvasWidth) {
        // Image is wider. Resize image to fit width in canvas first.
        imgWidth = canvasWidth;
        imgHeight = imgWidth / imgRatio;
      }
    }

    var drawX = (canvasWidth > imgWidth) ? (canvasWidth - imgWidth) / 2 : 0;
    var drawY = (canvasHeight > imgHeight) ? (canvasHeight - imgHeight) / 2 : 0;

    context.drawImage(img, drawX, drawY, imgWidth, imgHeight);
  };

  function resetImages() {
    fileImages = {};
    selectedFileInputName = null;
    $('#image-input').val('');

    $('.chat-area').removeClass('image-selected');

    $('canvas#image-canvas').each(function() {
      this.getContext('2d').clearRect(0, 0, this.width, this.height);
    });
  }

  function previewFile(file) {
    var reader = new FileReader();

    reader.addEventListener("load", function () {
      var base64gif = reader.result;
      onSelectedPicture(base64gif, file.type);
    }, false);

    if (file) {
      reader.readAsDataURL(file);
    }
  }

  function processWebSelectedImage(file, maxWidth, maxHeight) {
    var type = file.type;

    // Parse meta data for EXIF
    loadImage.parseMetaData(
      file,
      function(data) {
        loadImage(
          file,
          function(canvas) {
            onSelectedPicture(canvas.toDataURL(type, jpegQuality), type);
          }, {
            canvas: true,
            maxWidth: maxWidth,
            maxHeight: maxHeight,
            // Use EXIF data to adjust rotation
            orientation: (data.exif) ? data.exif.get('Orientation') : true,
          }
        );
      }
    );
  }

  function getFileData() {
    var fileObject = {};
    var imageLoading = [];
    var fileType;

    $('.chat-input-controls').find('[name]').each(function(idx, el) {
      var $el = $(this);
      var name = $el.attr('name');
      var files = $el[0].files;
      var type = $el.data('type');

      if (type === 'image' && fileImages.hasOwnProperty(name)) {
        fileType = type;
        imageLoading.push(new Promise(function(resolve, reject) {
          var img = new Image();

          img.onload = function() {
            resolve(img);
          }

          img.src = fileImages[name].base64;
        }));
      }
    });

    if (!imageLoading.length) {
      return Promise.resolve();
    }

    return Promise.all(imageLoading).then(function(results) {
      return fileObject = {
        file: [results[0].src],
        fileType: fileType,
        imageWidth: results[0].width,
        imageHeight: results[0].height
      };
    }, function(err) {
      console.error(err);
    });
  }

  /** INIT **/
  function initialiseCode() {
    if (!Fliplet.Navigator.isOnline()) {
      $wrapper.addClass('offline');
    }

    attacheEventListeners();
  }

  function searchData(value) {
    $('.section-label-wrapper').removeClass('no-results');

    // Removes cards
    $('.contacts-user-list').html('');

    // Searches
    var searchedData = _.filter(otherPeople, function(obj) {
      var userName = '';

      if (fullNameColumnName) {
        userName = obj.data[fullNameColumnName];
      }
      if (firstNameColumnName && userName === '') {
        userName = obj.data[firstNameColumnName]
      }
      if (lastNameColumnName && userName !== '') {
        userName = userName + ' ' + obj.data[lastNameColumnName]
      }

      if (userName === '') {
        return false;
      }

      if (titleColumnName) {
        return userName.toLowerCase().indexOf(value) > -1 || obj.data[titleColumnName].toLowerCase().indexOf(value) > -1;
      } else {
        return userName.toLowerCase().indexOf(value) > -1
      }
    });

    sortContacts(searchedData);

    if (contactsSelected.length) {
      contactsSelected.forEach(function(contact) {
        $('[data-contact-id="' + contact.id + '"]').addClass('contact-selected');
      });
    }

    if (!searchedData.length) {
      $('.section-label-wrapper').addClass('no-results');
      return;
    }
  }

  function clearSearch() {
    // Removes value from search box
    $('.search-holder').find('input').val('').blur();
    // Resets all classes related to search
    $('.section-label-wrapper').removeClass('is-searching no-results');

    // Resets list
    sortContacts(otherPeople);

    // Check if there are selected contacts
    if (!contactsSelected.length) { return; }

    var selectorsArray = [];
    contactsSelected.forEach(function(contact) {
      selectorsArray.push('[data-contact-id="' + contact.id + '"]');
    });

    $(selectorsArray.join(', ')).addClass('contact-selected');
  }

  /* CHAT FEATURE FUNCTIONS */
  function sortContacts(peopleList) {
    // Custom sort of names
    var customSorted = _.sortBy(peopleList, function (obj) {
      obj.data['customSortName'] = obj.data[fullNameColumnName] || obj.data[firstNameColumnName] || '';
      var value = obj.data['customSortName'].toString().toUpperCase();
      // Push all non-alphabetical values to after the 'z' character
      // based on Unicode values
      return value.match(/[A-Za-z]/)
        ? value
        : '{' + value;
    });

    var otherPeopleSorted = _.orderBy(customSorted, function(obj) {
      var value = obj.data['customSortName'].toString();
      var nameArray = value.split(' ');
      var foundCapital = 0;
      var firstCapital;

      if (nameArray.length > 1) {
        nameArray.forEach(function(element, index) {
          if ( element.charAt(0).match(/[a-z]/) ) {
            return;
          }

          if ( element.charAt(0).match(/[A-Z]/) && !foundCapital ) {
            value = element;
            foundCapital++;
            firstCapital = element;
          } else {
            value = firstCapital;
          }
        });
      }

      return value;
    }, ['asc']);

    // Adds first letter for each person to be grouped by
    otherPeopleSorted.forEach(function(person) {
      var value = person.data[fullNameColumnName || firstNameColumnName].toString();
      var nameArray = value.split(' ');
      var foundCapital = 0;
      var firstCapital;

      if (nameArray.length > 1) {
        nameArray.forEach(function(element, index) {
          if ( element.charAt(0).match(/[a-z]/) ) {
            return;
          }

          if ( element.charAt(0).match(/[A-Z]/) && !foundCapital ) {
            value = element;
            foundCapital++;
            firstCapital = element;
          } else {
            value = firstCapital;
          }
        });
      }

      if (!value.charAt(0).match(/[A-Za-z]/)) {
        person.letterGroup = '#'
      } else {
        person.letterGroup = value.charAt(0);
      }
    });

    // Groups people by initial
    var peopleGroupedByLetter = _.groupBy(otherPeopleSorted, function(obj) { return obj.letterGroup; });

    // Add contacts to list
    var contactsListHTML = contactsListTemplate(peopleGroupedByLetter);
    $('.contacts-user-list').html(contactsListHTML);
  }

  function addMetadataToMessage(message) {
    message.createdAtDate = moment(message.createdAt);
  }

  function addMetadataToQueueMessage(message) {
    message.sentTime = moment(message.sentTime);
  }

  function setConversationLastMessage(conversation, message) {
    var date;

    if (!message || !conversation) {
      return;
    }

    if (message.createdAtDate) {
      date = message.createdAtDate.calendar(null, {
        sameDay: '[Today]',
        nextDay: '[Tomorrow]',
        nextWeek: 'dddd',
        lastDay: '[Yesterday]',
        lastWeek: '[Last] dddd',
        sameElse: 'DD/MM/YYYY'
      });
    } else {
      date = moment(message.createdAt).calendar(null, {
        sameDay: '[Today]',
        nextDay: '[Tomorrow]',
        nextWeek: 'dddd',
        lastDay: '[Yesterday]',
        lastWeek: '[Last] dddd',
        sameElse: 'DD/MM/YYYY'
      });
    }

    conversation.lastMessage = {
      body: message.data.body,
      date: date
    };
  }

  function findContact(flUserId) {
    return _.find(contacts, function(contact) {
      return contact.data.flUserId === flUserId;
    });
  }

  /* Function to set user */
  function setCurrentUser(user) {
    currentUser = user.data;
    currentUserAllData = user;

    return Fliplet.App.Storage.set(USERID_STORAGE_KEY, currentUser.flUserId).then(function() {
      return Fliplet.App.Storage.set(USERTOKEN_STORAGE_KEY, currentUser.flUserToken);
    });
  }

  /* Get contacts function */
  var contactsReqPromise;

  function getContacts(fromOffline) {
    if (!contactsReqPromise) {
      contactsReqPromise = chat.contacts({ offline: fromOffline }).then(function(response) {
        contacts = response;

        // Sort by name and place list in HTML
        otherPeople = getContactsWithoutCurrentUser();
        sortContacts(otherPeople);

        contactsReqPromise = undefined;
        return Promise.resolve();
      });
    }

    return contactsReqPromise;
  }

  // All contacts apart from the logged user
  function getContactsWithoutCurrentUser() {
    var customUsers = contacts.some(function(contact) {
      return contact.data.hasOwnProperty('flDefaultChatUser')
    });

    if (customUsers) {
      return _.filter(contacts, function(c) {
        return c.data['flDefaultChatUser'] != null && c.data['flDefaultChatUser'] !== '' && typeof c.data['flDefaultChatUser'] !== 'undefined' && c.data.flUserId !== currentUser.flUserId;
      });
    } else {
      return _.reject(contacts, function(c) {
        return c.data.flUserId === currentUser.flUserId;
      });
    }
  }

  function getAllUSers() {
    var userIds = [];
    otherPeople.forEach(function(attendee) {
      userIds.push(attendee.id);
    });

    return userIds;
  }

  function getSpeakers() {
    var userIds = [];
    var speakersOnly = _.filter(otherPeople, function(attendee) {
      return attendee.data.Speakers && attendee.data.Speakers !== '' && attendee.data.Speakers !== null;
    });
    speakersOnly.forEach(function(speaker) {
      userIds.push(speaker.id);
    });

    return userIds;
  }

  function getAdmins() {
    var userIds = [];
    var adminsOnly = _.filter(otherPeople, function(attendee) {
      return attendee.data.isAdmin && attendee.data.isAdmin !== '' && attendee.data.isAdmin !== null;
    });
    adminsOnly.forEach(function(admin) {
      userIds.push(admin.id);
    });

    return userIds;
  }

  /* Function to create admin only groups */
  function createGroupConversation(group) {
    var options;
    var userIds;

    if (group === 'all') {
      userIds = getAllUSers();

      if (!userIds.length) {
        options = {
          title: 'No group created',
          message: 'We couldn\'t find any attendees.'
        };

        Fliplet.Navigate.popup(options);
        $('.contacts-done-holder').removeClass('creating');
        return;
      }

      createConversation(userIds, true, 'Attendees');
      return;
    }

    if (group === 'speakers') {
      userIds = getSpeakers();

      if (!userIds.length) {
        options = {
          title: 'No group created',
          message: 'We couldn\'t find any speakers.'
        };

        Fliplet.Navigate.popup(options);
        $('.contacts-done-holder').removeClass('creating');
        return;
      }

      createConversation(userIds, true, 'Speakers');
      return;
    }

    if (group === 'admins') {
      userIds = getAdmins();

      if (!userIds.length) {
        options = {
          title: 'No group created',
          message: 'We couldn\'t find any administrators.'
        };

        Fliplet.Navigate.popup(options);
        $('.contacts-done-holder').removeClass('creating');
        return;
      }

      createConversation(userIds, true, 'Admins');
      return;
    }
  }

  /* Create a conversation function */
  function createConversation(userIds, isBroadcast, groupName) {
    isBroadcast = isBroadcast || false;

    userIds.forEach(function(userId, idx) {
      userIds[idx] = parseInt(userId, 10);
    });

    return getConversations(false).then(function() {
      return chat.create({
        name: isBroadcast ? 'Broadcast to ' + groupName.toLowerCase() : (groupName || DEFAULT_CHAT_NAME),
        group: {
          type: groupName,
          readOnly: isBroadcast
        },
        participants: userIds
      });
    }).then(function(conversation) {
      var fetchRequiredData = getContacts(false).then(function() { return getConversations(false); });

      return fetchRequiredData.then(function() {
        $('.contacts-done-holder').removeClass('creating');
        closeGroupCreationSettings();
        closeContacts();
        var newConversation = _.find(conversations, { id: conversation.id });
        scrollToMessageTs = 100;
        $messagesHolder.html('');
        viewConversation(newConversation);
      });
    }).catch(function(error) {
      var actions = [];
      $('.contacts-done-holder').removeClass('creating');

      if (error) {
        actions.push({
          label: 'Details',
          action: function () {
            Fliplet.UI.Toast({
              message: Fliplet.parseError(error)
            });
          }
        });
      }
      Fliplet.UI.Toast({
        message: 'Error creating conversation.',
        actions: actions
      });
    });
  }

  function addUsersToAdminGroups(conversation) {
    // Adds new users to admin groups
    if (conversation.definition.participants.type && conversation.definition.participants.type === 'Attendees') {
      var userIds = getAllUSers();
      conversation.participants.add(userIds);
    }
    if (conversation.definition.participants.type && conversation.definition.participants.type === 'Speakers') {
      var userIds = getSpeakers();
      conversation.participants.add(userIds);
    }
    if (conversation.definition.participants.type && conversation.definition.participants.type === 'Admins') {
      var userIds = getAdmins();
      conversation.participants.add(userIds);
    }
  }

  /* Get conversations function */
  var getConversationsReqPromise;

  function getConversations(fromOffline) {
    if (getConversationsReqPromise) {
      return getConversationsReqPromise;
    }

    getConversationsReqPromise = chat.conversations({ offline: fromOffline }).then(function(response) {
      // Set last message
      conversations = response.map(function(c) {
        var existingConversation = _.find(conversations, { id: c.id });
        if (existingConversation) {
          c.unreadMessages = 0;
          c.lastMessage = existingConversation.lastMessage;
        }

        return c;
      });

      // Get unread messages
      var unreadMessages = _.reject(messages, function (m) {
        return m.isReadByCurrentUser;
      }).map(function (message) {
        return message;
      });

      // If unread messages in conversation flag them
      if (unreadMessages.length) {
        unreadMessages.forEach(function(unreadMessage) {
          conversations = conversations.map(function(c) {
            if (c.id === unreadMessage.dataSourceId) {
              c.unreadMessages++;
            }

            return c
          });
        });
      }

      if (!conversations.length) {
        $wrapper.removeClass('loading');
      }
      $wrapper.toggleClass('empty', !conversations.length);

      // Add admin buttons
      // if (currentUser && currentUser.isAdmin && currentUser.isAdmin !== null) {
      //   $('.predefined-groups-holder').html(adminButtonsTemplate());
      // } else {
      //   // Remove just to be sure no one else accesses them
      //   $('.predefined-groups-holder').html('');
      // }

      // Add a readable name to the conversation, based on the other people in the group
      conversations.forEach(function(conversation) {
        var participants = conversation.definition.participants;
        var allParticipants = _.compact(conversation.definition.participants.concat(conversation.definition.removedParticipants));

        // Client specific
        addUsersToAdminGroups(conversation);

        var conversationName = _.compact(_.filter(otherPeople, function(c) {
          return allParticipants.indexOf(c.data.flUserId) !== -1;
        }).map(function(c) {
          return multipleNameColumns
            ? c.data[firstNameColumnName] + ' ' + c.data[lastNameColumnName]
            : c.data[fullNameColumnName];
        })).join(', ').trim();

        var friend = _.find(otherPeople, function(p) {
          return participants.indexOf(p.data.flUserId) !== -1;
        });

        conversation.name = participants.length > 2 ? conversation.name || 'Group' : conversationName;
        conversation.avatar = participants.length > 2 ? '' : friend ? friend.data[avatarColumnName] : '';
        conversation.isGroup = participants.length > 2;
        conversation.usersInConversation = conversationName;
        conversation.absoluteTime = moment(conversation.updatedAt).calendar(null, {
          sameDay: '[Today]',
          lastDay: '[Yesterday]',
          lastWeek: '[Older]',
          sameElse: '[Older]'
        });

        var conversationMessages = _.filter(messages, { dataSourceId: conversation.id });
        setConversationLastMessage(conversation, conversationMessages[conversationMessages.length - 1]);
      });

      $conversationsList.html('');

      var conversationGroups = _.groupBy(conversations, function(obj) { return obj.absoluteTime; });

      renderConversations(conversationGroups);

      getConversationsReqPromise = undefined;
      return Promise.resolve(conversations);
    });

    return getConversationsReqPromise;
  }

  function renderConversations(data, replace) {
    var conversationGroupsHTML = conversationGroupsTemplate(data);
    var conversationHTML = conversationTemplate(data);
    var conversationIsOpen = false;

    if (replace === true) {
      if ($('.chat-card-holder[data-conversation-id="' + data.id + '"]').hasClass('open')) {
        conversationIsOpen = true;
      }
      if (conversationIsOpen) {
        $('.chat-card[data-conversation-id="' + data.id + '"]').replaceWith(conversationHTML);
        $('.chat-card-holder[data-conversation-id="' + data.id + '"]').addClass('open');
        return;
      }

      $('.chat-card[data-conversation-id="' + data.id + '"]').replaceWith(conversationHTML);
      return 
    }

    $conversationsList.append(conversationGroupsHTML);
  }

  function moveConversationToTop(conversation) {
    var $el = $('.chat-card[data-conversation-id="' + conversation.id + '"]');

    $('.chat-group-holder').first().prepend($el);
  }

  function loadMoreMessagesForCurrentConversation(conversation, isLoadingAll) {
    var conversationMessages = _.filter(messages, { dataSourceId: conversation.id });
    var firstMessage = _.minBy(conversationMessages, 'createdAt');

    var where = {};

    if (firstMessage) {
      where.createdAt = { $lt: firstMessage.createdAt };
    }

    return chat.messages({
      conversations: [conversation.id],
      limit: LOAD_MORE_MESSAGES_PAGE_SIZE,
      where: where
    }).then(function(previousMessages) {
      previousMessages.forEach(function(message) {
        if (messagesIds.indexOf(message.id) !== -1) {
          return;
        }

        if (conversation && conversation.id === message.dataSourceId && !isLoadingAll) {
          addMetadataToMessage(message);
          renderMessage(message, true);
        } else if (isLoadingAll) {
          addMetadataToMessage(message);
        }

        messagesIds.push(message.id);
        messages.unshift(message);
      });

      if (conversation && !firstMessage && previousMessages) {
        setConversationLastMessage(conversation, previousMessages[0]);

        // Let's update the UI to reflect the last message
        renderConversations(conversation, true);
      }

      return Promise.resolve(previousMessages);
    }).catch(function(error) {
      console.warn(error);
    });
  }

  function checkConversationStatus(conversation) {
    if (conversation.definition.participants.length < 2) {
      getConversations(false);
    }
  }

  function viewConversation(conversation) {
    $wrapper.addClass('chat-open');
    openConversation(conversation.id);

    if (conversation
      && conversation.definition
      && conversation.definition.group
      && conversation.definition.group.readOnly) {
      if (currentUser && currentUser.isAdmin && currentUser.isAdmin !== null) {
        $('.chat-area').removeClass('broadcasting');
      } else {
        $('.chat-area').addClass('broadcasting');
      }
    } else {
      $('.chat-area').removeClass('broadcasting');
    }
    currentConversation = conversation;

    var chatHeaderHTML = chatHeaderTemplate(conversation);
    $wrapper.find('.chat-user-info').html(chatHeaderHTML);
    if (conversation.isGroup) {
      $wrapper.find('.chat-user-info').addClass('group');
    } else {
      $wrapper.find('.chat-user-info').removeClass('group');
    }

    $messages = $wrapper.find('[data-conversation-messages]');

    var conversationMessages = _.filter(messages, { dataSourceId: conversation.id });

    conversationMessages.forEach(function(message) {
      if (conversation.isGroup) {
        message.fromGroup = true;
      }

      if (!message.isDeleted || message.deletedAt === null) {
        renderMessage(message);
      }
    });

    if (messagesQueue.length) {
      setTimeout(function() {
        messagesQueue.forEach(function(message) {
          if (message.conversationId === conversation.id) {
            renderQueueMessage(message);
          }
        });
      }, 1);
    }

    if (!autosizeInit) {
      autosize($('.chat-input-controls textarea'));
      autosizeInit = true;
    }

    chat.markMessagesAsRead(conversationMessages);

    currentConversation.unreadMessages = 0;

    conversations.forEach(function(c) {
      c.isCurrent = c.id === currentConversation.id;
      renderConversations(c, true);
    });
  }

  function expandImage(imgElement) {
    var clickedImgURL = imgElement.attr('src');
    var items = [];
    var clickedIndex;

    $('.chat-image img').each(function(idx, img) {
      var imageURL = $(img).attr('src');
      var imageWidth = img.naturalWidth;
      var imageHeight = img.naturalHeight;

      var item = {
        src: imageURL,
        w: imageWidth,
        h: imageHeight
      };

      items.push(item);

      if(clickedImgURL.trim() === imageURL.trim()) {
        clickedIndex = idx;
      }
    });
    
    var options = {
      index: clickedIndex
    };
    var gallery = new PhotoSwipe( pswpElement, PhotoSwipeUI_Default, items, options);
    gallery.init();
  }

  function renderMessage(message, prepend) {
    if (scrollToMessageTimeout) {
      clearTimeout(scrollToMessageTimeout);
      scrollToMessageTimeout = undefined;
    }

    var sender = findContact(message.data.fromUserId);
    var fetchContactsIfRequired = sender ? Promise.resolve() : getContacts(false);
    var imgContainerWidth = 'auto';
    var imgContainerHeight = 'auto';

    fetchContactsIfRequired.then(function() {
      sender = findContact(message.data.fromUserId);

      if (!sender) {
        return;
      }

      // Make the image container the same size of the thumb image
      // Prevents the chat bubbles from expanding while loading the image
      if (message.data.file && message.data.file.length) {
        var maxWidth = 200;
        var reducedHeight = Math.ceil((message.data.imageHeight / message.data.imageWidth) * maxWidth);
        imgContainerWidth = maxWidth + 'px';
        imgContainerHeight = reducedHeight + 'px';
      }

      var $message = $(chatMessageTemplate({
        id: message.id,
        isFromGroup: message.fromGroup,
        isFromCurrentUser: currentUser.flUserId === message.data.fromUserId,
        name: multipleNameColumns
          ? sender.data[firstNameColumnName] + ' ' + sender.data[lastNameColumnName]
          : sender.data[fullNameColumnName],
        avatar: sender.data[avatarColumnName],
        message: message.data,
        timeAgo: message.createdAtDate.calendar(null, {
          sameDay: 'HH:mm',
          nextDay: 'MMM DD YYYY, HH:mm',
          nextWeek: 'MMM DD YYYY, HH:mm',
          lastDay: 'MMM DD, HH:mm',
          lastWeek: 'MMM DD, HH:mm',
          sameElse: 'MMM DD YYYY, HH:mm'
        }),
        containerWidth: imgContainerWidth,
        containerHeight: imgContainerHeight
      }));

      var scrollTop = $messages.scrollTop();
      var shouldScrollToBottom = scrollTop === 0 || $messages[0].scrollHeight - scrollTop === $messages.outerHeight(true);

      $message.css('opacity', 0);
      $messages[prepend ? 'prepend' : 'append']($message);
      $message.animate({ opacity: 1 }, 500);

      $message.find('img').on('error', function() {
        $(this).parents('.chat-image').find('.offline-image-holder').removeClass('hidden');
      }).parents('.chat-image').find('.offline-image-holder').addClass('hidden');

      // scroll to bottom
      if (shouldScrollToBottom && !prepend) {
        scrollToMessageTimeout = setTimeout(function() {
          $messages.stop(true, true).animate({
            scrollTop: $messages.prop('scrollHeight')
          }, scrollToMessageTs ? SCROLL_TO_MESSAGE_SPEED : 0);
          scrollToMessageTs = 10;
        }, scrollToMessageTs);
      }
    });
  }

  function renderMessageInPlace(message, isRendered) {
    var sender = findContact(message.data.fromUserId);
    var fetchContactsIfRequired = sender ? Promise.resolve() : getContacts(false);
    var imgContainerWidth = 'auto';
    var imgContainerHeight = 'auto';

    fetchContactsIfRequired.then(function() {
      sender = findContact(message.data.fromUserId);

      if (!sender) {
        return;
      }

      // Make the image container the same size of the thumb image
      // Prevents the chat bubbles from expanding while loading the image
      if (message.data.file && message.data.file.length) {
        var maxWidth = 200;
        var reducedHeight = Math.ceil((message.data.imageHeight / message.data.imageWidth) * maxWidth);
        imgContainerWidth = maxWidth + 'px';
        imgContainerHeight = reducedHeight + 'px';
      }

      var messageHTML = chatMessageTemplate({
        id: message.id,
        isFromCurrentUser: currentUser.flUserId === message.data.fromUserId,
        name: multipleNameColumns ? sender.data[firstNameColumnName] + ' ' + sender.data[lastNameColumnName] : sender.data[fullNameColumnName],
        avatar: sender.data[avatarColumnName],
        message: message.data,
        timeAgo: message.createdAtDate.calendar(null, {
          sameDay: 'HH:mm',
          nextDay: 'MMM DD YYYY, HH:mm',
          nextWeek: 'MMM DD YYYY, HH:mm',
          lastDay: 'MMM DD, HH:mm',
          lastWeek: 'MMM DD, HH:mm',
          sameElse: 'MMM DD YYYY, HH:mm'
        }),
        containerWidth: imgContainerWidth,
        containerHeight: imgContainerHeight
      });

      if (message.data.file && message.data.file.length) {
        var img = new Image();
        img.onload = function() {
          var messageID = isRendered ? message.id : message.data.guid
          $('[data-message-id="' + messageID + '"]').replaceWith(messageHTML);
        };
        img.src = message.data.file[0];

        return;
      }

      var messageID = isRendered ? message.id : message.data.guid
      $('[data-message-id="' + messageID + '"]').replaceWith(messageHTML);
    });
  }

  function renderQueueMessage(message) {
    if (scrollToMessageTimeout) {
      clearTimeout(scrollToMessageTimeout);
      scrollToMessageTimeout = undefined;
    }

    addMetadataToQueueMessage(message);

    // Make the image container the same size of the thumb image
    // Prevents the chat bubbles from expanding while loading the image
    var imgContainerWidth = 'auto';
    var imgContainerHeight = 'auto';
    if (message.file && message.file.length) {
      var maxWidth = 200;
      var reducedHeight = Math.ceil((message.imageHeight / message.imageWidth) * maxWidth);
      imgContainerWidth = maxWidth + 'px';
      imgContainerHeight = reducedHeight + 'px';
    }

    var $message = $(chatQueueMessageTemplate({
      id: message.guid,
      message: message,
      timeAgo: message.sentTime.calendar(null, {
        sameDay: 'HH:mm',
        nextDay: 'MMM DD YYYY, HH:mm',
        nextWeek: 'MMM DD YYYY, HH:mm',
        lastDay: 'MMM DD, HH:mm',
        lastWeek: 'MMM DD, HH:mm',
        sameElse: 'MMM DD YYYY, HH:mm'
      }),
      status: 'sending',
      containerWidth: imgContainerWidth,
      containerHeight: imgContainerHeight
    }));

    var scrollTop = $messages.scrollTop();
    var shouldScrollToBottom = scrollTop === 0 || $messages[0].scrollHeight - scrollTop === $messages.outerHeight(true);

    $message.css('opacity', 0);
    $messages.append($message);
    $message.animate({ opacity: 1 }, 500);

    // scroll to bottom
    if (shouldScrollToBottom) {
      scrollToMessageTimeout = setTimeout(function() {
        $messages.stop(true, true).animate({
          scrollTop: $messages.prop('scrollHeight')
        }, scrollToMessageTs ? SCROLL_TO_MESSAGE_SPEED : 0);
        scrollToMessageTs = 100;
      }, scrollToMessageTs);
    }
  }

  function onNewMessage(message) {
    if (messagesIds.indexOf(message.id) === -1) {
      messages.push(message);
      messagesIds.push(message.id);
    }

    addMetadataToMessage(message);

    var isCurrentConversation = currentConversation && message.dataSourceId === currentConversation.id;
    
    _.remove(messagesQueue, function(messageQueued) {
      return messageQueued.guid === message.data.guid;
    });

    Fliplet.Storage.set(QUEUE_MESSAGE_KEY, messagesQueue)
      .then(function() {
        if (message.isDeleted || message.deletedAt !== null) {
          if ($('[data-message-id="' + message.id + '"]').length) {
            $('[data-message-id="' + message.id + '"]').remove();
          }
        } else if (isCurrentConversation && $('[data-message-id="' + message.data.guid + '"]').length) {
          renderMessageInPlace(message);
        } else if (isCurrentConversation && (message.isUpdate || message.data.isEdited)) {
          renderMessageInPlace(message, true)
        } else if (isCurrentConversation) {
          renderMessage(message);
        }

        var conversation = _.find(conversations, { id: message.dataSourceId });

        if (!conversation) {
          // If we don't find the conversation of this message, most likely means a user just
          // started messaging us on a new conversation so let's just refetch the list
          getConversations(false);
        } else {
          checkConversationStatus(conversation);
          setConversationLastMessage(conversation, message);

          if (!message.isReadByCurrentUser) {
            if (!currentConversation || currentConversation.id !== message.dataSourceId) {
              // Message is unread and is not in the current conversation
              conversation.unreadMessages++;
            } else {
              // Mark the message as read by the current user, since he's looking at this conversation
              chat.markMessagesAsRead([message]);
            }

            if ((!currentConversation || !isActiveWindow) && messagesIds.indexOf(message.id) === -1) {
              var sender = findContact(message.data.fromUserId);
              if (sender) {
                var notification = Notification(multipleNameColumns ? sender.data[firstNameColumnName] + ' ' + sender.data[lastNameColumnName] : sender.data[fullNameColumnName], {
                  body: message.data.body,
                  icon: $('link[rel="icon"]').attr('href'),
                  timestamp: message.createdAtDate.unix(),
                  tag: 'message' + message.id
                });

                notification.onclick = function() {
                  window.focus();
                  setTimeout(function() {
                    viewConversation(conversation);
                  }, 0);
                };
              }
            }
          }

          // Let's update the UI to reflect the last message
          renderConversations(conversation, true);
        }
      });
  }

  /* Login function */
  function onLogin() {
    Notification.requestPermission();

    getContacts(true).then(function() {
      return getConversations(true);
    }).then(function() {
      return chat.stream(onNewMessage, { offline: false });
    }).then(function() {

      var userId = Fliplet.Navigate.query.contactConversation;

      if (userId) {
        createConversation([userId]);
      }

      $wrapper.removeClass('loading');
      $wrapper.removeClass('error');

      getContacts(false).then(function() {
        return getConversations(false);
      });
    }).catch(function(error) {
      console.warn(error);
      $wrapper.removeClass('loading');
      $wrapper.removeClass('empty');
      $wrapper.addClass('error');
    });
  }

  /* Chat connection */
  chatConnection.then(function onChatConnectionAvailable(chatInstance) {
    chat = chatInstance;
    initialiseCode();

    // Log in with the stored details
    return Fliplet.App.Storage.get(USERTOKEN_STORAGE_KEY).then(function(userToken) {
      if (userToken) {
        return Promise.resolve({
          flUserToken: userToken
        });
      }

      // Log in using authentication from a different component
      return Fliplet.App.Storage.get(CROSSLOGIN_EMAIL_KEY);
    })
    .then(function(authId) {
      var where = {};

      if (!authId) {
        Fliplet.Navigate.to(securityScreenAction);
        return Promise.reject('User is not logged in');
      }

      if (authId.hasOwnProperty('flUserToken')) {
        where = authId; // Use 'User Token'
      } else {
        where[crossLoginColumnName] = { $iLike: authId }; // Use 'Email'
      }
      
      return Promise.resolve(where);
    });
  }).then(function onLocalLoginAvailable(loginQuery) {
    return Fliplet.Storage.get(QUEUE_MESSAGE_KEY).then(function(queue) {
      messagesQueue = queue || [];
      return chat.login(loginQuery, { offline: false });
    });
  }).then(function onLoginSuccess(user) {
    return setCurrentUser(user).then(onLogin);
  }).catch(function(error) {
    console.error(error);
    $wrapper.removeClass('loading');
    $wrapper.addClass('error');
  });
});