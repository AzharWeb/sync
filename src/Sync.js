/**
 * @author: +HampusAhlgren
 * [] Add manual mode
 */

var Sync = angular.module('Sync', ['AngularSugar']);

/*

   Setup a poll service to check connectino and trigger batch

*/
Sync.provider('Sync', function(){
   var self = this;
   var options = {};

   this.setOptions = function(opt){
      options = opt;
   }

   var Sync = function( $timeout, RequestModel, $http, $q, asUtility ){
      var self = this;


      self.options = options;
      var ONLINE = 'online';
      var OFFLINE = 'offline';
      var flushDefer;

      self.init = function(){

         /**
          * Polls the given end point to check for
          * connection
          */
         asUtility.pollFunction(function(){

            return $http({
               method: 'GET',
               url: self.options.pollUrl
            }).then(function(){

               // here we are ok and there is a
               // good connection
               self.connectionStatus = ONLINE;

            }, function(){
               // now we are offline
               self.connectionStatus = OFFLINE;
            });

         }, self.options.pollInterval);

         /**
         * Now we need to setup a flush poll
         * to send all the batched requests
         * after a certain timenpm i
         */
         asUtility.pollFunction(function(){
            self.triggerFlush();
         }, self.options.flushInterval);
      }



      self.triggerFlush = function(){

         if( self.flushActive || self.connectionStatus == OFFLINE ) return;
         self.flushActive = true;

         console.log('Triggering flush');
         flushDefer = $q.defer();

         flushDefer.promise.then(function(){ // sync successful

            console.log('Sync was successfull!');
            self.flushActive = false;

         }, function(){ // sync failed

            console.log('Sync could not be completed');
            self.flushActive = false;

         }, function(){ // sync progress
            console.log('Sync progress');
         });

         self.flush();
      }

      /**
       * Trigger all batched up requests -
       * wait for then to return before removing them from
       * the requests array and send them in the order
       * they were added.
       */
      self.flush = function(){

         if(RequestModel.requests.length < 1){
            console.log('No requests to sync!');
            flushDefer.resolve();
            return;
         }

         // next request

         var request = RequestModel.next();
         console.log('Syncing request', request);

         $http(request).then(function(res){
            console.log('Successful');
            // the request is handled and
            // confirmed by the server so
            // we can go ahead with the next one
            flushDefer.notify(res);
            self.flush();
            return;

         }, function(res){

            console.log('Request could not be synced - aborting sync');
            console.log('Adding back request', request);
            RequestModel.add(request);
            flushDefer.reject(res);
            return;
         });
      }

      self.batch = function( request ){
         RequestModel.add(request);
      }
   }

   this.$get = function($timeout, RequestModel, $http, $q, asUtility){
      return new Sync($timeout, RequestModel, $http, $q, asUtility);
   }
});



Sync.service('RequestModel', function(){
   var self = this;
   self.requests = [];

   // keep track of the outgoing sync calls in
   // event of closing the app.
   if( localStorage.requests ){
      self.requests = JSON.parse(localStorage.requests);
   }

   self.add = function(request){

      console.log('Added request', request);
      var b = self.requests.unshift(request);
      self.save();
      return b;
   }

   self.save = function(){
      localStorage.requests = JSON.stringify(self.requests);
   }

   /**
    * There is a potentail risk of the system
    * being synced - a call fails and after the
    * fail status the app shuts down - this
    * solution will miss that call. But the chance
    * should be relatively minimal.
    */
   self.next = function(){
      var request = self.requests.shift(request);
      console.log('Next request', request);
      self.save();
      return request;
   }
});
