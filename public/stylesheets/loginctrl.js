
    app.controller('loginCtrl', function($scope, $http, $state) {
        $scope.data = {};
        $scope.data.username ;
        $scope.data.password;
        $scope.submit = function() {
            $http.post('/login', $scope.data).then(function(data){
                       $state.go('dashboard');
                       
                })

        }

        
});


	
