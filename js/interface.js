var widgetId = Fliplet.Widget.getDefaultId();
var data = Fliplet.Widget.getData() || {};
var organizationId = Fliplet.Env.get('organizationId');
var page = Fliplet.Widget.getPage();
var omitPages = page ? [page.id] : [];
var allDataSources = [];
var dataSourceProvider = null;

// New chat instances have the "Primary key" feature enabled
var supportsPrimaryKey = !data.dataSourceId || data.primaryKey;

var $emailAddress = $('[name="emailAddress"]');
var $firstName = $('[name="firstName"]');
var $lastName = $('[name="lastName"]');
var $fullName = $('[name="fullName"]');
var $avatar = $('[name="avatar"]');
var $titleName = $('[name="titleName"]');
var $contactsNumber = $('#contacts-number');
var $userInformationFields = $('[name="emailAddress"], [name="firstName"], [name="lastName"], [name="fullName"], [name="avatar"], [name="titleName"]');

// Set link action to screen by default
if (!data.securityLinkAction) {
  data.securityLinkAction = {
    action: 'screen',
    page: '',
    omitPages: omitPages,
    transition: 'fade',
    options: {
      hideAction: true
    }
  };
}

data.securityLinkAction.omitPages = omitPages;

if (data.howManyEntriesToShow) {
  $contactsNumber.val(data.howManyEntriesToShow.toString());
}

var linkSecurityProvider = Fliplet.Widget.open('com.fliplet.link', {
  // If provided, the iframe will be appended here,
  // otherwise will be displayed as a full-size iframe overlay
  selector: '#security-screen',
  // Also send the data I have locally, so that
  // the interface gets repopulated with the same stuff
  data: data.securityLinkAction,
  // Events fired from the provider
  onEvent: function (event, data) {
    if (event === 'interface-validate') {
      Fliplet.Widget.toggleSaveButton(data.isValid);
    }
  }
});

linkSecurityProvider.then(function (result) {
  data.securityLinkAction = result.data;
  data.securityLinkAction.omitPages = omitPages;
  save(true);
});

$('form').submit(function (event) {
  event.preventDefault();
  linkSecurityProvider.forwardSaveRequest();
});

$('#show-seperate-name-fields').on('click', function() {
  data.multipleNames = true;
  $('.full-name-field').addClass('hidden');
  $('.first-last-names-holder').removeClass('hidden');
});

$('#show-full-name-field').on('click', function() {
  data.multipleNames = false;
  $('.full-name-field').removeClass('hidden');
  $('.first-last-names-holder').addClass('hidden');
});

// Fired from Fliplet Studio when the external save button is clicked
Fliplet.Widget.onSaveRequest(function () {
  dataSourceProvider.forwardSaveRequest();
});

function initDataSourceProvider(currentDataSourceId) {
  var dataSourceData = {
    dataSourceTitle: 'Chat data source',
    dataSourceId: currentDataSourceId,
    appId: Fliplet.Env.get('appId'),
    default: {
      name: 'Chat data for' + Fliplet.Env.get('appName'),
      entries: [],
      columns: []
    },
    accessRules: [
      {
        allow: 'all',
        enabled: true,
        type: [
          'select',
          'update'
        ]
      }
    ]
  };

  dataSourceProvider = Fliplet.Widget.open('com.fliplet.data-source-provider', {
    selector: '#dataSourceProvider',
    data: dataSourceData,
    onEvent: function(event, dataSource) {
      if (event === 'dataSourceSelect') {
        generateColumns(dataSource.columns);
      }
    }
  });

  dataSourceProvider.then(dataSource => {
    data.dataSourceId = dataSource.data.id;
    $('form').submit();
  });
}

function save(notifyComplete) {
  // Push notifications are always enabled for the chat
  data.pushNotifications = true;

  data.crossLoginColumnName = $emailAddress.val() !== 'none' ? $emailAddress.val() : undefined;
  data.fullNameColumnName = $fullName.val() !== 'none' ? $fullName.val() : undefined;
  data.firstNameColumnName = $firstName.val() !== 'none' ? $firstName.val() : undefined;
  data.lastNameColumnName = $lastName.val() !== 'none' ? $lastName.val() : undefined;
  data.titleNameColumnName = $titleName.val() !== 'none' ? $titleName.val() : undefined;
  data.avatarColumnName = $avatar.val() !== 'none' ? $avatar.val() : undefined;
  data.howManyEntriesToShow = $contactsNumber.val() !== ''
    ? parseInt($contactsNumber.val(), 10)
    : '';
  data.limitContacts = !!data.howManyEntriesToShow;

  // If supported, enable primary key by saving it into settings
  if (supportsPrimaryKey && data.crossLoginColumnName) {
    data.primaryKey = data.crossLoginColumnName;
  }

  Fliplet.Widget.save(data).then(function () {
    if (notifyComplete) {
      Fliplet.Widget.complete();
      window.location.reload();
    } else {
      Fliplet.Studio.emit('reload-widget-instance', widgetId);
    }
  });
}

function generateColumns(dataSourceCoulumns) {
  $('.column-selection').addClass('show');

  var options = [
    '<option value="none">-- Select a field</option>'
  ];

  dataSourceCoulumns.forEach(function (c) {
    options.push('<option value="' + c + '">' + c + '</option>');
  });

  $userInformationFields.html(options.join(''));

  if (data.crossLoginColumnName) {
    $emailAddress.val(data.crossLoginColumnName);
  }

  if (data.fullNameColumnName) {
    $fullName.val(data.fullNameColumnName);
  }

  if (data.firstNameColumnName) {
    $firstName.val(data.firstNameColumnName);
  }

  if (data.lastNameColumnName) {
    $lastName.val(data.lastNameColumnName);
  }
  if (data.avatarColumnName) {
    $avatar.val(data.avatarColumnName);
  }

  if (data.titleNameColumnName) {
    $titleName.val(data.titleNameColumnName);
  }

  $userInformationFields.prop('disabled', false);

  if (data.multipleNames) {
    $('.full-name-field').addClass('hidden');
    $('.first-last-names-holder').removeClass('hidden');
  }
}

initDataSourceProvider(data.dataSourceId);
