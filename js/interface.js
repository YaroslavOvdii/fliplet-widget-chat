var data = Fliplet.Widget.getData() || {};
var organizationId = Fliplet.Env.get('organizationId');

$(document).on('change', '.hidden-select', function(){
  var selectedValue = $(this).val();
  var selectedText = $(this).find("option:selected").text();
  $(this).parents('.select-proxy-display').find('.select-value-proxy').text(selectedText);
});

var $dataSources = $('[name="dataSource"]');

$('form').submit(function (event) {
  event.preventDefault();

  data.dataSourceId = $dataSources.val();

  Fliplet.Widget.save(data).then(function () {
    Fliplet.Widget.complete();
    Fliplet.Studio.emit('reload-page-preview');
  });
});

// Fired from Fliplet Studio when the external save button is clicked
Fliplet.Widget.onSaveRequest(function () {
  $('form').submit();
});

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
