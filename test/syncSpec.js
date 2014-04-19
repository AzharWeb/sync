describe('Sync', function() {

   //console.log = function(){};
   var Sync, RequestModel, $timeout;
   var pollInterval = 1001;
   var flushInterval = 1001;

   beforeEach(function() {
      angular.module('Test', ['Sync']).config(function(SyncProvider) {

         SyncProvider.setOptions({
            pollUrl: '/poll-url',
            pollInterval: pollInterval,
            flushInterval: flushInterval
         });
      });
      module('Test');

      // starts the module config
      inject(function(_Sync_, _RequestModel_, _$timeout_, _$httpBackend_) {

         _$httpBackend_.when('GET', '/success').respond(200,'');
         Sync = _Sync_;
         RequestModel = _RequestModel_;
         $timeout = $timeout;
      });
   });

   afterEach(function(){

      // remove all outstanding requests
      RequestModel.requests.length = 0;
      RequestModel.save();
   })

   it('Should set polltimings according to the options', function() {

      expect(Sync.options.pollInterval).toBe(pollInterval);
      expect(Sync.options.flushInterval).toBe(flushInterval);
      expect(Sync.options.pollUrl).toBe('/poll-url');
   });

   it('Should add batched calls to the request stack', function() {

      Sync.batch({url:'/success', method:'GET'});
      expect(RequestModel.requests.length).toBe(1);

      $timeout(function(){
         expect(RequestModel.requests.length).toBe(0);
      }, flushInterval+1000);

   });

   it('Should remove validated calls from the request stack', function() {

   });

   it('Should add back error calls to the request stack', function() {

   });

   it('Should detect online status', function() {

   });

   it('Should detect offline status', function() {

   });

   it('Should not sync when in offline status', function() {

   });

   it('Should store the reqeust stack for persistant storage', function() {

   });

   it('Should notify about the progress of the sync', function() {

   });

   it(
      'Should attempt to sync all calls and leave the failed ones still in the stack',
      function() {

      });

})
