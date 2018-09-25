# Fliplet Chat Widget (v2.0.0)

## Instance options

- `dataSourceId` - the data source to use for the contacts list
- `pushNotifications` - whether push notifications are enabled for the chat

## Cross Login

Cross login by email between the chat component and other components can be done by setting the following variable on the app storage:

```js
Fliplet.App.Storage.set('fl-chat-auth-email', 'john@example.org').then(function () {
  // you can now navigate to the chat and it won't require you to log in
});
```

Note: If the user logs out from the chat, the variable will be removed from the storage.

## Start a contact conversation

When navigating to the page that hosts the chat, you can start a conversation with a contact by providing the parameter `contactConversation` in the query string, with the `dataSourceEntryId` of the contact you want to chat to:

```
?contactConversation=123
```

Note: if the user has not logged in, the conversation will still be started with the user after logging in.

---

## Get unread messages

Getting unread messages can be done on any screen of the app, as long as the user is logged in.
Here's how to achieve it using basic Fliplet JS APIs:

```js
Fliplet.Navigator.onReady().then(function () {
  return Promise.all(['fl-chat-user-token', 'fl-chat-user-id'].map(Fliplet.App.Storage.get));
}).then(function (results) {
  userToken = results[0];
  userId = results[1];

  if (!userId || !userToken) {
    return Promise.reject('User is not logged into the chat');
  }

  return Fliplet.API.request({
    method: 'POST',
    url: 'v1/data-sources/data',
    data: {
      flUserToken: userToken,
      count: true,
      where: { $not: { data: { $contains: { readBy: [userId] } } } }
    }
  });
}).then(function (response) {
  console.log('Unread messages', response.entries)
  // update UI
}).catch(function (err) {
  // user not logged in
  console.warn(err);
})
```


## Development

This widget is meant to be used with the Fliplet platform.

Run for local development with the `fliplet-cli`:

```bash
$ cd path/to/fliplet-widget-chat
$ fliplet run-widget
```