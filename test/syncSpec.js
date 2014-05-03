describe('Sync', function() {

   console.log = function(){};
   var Sync, RequestModel, $timeout, $httpBackend, $rootScope, SyncOptions;
   var flushInterval = 1001;

   function flushResponse(){
      $timeout.flush(); // trigger the timer
      $rootScope.$apply(); // trigger a digest
      $httpBackend.flush(); // make the fake backend respond
   }

   describe('Manual sync', function(){

      beforeEach(function() {
         angular.module('Test', ['Sync']).run(function(Sync, SyncOptions){

            SyncOptions = {
               flushInterval: flushInterval
            };

         });
         module('Test');

         // starts the module config
         inject(function(_Sync_, _SyncOptions_, _RequestModel_, _$timeout_, _$httpBackend_, _$rootScope_) {
            $timeout = _$timeout_;
            $rootScope = _$rootScope_;
            $httpBackend = _$httpBackend_;

            // setup fake backend
            $httpBackend.when('GET', '/success').respond(200,'');
            $httpBackend.when('GET', '/error').respond(500,'');

            Sync = _Sync_;
            SyncOptions = _SyncOptions_
            RequestModel = _RequestModel_;
            $timeout = $timeout;
         });
      });


      afterEach(function(){

         // remove all outstanding requests
         RequestModel.requests.length = 0;
         RequestModel.save();
         $httpBackend.verifyNoOutstandingExpectation();
         $httpBackend.verifyNoOutstandingRequest();
      });

      it('Should do manual sync and never auto sync', function(){

         // trigger online
         Sync.batch({url:'/success', method:'GET'});
         Sync.syncManual();

         $httpBackend.flush(); // make the fake backend respond

         expect(Sync.requests.length).toBe(0);
      })

   })


   describe('Automatic sync', function(){


      /**
       * Main Setup
       */
      beforeEach(function() {
         angular.module('Test', ['Sync']).run(function(Sync){

            Sync.syncAuto();

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


      /**
       * Slight bit of overarchitecting here
       * I don't think the offline mode
       * serves a purpose. It's just to save the attempt
       * at a sync (which is not expensive) but at the cost
       * of added complexity to the API.
       *
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
            expect(Sync.requests.length).toBe(1);
         });

      })
**/

      describe('Online actions', function(){

         beforeEach(function(){
            SyncOptions = {
               flushInterval: flushInterval
            }
            $httpBackend.when('GET', '/poll-url').respond(200,'');
         })

         it('Should set polltimings according to the options', function() {


            expect(SyncOptions.flushInterval).toBe(flushInterval);
         });

         it('Should add batched calls to the request stack', function() {

            Sync.batch({url:'/success', method:'GET'});
            expect(Sync.requests.length).toBe(1);
         });


         it('Should remove validated calls from the request stack', function() {
            $httpBackend.expect('GET', '/success');


            // setup the batched call
            Sync.batch({url:'/success', method:'GET'});
            Sync.batch({url:'/success', method:'GET'});
            expect(Sync.requests.length).toBe(2);

            flushResponse();

            expect(Sync.requests.length).toBe(0);
         });

         it('Should add back error calls to the request stack if they fail', function() {

            $httpBackend.expect('GET', '/error');
            Sync.batch({url:'/error', method:'GET'});
            expect(RequestModel.requests.length).toBe(1);

            flushResponse();

            expect(Sync.requests.length).toBe(1);
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

            Sync.batch({url:'/success', method:'GET'});
            Sync.batch({url:'/success', method:'GET'});
            Sync.batch({url:'/success', method:'GET'});
            Sync.batch({url:'/error', method:'GET'});

            flushResponse();

            expect(Sync.requests.length).toBe(1);
         });

         it('Should stop sync cycle and add back the last request if a request fails.', function() {

            Sync.batch({url:'/success', method:'GET'});
            Sync.batch({url:'/success', method:'GET'});
            Sync.batch({url:'/error', method:'GET'});
            Sync.batch({url:'/error', method:'GET'});
            Sync.batch({url:'/success', method:'GET'});

            flushResponse();

            expect(Sync.requests.length).toBe(3);
         });

         describe('DownSync', function(){
            beforeEach(function(){

               var data = {
                  foo:'bar'
               };
               SyncOptions.downSync = '/downsync';
               $httpBackend.when('GET', '/downsync').respond(200, data);
            });

            it('Should trigger the downSync after a successfull flush.', function() {

               $httpBackend.expect('GET', '/downsync');

               Sync.batch({url:'/success', method:'GET'});
               Sync.batch({url:'/success', method:'GET'});
               Sync.batch({url:'/success', method:'GET'});

               flushResponse();

            });

            it('Should cancel the downSync if there are any new batched requests.', function() {

               spyOn($rootScope, '$emit');
               Sync.batch({url:'/success', method:'GET'});
               Sync.batch({url:'/error', method:'GET'});
               Sync.batch({url:'/success', method:'GET'});

               flushResponse();

               // check if the data is set in the event properly
               expect(scope.$emit).toHaveBeenCalledWith("Sync.DOWNSYNC_CANCELLED", data);
               expect(Sync.requests.length).toBe(2);
            });

            it('Should trigger a Sync.DONWSYNC_COMPLETE event when the downsync is ready to be merged.', function() {

               spyOn($rootScope, '$emit');
               Sync.batch({url:'/success', method:'GET'});
               Sync.batch({url:'/success', method:'GET'});
               Sync.batch({url:'/success', method:'GET'});

               flushResponse();

               // check if the data is set in the event properly
               expect(scope.$emit).toHaveBeenCalledWith("Sync.DOWNSYNC_COMPLETE", data);
            });
         });

      });
   });

})
