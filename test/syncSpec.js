describe('Sync', function() {

   //console.log = function(){};
   var Sync, RequestModel, $timeout, $httpBackend, $rootScope;
   var pollInterval = 1001;
   var flushInterval = 1001;

   function flushResponse(){
      $timeout.flush(); // trigger the timer
      $rootScope.$apply(); // trigger a digest
      $httpBackend.flush(); // make the fake backend respond
   }

   /**
    * Main Setup
    */
   beforeEach(function() {
      angular.module('Test', ['Sync']).config(function(SyncProvider) {

         SyncProvider.setOptions({
            pollUrl: '/poll-url',
            pollInterval: pollInterval,
            flushInterval: flushInterval,
            manual: false
         });

      }).run(function(Sync){
         Sync.init();

      });
      module('Test');

      // starts the module config
      inject(function(_Sync_, _RequestModel_, _$timeout_, _$httpBackend_, _$rootScope_) {
         $timeout = _$timeout_;
         $rootScope = _$rootScope_;
         $httpBackend = _$httpBackend_;

         // setup fake backend
         $httpBackend.when('GET', '/success').respond(200,'');
         $httpBackend.when('GET', '/error').respond(500,'');

         Sync = _Sync_;
         RequestModel = _RequestModel_;
         $timeout = $timeout;
      });
   });

   /**
    * Main tear down
    */
   afterEach(function(){

      // remove all outstanding requests
      RequestModel.requests.length = 0;
      RequestModel.save();
      $httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
   });



   describe('Offline actions', function(){

      beforeEach(function(){
         $httpBackend.when('GET', '/poll-url').respond(500,'');
      })

      it('Should detect offline status', function() {

         $httpBackend.expect('GET', '/poll-url');

         flushResponse();

         expect(Sync.connectionStatus).toBe('offline');
      });

      it('Should not sync when in offline status', function() {

         flushResponse();

         Sync.batch({url:'/success', method:'GET'});

         flushResponse();
         expect(RequestModel.requests.length).toBe(1);
      });

   })


   describe('Online actions', function(){

      beforeEach(function(){
         $httpBackend.when('GET', '/poll-url').respond(200,'');
      })

      it('Should set polltimings according to the options', function() {

         expect(Sync.options.pollInterval).toBe(pollInterval);
         expect(Sync.options.flushInterval).toBe(flushInterval);
         expect(Sync.options.pollUrl).toBe('/poll-url');
      });

      it('Should add batched calls to the request stack', function() {

         Sync.batch({url:'/success', method:'GET'});
         expect(RequestModel.requests.length).toBe(1);
      });

      it('Should detect online status', function() {

         $httpBackend.expect('GET', '/poll-url');

         flushResponse();

         expect(Sync.connectionStatus).toBe('online');
      });


      it('Should remove validated calls from the request stack', function() {
         $httpBackend.expect('GET', '/success');


         // setup the batched call
         Sync.batch({url:'/success', method:'GET'});
         Sync.batch({url:'/success', method:'GET'});
         expect(RequestModel.requests.length).toBe(2);

         flushResponse();

         expect(RequestModel.requests.length).toBe(0);
      });

      it('Should add back error calls to the request stack', function() {

         $httpBackend.expect('GET', '/error');
         Sync.batch({url:'/error', method:'GET'});
         expect(RequestModel.requests.length).toBe(1);

         flushResponse();

         expect(RequestModel.requests.length).toBe(1);
      });

      it('Should store the reqeust stack for persistant storage', function() {

         Sync.batch({url:'/error', method:'GET'});
         Sync.batch({url:'/error', method:'GET'});

         $rootScope.$digest();
         var requests = JSON.parse(localStorage.requests);
         expect(requests.length).toBe(2);
      });

      it('Should notify about the progress of the sync', function() {
         var notified = false;

         Sync.batch({url:'/success', method:'GET'});

         $timeout.flush(); // trigger the timer - this enables the promise

         Sync.flushDefer.promise.then( function(){

         }, function(){

         }, function(){
            notified = true;
         });

         flushResponse();

         expect(notified).toBe(true);
      });

      it('Should sync the requests in the order they was added', function() {
         flushResponse();

         Sync.batch({url:'/success', method:'GET'});
         Sync.batch({url:'/success', method:'GET'});
         Sync.batch({url:'/success', method:'GET'});
         Sync.batch({url:'/error', method:'GET'});

         flushResponse();
         flushResponse();
         flushResponse();
         flushResponse();

         expect(RequestModel.requests.length).toBe(1);
      });

      iit('Should attempt to sync all calls and leave the failed ones still in the stack', function() {

         // go activate online mode
         flushResponse();

         Sync.batch({url:'/success', method:'GET'});
         Sync.batch({url:'/success', method:'GET'});
         Sync.batch({url:'/error', method:'GET'});
         Sync.batch({url:'/error', method:'GET'});
         Sync.batch({url:'/success', method:'GET'});

         flushResponse();

         expect(RequestModel.requests.length).toBe(2);
      });
   });




})
