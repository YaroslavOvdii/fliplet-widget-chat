var widgetId = Fliplet.Widget.getDefaultId();
var data = Fliplet.Widget.getData() || {};
var organizationId = Fliplet.Env.get('organizationId');
var widgetId = Fliplet.Widget.getDefaultId();
var allDataSources = [];

var $dataSources = $('[name="dataSource"]');
var $emailAddress = $('[name="emailAddress"]');
var $firstName = $('[name="firstName"]');
var $lastName = $('[name="lastName"]');
var $fullName = $('[name="fullName"]');
var $avatar = $('[name="avatar"]');
var $titleName = $('[name="titleName"]');
var $userInformationFields = $('[name="emailAddress"], [name="firstName"], [name="lastName"], [name="fullName"], [name="avatar"], [name="titleName"]');

// Set link action to screen by default
if (!data.securityLinkAction) {
  data.securityLinkAction = {
    action: 'screen',
    page: '',
    transition: 'fade',
    options: {
      hideAction: true
    }
  };
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
  save(true);
});

$('form').submit(function (event) {
  event.preventDefault();
  linkSecurityProvider.forwardSaveRequest();
});

$('#manage-data').on('click', manageAppData);

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
  $('form').submit();
});

$dataSources.on('change', function() {
  var selectedDataSourceId = $(this).val();
  if (selectedDataSourceId === 'none') {
    $('#manage-data').addClass('hidden');
    $('.column-selection').removeClass('show');
    return;
  }

  if (selectedDataSourceId === 'new') {
    $('#manage-data').addClass('hidden');
    createDataSource();
    return;
  }

  $('.column-selection').addClass('show');
  getColumns(selectedDataSourceId);
});

Fliplet.Studio.onMessage(function(event) {
  if (event.data && event.data.event === 'overlay-close') {
    reloadDataSources(event.data.data.dataSourceId);
  }
});

function save(notifyComplete) {
  // Push notifications are always enabled for the chat
  data.pushNotifications = true;

  data.dataSourceId = $dataSources.val();
  data.crossLoginColumnName = $emailAddress.val();
  data.fullNameColumnName = $fullName.val();
  data.firstNameColumnName = $firstName.val();
  data.lastNameColumnName = $lastName.val();
  data.titleNameColumnName = $titleName.val();
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
  if (!dataSourceId || dataSourceId === '') {
    $('#manage-data').addClass('hidden');
    return;
  }

  $('#manage-data').removeClass('hidden');

  Fliplet.DataSources.getById(dataSourceId, {
    cache: false
  }).then(function (dataSource) {
     var options = [
      '<option value="">-- Select a field</option>'
    ];

    dataSource.columns.forEach(function (c) {
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
  });
}

function createDataSource() {
  event.preventDefault();
  var name = prompt('Please type a name for your data source:');

  if (name === null) {
    $('#manage-data').addClass('hidden');
    $dataSources.val('none').trigger('change');
    return;
  }

  if (name === '') {
    $('#manage-data').addClass('hidden');
    $dataSources.val('none').trigger('change');
    alert('You must enter a data source name');
    return;
  }

  Fliplet.DataSources.create({
    name: name,
    organizationId: Fliplet.Env.get('organizationId')
  }).then(function(ds) {
    allDataSources.push(ds);
    $dataSources.append('<option value="' + ds.id + '">' + ds.name + '</option>');
    $dataSources.val(ds.id).trigger('change');
  });
}

function manageAppData() {
  var dataSourceId = $dataSources.val();
  Fliplet.Studio.emit('overlay', {
    name: 'widget',
    options: {
      size: 'large',
      package: 'com.fliplet.data-sources',
      title: 'Edit Data Sources',
      classes: 'data-source-overlay',
      data: {
        context: 'overlay',
        dataSourceId: dataSourceId
      }
    }
  });
}

function reloadDataSources(dataSourceId) {
  return Fliplet.DataSources.get({
    roles: 'publisher,editor',
    type: null
  }, {
    cache: false
  }).then(function(results) {
    allDataSources = results;
    $dataSources.html('<option value="none">-- Select a data source</option><option disabled>------</option><option value="new">Create a new data source</option><option disabled>------</option>');
    var options = [];

    allDataSources.forEach(function (d) {
      options.push('<option value="' + d.id + '">' + d.name + '</option>');
    });

    $dataSources.append(options.join(''));

    if (dataSourceId) {
      $dataSources.val(dataSourceId);
    }
    $dataSources.trigger('change');
  });
}

// Load the data source for the contacts
Fliplet.DataSources.get({
  roles: 'publisher,editor',
  type: null
}).then(function (dataSources) {
  allDataSources = dataSources;
  var options = [];

  allDataSources.forEach(function (d) {
    options.push('<option value="' + d.id + '">' + d.name + '</option>');
  });

  $dataSources.append(options.join(''));

  if (data.dataSourceId) {
    $dataSources.val(data.dataSourceId);
  }
  $dataSources.trigger('change');

  $dataSources.prop('disabled', false);
});
