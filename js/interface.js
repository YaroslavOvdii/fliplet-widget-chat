var data = Fliplet.Widget.getData() || {};
var organizationId = Fliplet.Env.get('organizationId');

var $dataSources = $('select');

$('form').submit(function (event) {
  event.preventDefault();

  data.dataSourceId = $dataSources.val();

  Fliplet.Widget.save(data).then(function () {
    Fliplet.Widget.complete();
  });
});

// Fired from Fliplet Studio when the external save button is clicked
Fliplet.Widget.onSaveRequest(function () {
  $('form').submit();
});

// Load the data source for the contacts
$dataSources.prop('disabled', 'disabled');
$dataSources.append('<option value="">Please wait...</option>');

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

  $dataSources.prop('disabled', '');
});