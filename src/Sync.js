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

var Sync = angular.module('Sync', ['AngularSugar']);

/*

   Setup a poll service to check connectino and trigger batch

*/
Sync.service('Sync', function($timeout, RequestModel, $http, $q, asUtility, $rootScope) {

   var ONLINE = 'online';
   var OFFLINE = 'offline';

   var self = this;
   self.options;
   self.connectionStatus;
   self.flushDefer;
   self.flushActive;
   self.requests = RequestModel.requests;

   self._triggerFlush = function() {

      console.log('Connection status', self.connectionStatus);
      if (self.flushActive || self.connectionStatus == OFFLINE) return;
      self.flushActive = true;


      console.log('Triggering flush');
      $rootScope.$emit('Sync.START');
      self.flushDefer = $q.defer();

      self.flushDefer.promise.then(function(syncData) { // sync successful

         console.log('Sync was successfull!');
         self.flushActive = false;
         $rootScope.$emit('Sync.END_SUCCESS', syncData);

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
      var request = RequestModel.next();
      console.log('Syncing request', request);

      $http(request).then(function(res) {
         console.log('Successful');
         // the request is handled and
         // confirmed by the server so
         // we can go ahead with the next one
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
         console.log('Adding back request', request);
         RequestModel.addBack(request);
         self.flushDefer.reject(res);
         return;
      });
   }

   /**************************************
    *         Public Interface
    **************************************/
   self.syncManual = self._triggerFlush;
   self.setOptions = function(o){
      self.options = o;
   }
   self.batch = function(request) {
      RequestModel.add(request);
   }

   self.syncAuto = function(options) {
      self.setOptions(options);

      /**
       * Polls the given end point to check for
       * connection
       */
      asUtility.pollFunction(function() {

         return $http({
            method: 'GET',
            url: self.options.pollUrl
         }).then(function() {

            // here we are ok and there is a
            // good connection
            self.connectionStatus = ONLINE;

         }, function() {
            // now we are offline
            self.connectionStatus = OFFLINE;
         });

      }, self.options.pollInterval);

      /**
       * Now we need to setup a flush poll
       * to send all the batched requests
       * after a certain timenpm i
       */
      asUtility.pollFunction(function() {
         self._triggerFlush();
      }, self.options.flushInterval);
   }
});



Sync.service('RequestModel', function() {
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
    * There is a potentail risk of the system
    * being synced - a call fails and after the
    * fail status the app shuts down - this
    * solution will miss that call. But the chance
    * should be relatively minimal.
    */
   self.next = function() {
      var request = self.requests.pop(request);
      console.log('Next request', request);
      self.save();
      return request;
   }
});
