angular.module('Demo', ['Sync'])

.run(function(SyncOptions, Sync){


})

.controller('DemoCtrl', function(Sync){

   $scope.batchPost = function( url ){
      Sync.batch({
         url: 'localhost:3000',
         method: 'POST',
         data: { name: 'Foo', id: 1234, createdAt: Date.now() }
      });
   }
});
