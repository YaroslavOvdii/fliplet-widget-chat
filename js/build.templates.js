this["Fliplet"] = this["Fliplet"] || {};
this["Fliplet"]["Widget"] = this["Fliplet"]["Widget"] || {};
this["Fliplet"]["Widget"]["Templates"] = this["Fliplet"]["Widget"]["Templates"] || {};

this["Fliplet"]["Widget"]["Templates"]["templates.conversation-content"] = Handlebars.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<div class=\"offline-note\">Your device is offline</div>\n<div class=\"empty-area\"></div>\n<div class=\"msg-holder\">\n  <div class=\"profile-header\">\n    <div class=\"back-btn\">\n      <i class=\"fa fa-chevron-left\"></i>\n    </div>\n    <div data-user-profile=\""
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "\">\n      <div class=\"msg-user-avatar\">\n        <div class=\"image-holder\" style=\"background-image: url("
    + alias4(((helper = (helper = helpers.avatar || (depth0 != null ? depth0.avatar : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"avatar","hash":{},"data":data}) : helper)))
    + ")\"></div>\n        <i class=\"fa fa-user\" aria-hidden=\"true\"></i>\n      </div>\n      <span class=\"user-name\">"
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "</span>\n    </div>\n  </div>\n\n  <div class=\"msg-chats\" ontouchstart=\"\">\n    <button type=\"button\" class=\"btn btn-default load-more\" data-load-more>Load more</button>\n    <div class=\"chats\" data-conversation-messages></div>\n  </div>\n\n  <div class=\"input-holder\" data-new-message ontouchstart=\"\">\n    <div class=\"error-send\">Couldn't send your message. Try again!</div>\n    <div class=\"sending-to\">Send to: <strong>"
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "</strong></div>\n    <div class=\"message-input\">\n      <textarea class=\"form-control\" rows=\"1\" data-message-body></textarea>\n    </div>\n    <button class=\"message-input-btn btn btn-primary\" type=\"button\">\n      <span>Send <i class=\"fa fa-paper-plane\"></i></span>\n      <div class=\"loader\"><i class=\"fa fa-spinner\"></i></div>\n    </button>\n  </div>\n<div>\n";
},"useData":true});

this["Fliplet"]["Widget"]["Templates"]["templates.conversation-item"] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    return "new";
},"3":function(container,depth0,helpers,partials,data) {
    return "active";
},"5":function(container,depth0,helpers,partials,data) {
    var helper;

  return "    <div class=\"convo-timestamp\">\n      <span>"
    + container.escapeExpression(((helper = (helper = helpers.date || (depth0 != null ? depth0.date : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"date","hash":{},"data":data}) : helper)))
    + "</span>\n    </div>\n";
},"7":function(container,depth0,helpers,partials,data) {
    var helper;

  return "  <div class=\"convo-preview\">\n    <p>"
    + container.escapeExpression(((helper = (helper = helpers.body || (depth0 != null ? depth0.body : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"body","hash":{},"data":data}) : helper)))
    + "</p>\n  </div>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<li class=\""
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.unreadMessages : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + " "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.isCurrent : depth0),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\" data-conversation-id=\""
    + alias4(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data}) : helper)))
    + "\">\n  <div class=\"convo-user-avatar\">\n    <div class=\"image-holder\" style=\"background-image: url("
    + alias4(((helper = (helper = helpers.avatar || (depth0 != null ? depth0.avatar : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"avatar","hash":{},"data":data}) : helper)))
    + ")\"></div>\n    <i class=\"fa fa-user\" aria-hidden=\"true\"></i>\n  </div>\n  <div class=\"title-holder\">\n    <div class=\"user-name\">\n      <p>"
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "</p>\n    </div>\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.lastMessage : depth0),{"name":"with","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "  </div>\n"
    + ((stack1 = helpers["with"].call(alias1,(depth0 != null ? depth0.lastMessage : depth0),{"name":"with","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</li>\n";
},"useData":true});

this["Fliplet"]["Widget"]["Templates"]["templates.message"] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    return "chat-right";
},"3":function(container,depth0,helpers,partials,data) {
    return "chat-left";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<div class=\"chat "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.isFromCurrentUser : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(3, data, 0),"data":data})) != null ? stack1 : "")
    + "\">\n  <div class=\"chat-body\">\n    <div class=\"msg-time\">"
    + alias4(((helper = (helper = helpers.timeAgo || (depth0 != null ? depth0.timeAgo : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"timeAgo","hash":{},"data":data}) : helper)))
    + "</div>\n    <div class=\"user-avatar\">\n      <div class=\"image-holder\" style=\"background-image: url("
    + alias4(((helper = (helper = helpers.avatar || (depth0 != null ? depth0.avatar : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"avatar","hash":{},"data":data}) : helper)))
    + ")\"></div>\n      <i class=\"fa fa-user\" aria-hidden=\"true\"></i>\n    </div>\n    <div class=\"chat-text\" data-toggle=\"tooltip\" title=\"Copy\" data-placement=\"top\" data-trigger=\"manual\">\n      <p>"
    + alias4((helpers.formatMessage || (depth0 && depth0.formatMessage) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0.message : depth0)) != null ? stack1.body : stack1),{"name":"formatMessage","hash":{},"data":data}))
    + "</p>\n    </div>\n  </div>\n</div>\n";
},"useData":true});

this["Fliplet"]["Widget"]["Templates"]["templates.new-conversation"] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "    <li>\n      <a href=\"#\" data-create-conversation=\""
    + alias4(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data}) : helper)))
    + "\">"
    + alias4(((helper = (helper = helpers.fullName || (depth0 != null ? depth0.fullName : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"fullName","hash":{},"data":data}) : helper)))
    + "</a>\n    </li>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<div class=\"list-of-contacts hidden\">\n<h4>New conversation</h4>\n\n<p>Select contact to start a conversation</p>\n\n<ul class=\"contacts\">\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.contacts : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</ul>\n</div>\n";
},"useData":true});