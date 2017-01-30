var widgetId = Fliplet.Widget.getDefaultId();
var data = Fliplet.Widget.getData() || {};
var organizationId = Fliplet.Env.get('organizationId');
var widgetId = Fliplet.Widget.getDefaultId();

$(document).on('change', '.hidden-select', function(){
  var selectedValue = $(this).val();
  var selectedText = $(this).find("option:selected").text();
  $(this).parents('.select-proxy-display').find('.select-value-proxy').text(selectedText);
});

var $dataSources = $('[name="dataSource"]');

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

$('form').submit(function (event) {
  event.preventDefault();
  linkDirectoryProvider.forwardSaveRequest();
});

// Fired from Fliplet Studio when the external save button is clicked
Fliplet.Widget.onSaveRequest(function () {
  $('form').submit();
});

linkDirectoryProvider.then(function (result) {
  data.contactLinkAction = result.data;
  save(true);
});

function save(notifyComplete) {
  // Push notifications are always enabled for the chat
  data.pushNotifications = true;

  data.dataSourceId = $dataSources.val();

  Fliplet.Widget.save(data).then(function () {
    if (notifyComplete) {
      Fliplet.Widget.complete();
      window.location.reload();
    } else {
      Fliplet.Studio.emit('reload-widget-instance', widgetId);
    }
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
