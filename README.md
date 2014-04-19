Sync/Batcher for Angular
====

Service to batch up offline requests and sync them with a server when possible.

*Configure*
pollInterval - used to check connection status
pollUrl - ping every pollInterval
flushInterval - how often we try to sync
manual - Sync only manually

```javascript
   angular.module('App').config(function(SyncProvider){
      SyncProvider.setOptions({
         pollInterval: 9001,
         flushInterval: 9001,
         pollUrl: mywebsite.com/ping
      })
   }).run(function(Sync){
      Sync.init();
   });
```

*Batching requests*

```javascript
   Sync.batch({method:'GET', url: '/some/api'});
```

*Syncing requests*

```javascript
   Sync.flush().then(function( status ){
      // successfull sync
   }, function( status ){
      // sync failed
   }, function( progress ){
      // sync progress
   });
```
