var widgetId = Fliplet.Widget.getDefaultId();
var data = Fliplet.Widget.getData() || {};
var organizationId = Fliplet.Env.get('organizationId');
var widgetId = Fliplet.Widget.getDefaultId();
var dataSourceId;

$(document).on('change', '.hidden-select', function(){
  var selectedValue = $(this).val();
  var selectedText = $(this).find("option:selected").text();
  $(this).parents('.select-proxy-display').find('.select-value-proxy').text(selectedText);
});

var $dataSources = $('[name="dataSource"]');
var $emailAddress = $('[name="emailAddress"]');
var $fullName = $('[name="fullName"]');
var $avatar = $('[name="avatar"]');

// Set link action to screen by default
if (!data.contactLinkAction) {
  data.contactLinkAction = {
    action: 'screen',
    options: {
      hideAction: true
    }
  };
}
if (!data.securityLinkAction) {
  data.securityLinkAction = {
    action: 'screen',
    options: {
      hideAction: true
    }
  };
}

var linkDirectoryProvider = Fliplet.Widget.open('com.fliplet.link', {
  // If provided, the iframe will be appended here,
  // otherwise will be displayed as a full-size iframe overlay
  selector: '#contact-directory',
  // Also send the data I have locally, so that
  // the interface gets repopulated with the same stuff
  data: data.contactLinkAction,
  // Events fired from the provider
  onEvent: function (event, data) {
    if (event === 'interface-validate') {
      Fliplet.Widget.toggleSaveButton(data.isValid === true);
    }
  }
});

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
      Fliplet.Widget.toggleSaveButton(data.isValid === true);
    }
  }
});

linkDirectoryProvider.then(function (result) {
  data.contactLinkAction = result.data;
});
linkSecurityProvider.then(function (result) {
  data.securityLinkAction = result.data;
  save(true);
});

$('form').submit(function (event) {
  event.preventDefault();
  linkDirectoryProvider.forwardSaveRequest();
  linkSecurityProvider.forwardSaveRequest();
});

// Fired from Fliplet Studio when the external save button is clicked
Fliplet.Widget.onSaveRequest(function () {
  $('form').submit();
});

$dataSources.on( 'change', function() {
  dataSourceId = $(this).val();
  $('.column-selection').addClass('show');
  getColumns(dataSourceId);
});

function save(notifyComplete) {
  // Push notifications are always enabled for the chat
  data.pushNotifications = true;

  data.dataSourceId = $dataSources.val();
  data.crossLoginColumnName = $emailAddress.val();
  data.fullNameColumnName = $fullName.val();
  data.avatarColumnName = $avatar.val();

  Fliplet.Widget.save(data).then(function () {
    if (notifyComplete) {
      Fliplet.Widget.complete();
      window.location.reload();
    } else {
      Fliplet.Studio.emit('reload-widget-instance', widgetId);
    }
  });
}

function getColumns(dataSourceId) {
  Fliplet.DataSources.getById(dataSourceId).then(function (dataSource) {
    $emailAddress.html('<option value="">-- Select a field</option>');
    $fullName.html('<option value="">-- Select a field</option>');
    $avatar.html('<option value="">-- Select a field</option>');

    dataSource.columns.forEach(function (c) {
      $emailAddress.append('<option value="' + c + '">' + c + '</option>');
      $fullName.append('<option value="' + c + '">' + c + '</option>');
      $avatar.append('<option value="' + c + '">' + c + '</option>');
    });

    if (data.crossLoginColumnName) {
      $emailAddress.val(data.crossLoginColumnName);
    }
    if (data.fullNameColumnName) {
      $fullName.val(data.fullNameColumnName);
    }
    if (data.avatarColumnName) {
      $avatar.val(data.avatarColumnName);
    }

    $emailAddress.trigger('change');
    $fullName.trigger('change');
    $avatar.trigger('change');

    $emailAddress.prop('disabled', '');
    $fullName.prop('disabled', '');
    $avatar.prop('disabled', '');
  });
}

// Load the data source for the contacts
Fliplet.DataSources.get({
  organizationId: organizationId
}).then(function (dataSources) {
  $dataSources.find('option').text('-- Select a data source');
  dataSources.forEach(function (d) {
    $dataSources.append('<option value="' + d.id + '">' + d.name + '</option>');
  });

  if (data.dataSourceId) {
    $dataSources.val(data.dataSourceId);
  }
  $dataSources.trigger('change');

  $dataSources.prop('disabled', '');
});
