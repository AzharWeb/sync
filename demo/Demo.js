angular.module('Demo', ['Sync'])

.run(function(SyncOptions, Sync){


})

.controller('DemoCtrl', function($scope, Sync, RequestModel){
   $scope.RequestModel = RequestModel;
   $scope.flush = function(){
      Sync.syncManual();
   }

   $scope.clearAll = Sync.clearAll;

   $scope.batch = function( req ){
      req.withCredentials = true;
      req.url = 'http://localhost:3000' + req.url;
      req.data = angular.copy(JSON.parse(req.data));
      Sync.batch(req);
      $scope.newRequest = undefined;
   }
});
