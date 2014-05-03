Sync/Batcher for Angular
====
* This is very much an alpha library *

Service to batch up offline requests and sync them with a server when possible.

## Install ##
```
bower install Haemp/sync
```

## Configure ##
flushInterval - how often we try to sync

```javascript
angular.module('App').run(function(Sync, SyncOptions){

   // set options
   SyncOptions = {
      flushInterval: 9001
   }

   // start the automatic sync loop
   // this one syncs ever 9 seconds
   Sync.syncAuto();
});
```

## Batching requests ##

```javascript
Sync.batch({method:'GET', url: '/some/api'});
```
[ ] Add httpInterceptor to batch all call automatically

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
