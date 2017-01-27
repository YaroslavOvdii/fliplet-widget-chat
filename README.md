# Fliplet Chat Widget

## Instance options

- `dataSourceId` - the data source to use for the contacts list
- `pushNotifications` - whether push notifications are enabled for the chat

## Cross Login

Cross login by email between the chat component and other components can be done by setting the following variable on the app storage:

```js
Fliplet.App.Storage.set('fl-chat-auth-email', 'john@example.org').then(function () {
  // you can now navigate to the chat with to get automatically logged in
});
```

## Start a contact conversation

When navigating to the page that hosts the chat, you can start a conversation with a contact by providing the parameter `contactConversation` in the query string, with the `dataSourceEntryId` of the contact you want to chat to:

```
?contactConversation=123
```

---

## Development

This widget is meant to be used with the Fliplet platform.

Run for local development with the `fliplet-cli`:

```bash
$ cd path/to/fliplet-widget-chat
$ fliplet run-widget
```