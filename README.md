Sync/Batcher for Angular
====
* This is very much an alpha library *
Service to batch up offline requests and sync them with a server when possible.

## Install ##
```
bower install https://github.com/Haemp/sync
```

## Configure ##
pollInterval - used to check connection status
pollUrl - ping every pollInterval
flushInterval - how often we try to sync

```javascript
   angular.module('App').run(function(Sync){

      // start the automatic sync loop
      // this one syncs ever 9 seconds
      Sync.syncAuto({
         pollInterval: 9001,
         flushInterval: 9001,
         pollUrl: 'mywebsite.com/ping'
      });
   });
```

## Batching requests ##

```javascript
   Sync.batch({method:'GET', url: '/some/api'});
```

## Syncing requests ##
If you initiated the manuall loop the sync will handle itself. If you want to
trigger it automatically:
```javascript
   Sync.syncManual();
```


## Develop ##
```
git clone https://github.com/Haemp/sync
cd /sync
npm install
bower install

// testing
grunt test
```
