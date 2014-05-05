/**
 * @author: +HampusAhlgren
 * [ ] Add manual mode
 * [ ] Notify should be an event since in auto mode we don't have a conveinient
 *     access point to get the promise
 * [ ] Way to handle error in sync

   ? can we remove the poll mode and use the regular batched calls
   to check for a connection issue as well. I can use the HTTP request manager
   to handle the timings.

   Bascially if any of the calls fail with a timeout we concider them to
   be an indication of offline status.

   Interface simplicity
    - Add batched calls
    - Decide when to flush them.

    module.run(function(Sync){
       var Sync.syncAuto({
          flushTiming: 60*1000
       });
    });

    in application...
       Sync.syncManual() - to manually sync
    ...
    $rootScope.$on('Sync.SYNC_START');
    $rootScope.$on('Sync.SYNC_END', {status}); // full sync or partial
    $rootScope.$on('Sync.SYNC_PROGRESS', {status}); // what call was synced and what was the outcome


 */

angular.module('Sync', ['AngularSugar'])

.service('SyncOptions', function(){
   var self = this;
   self.flushInterval = 9001;
   self.downSync = false;
})
/*

   Setup a poll service to check connectino and trigger batch

*/
.service('Sync', function Sync($timeout, RequestModel, $http, $q, asUtility, $rootScope, SyncOptions) {

   var self = this;
   self.flushDefer;
   self.flushActive;
   self.requests = RequestModel.requests;
   var CANCELLED = 0;
   self._triggerFlush = function() {

      if (self.flushActive) return;
      self.flushActive = true;

      console.log('Triggering flush');
      $rootScope.$emit('Sync.START');
      self.flushDefer = $q.defer();

      self.flushDefer.promise.then(function(syncData) { // sync successful

         console.log('Sync was successfull!');
         self.flushActive = false;
         $rootScope.$emit('Sync.END_SUCCESS', syncData);

         // // downsync attempts to pull down
         // // a new fresh version of data
         // // from the server to replace
         // // or ammend the current one
         console.log('Real sync options', SyncOptions);
         if( SyncOptions.downSync ){

            console.log('Starting downsync...');
            // watch for changes in the request buffer
            // while we down sync. If there is any queued
            // up in the process we need to cancel it
            self.downSyncWatcher = $rootScope.$watch(function(){
               return RequestModel.requests.length;
            }, function( newValue, oldValue ){
               if( newValue != oldValue ){
                  self._cancelDownSync();
                  self.downSyncWatcher(); // remove watcher
               }
            });

            // cancel mechanism
            self.downSyncDefer = $q.defer();

            // attempt downsync
            $http({
               url: SyncOptions.downSync,
               method:'GET',
               timeout: self.downSyncDefer.promise.then(function(resp){
                  console.log('Donwsync cancelled', resp);
                  $rootScope.$emit('Sync.DOWNSYNC_CANCELLED', resp);

                  return resp;
               })
            })
               .then(function(resp){
                  console.log('Donwsync complete!');
                  $rootScope.$emit('Sync.DOWNSYNC_COMPLETE', resp.data);
               }, function(resp){
                  if( resp.status === CANCELLED ) return;

                  console.log('Donwsync failed at the endpoint');
                  $rootScope.$emit('Sync.DOWNSYNC_FAILED');
               });
         }

      }, function(syncData) { // sync failed

         console.log('Sync could not be completed');
         self.flushActive = false;
         $rootScope.$emit('Sync.END_ERROR', syncData);

      }, function(syncData) { // sync progress

         $rootScope.$emit('Sync.PROGRESS', syncData);
      });

      self._flush();
   }



   /**
    * Trigger all batched up requests -
    * wait for then to return before removing them from
    * the requests array and send them in the order
    * they were added.
    */
   self._flush = function() {

      if (RequestModel.requests.length < 1) {
         console.log('No requests to sync!');
         self.flushDefer.resolve();
         return;
      }

      // next request
      var request = RequestModel.peakNext();
      console.log('Syncing request', request);

      $http(request).then(function(res) {
         console.log('Successful');

         // the request is handled and
         // confirmed by the server so
         // we can go ahead with the next one
         console.log('### Validating...', RequestModel.validateNext());
         console.log('### Requests left: ',RequestModel.requests);
         self.flushDefer.notify(res);
         self._flush();
         return;

      }, function(res) {

         // There is an alternate strategy here
         // that processes all calls no matter if
         // they fail or success. Ending with
         // all failed calls being left in the
         // stack. The negatives with that approach
         // being sequential accuracy - if we queue
         // up a create -> edit / action and miss
         // the create the two proceeding calls
         // will fail because they are out of order.
         console.log('Request could not be synced - aborting sync');
         console.log('### Requests left: ',RequestModel.requests);
         self.flushDefer.reject(res);
         return;
      });
   }

   self._cancelDownSync = function(){
      if( self.downSyncDefer )
         self.downSyncDefer.resolve({status:'cancelled'});
   }

   /**************************************
    *         Public Interface
    **************************************/
   self.syncManual = self._triggerFlush;

   self.batch = function(request) {
      RequestModel.add(request);
   }

   self.syncAuto = function() {

      /**
       * Now we need to setup a flush poll
       * to send all the batched requests
       */
      asUtility.pollFunction(function() {
         self._triggerFlush();
      }, SyncOptions.flushInterval);
   }
})



.service('RequestModel', function RequestModel() {
   var self = this;
   self.requests = [];

   // keep track of the outgoing sync calls in
   // event of closing the app.
   if (localStorage.requests) {
      self.requests = JSON.parse(localStorage.requests);
   }

   /**
    * Adds a call to the end of the stack
    */
   self.add = function(request) {

      console.log('Added request', request);
      var b = self.requests.unshift(request);
      self.save();
      return b;
   }

   /**
    * Adds the requests to the top of the
    * stack to perserve a sequence
    */
   self.addBack = function(request) {

      console.log('Added request', request);
      var b = self.requests.push(request);
      self.save();
      return b;
   }

   self.save = function() {
      localStorage.requests = JSON.stringify(self.requests);
   }

   /**
    *
    */
   self.peakNext = function() {
      var request = self.requests[self.requests.length - 1];
      console.log('Next request', request);
      return request;
   }

   self.validateNext = function(){
      return self.requests.pop();
      self.save();
   }
})
