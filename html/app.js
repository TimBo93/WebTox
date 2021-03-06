/*
  WebTox - A web based graphical user interface for Tox
  Copyright (C) 2014 WebTox authors and contributers

  This file is part of WebTox.

  WebTox is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  WebTox is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with WebTox.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';

var webtox = angular.module('webtox', []);

webtox.controller('webtoxCtrl', ['$scope', '$http', function($scope, $http) {

  $scope.notImplemented = function(){
    alert("This feature is not implemented yet. :( Sorry.");
  }


  $('#profile-card-back-button').click(function(){
    $('#profile-card, #contact-list-wrapper, #button-panel').removeClass('translate75left');
    $('#mainview').removeClass('translate100left');
    $('#profile-card-back-button').hide();
  });

  $('#contact-list-wrapper').click(function(){
    if($(window).width() < 768){
      $('#profile-card, #contact-list-wrapper, #button-panel').addClass('translate75left');
      $('#mainview').addClass('translate100left');
      $('#profile-card-back-button').show();
    }
  });

  // fullscreen
  $scope.goFullscreen = function(){
    var elem = document.querySelector("body");
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    }
  };

  $scope.showNotification = function(title, body, onclick) {
    if (!("Notification" in window)) {
      //TODO implement fallback
      alert("This browser does not support desktop notifications.");
    } else if (Notification.permission === "granted") {
      var notification = new Notification(title, {
        body: body,
        icon: '/img/favicon.png',
        onclick: onclick
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission(function (permission) {
        if (!('permission' in Notification)) {
          Notification.permission = permission;
        }
        if (permission === "granted") {
          var notification = new Notification(title, {
            body: body,
            icon: '/img/favicon.png'
          });
          notification.onclick = onclick;
        }
      });
    }
  };


  // == initialise scope ==
  $scope.mainview = {
    WELCOME: 0,
    CHAT: 1,
    SETTINGS: 2,
  };
  $scope.active_mainview = $scope.mainview.WELCOME;
  $scope.profile = {
    username: "Loading...",
    status_msg: "Loading...",
    tox_id: "Loading...",
  };
  $scope.contacts = [];
  $scope.activecontactindex = -1;
  $scope.messagetosend = "";
  $scope.new_friend_request = {
    friend_id: "",
    message: "",
  };

  $scope.getContactIndexByNum = function(num){
    for(var i in $scope.contacts)
      if ($scope.contacts[i].number === num) return i;
    return -1;
  }

  $scope.setUsername = function(username){
    $http.post('api/post/username', {
      username: username
    }).success(function(){
      $scope.fetchProfile();
    }).error(function(){
      $scope.fetchProfile();
    });
  };

  $scope.setStatusMsg = function(status_msg){
    $http.post('api/post/statusmessage', {
      status_msg: status_msg
    }).success(function(){
      $scope.fetchProfile();
    }).error(function(){
      $scope.fetchProfile();
    });
  };

  $scope.setUserStatus = function(status){
    $http.post('api/post/status', {
      status: status
    }).success(function(){
      $scope.fetchProfile();
    }).error(function(){
      $scope.fetchProfile();
    });
  };

  $scope.showChat = function(friendnumber){
    for(var i in $scope.contacts) {
      if ($scope.contacts[i].number === friendnumber) {
        $scope.activecontactindex = i;
        $scope.sendMessageRead(friendnumber);

        window.setTimeout(function(){
          $("#mainview-chat-body").scrollTop($("#mainview-chat-body").prop("scrollHeight"));
        }, 10);

        break;
      }
    }
    $scope.active_mainview = $scope.mainview.CHAT;
  };

  $scope.showSettings = function(){
    $scope.active_mainview = $scope.mainview.SETTINGS;
  };

  $scope.sendMessage = function(){
    if($scope.messagetosend.length == 0)
      return;

    if(!$scope.contacts[$scope.activecontactindex].online) {
      // TODO cache messages server-side until the user gets online again...
      alert("User is offline. :(");
      return;
    }

    $http.post('api/post/message', {
      friend: $scope.contacts[$scope.activecontactindex].number,
      message: $scope.messagetosend
    }).error(function(){
      // TODO
    });

    $scope.contacts[$scope.activecontactindex].chat.unshift({"isIncoming": false, "isAction": false, "message": $scope.messagetosend.replace(/\n/g, "<br>"), "time": Date.now()});
    $scope.contacts[$scope.activecontactindex].last_msg_read = Date.now();
    $scope.messagetosend = "";
    $scope.sendMessageRead($scope.contacts[$scope.activecontactindex].number);

    $("#mainview-chat-body").animate({"scrollTop": $("#mainview-chat-body").prop("scrollHeight")}, 1000);
  };

  $scope.sendMessageRead = function(friendnumber) {
    $http.post('api/post/message_read_receipt', {
      friend: friendnumber
    }).success(function(){
      $scope.contacts[$scope.activecontactindex].last_msg_read = Date.now()
    });
  }

  $scope.sendFriendRequest = function(friend_id, message){
    $http.post('api/post/friend_request', {
      friend_id: friend_id,
      message: message
    }).success(function(){
      $('#modal-friend-requests').modal('hide');
      $http.get('api/get/contactlist').success(function(data){
        $scope.contacts = data;
      });
    }).error(function(err){
      // TODO
      alert(err.message);
    });
  }

  $scope.deleteFriend = function(friend){
    $http.post('api/post/delete_friend', {
      friend: friend
    }).success(function(){
      $('#modal-friend-del').modal('hide');
      $http.get('api/get/contactlist').success(function(data){
        $scope.contacts = data;
      });
    }).error(function(err){
      // TODO
      alert(err.message);
    });
  }

  // == add event handlers ==
  $("#mainview-chat-footer-textarea-wrapper textarea").keyup(function(event){
    if(event.which == 13 && event.shiftKey !== true){
      $scope.sendMessage();
    }
  });

  // == get initial data from server ==
  $scope.fetchProfile = function() {
    $http.get('api/get/profile').success(function(data){
      $scope.profile = data;
    });
  };
  $scope.fetchProfile();

  $scope.fetchContactlist = function() {
    $http.get('api/get/contactlist').success(function(data){
      $scope.contacts = data;
    });
  };
  $scope.fetchContactlist();


  // == initialize WebSocket connection ==
  $scope.ws_create = function(){
    if(!("WebSocket" in window)) {
      // TODO fallback to ajax
      alert("Sorry, your browser does not support WebSockets.");
      return;
    }

    console.log("Trying to connect to WebSocket server...");
    var ws = new WebSocket("wss://"+location.host+"/events");
    ws.onopen = function (event) {
      console.log("WebSocket connection established.");
      $('#modal-connection-error').modal('hide');
      $scope.fetchProfile();
      $scope.fetchContactlist();
    };
    ws.onclose = function(){
      console.log("WebSocket connection closed!");
      $('.modal.info, .modal.warning').modal('hide');
      $('#modal-connection-error').modal('show');
      window.setTimeout($scope.ws_create, 5000);
    }
    ws.onerror = function(){
      console.log("WebSocket connection error!");
    }
    ws.onmessage = function (event) {
      var data = $.parseJSON(event.data);

      switch(data.type) {
      case 'friend_message':
        var i = $scope.getContactIndexByNum(data.friend)
        if (i >= 0 && i < $scope.contacts.length) {
          $scope.contacts[i].chat.unshift({"message": data.message, "isIncoming": true, "isAction": data.isAction, "time": data.time});
          $scope.showNotification($scope.contacts[i].name, data.message, function(){
            $scope.showChat(data.friend); $scope.$apply();
          });

          $("#mainview-chat-body").animate({"scrollTop": $("#mainview-chat-body").prop("scrollHeight")}, 1000);
        }
        break;

      case 'name_changed':
        var i = $scope.getContactIndexByNum(data.friend)
        if (i >= 0 && i < $scope.contacts.length)
          $scope.contacts[i].name = data.name;
        break;

      case 'status_message_changed':
        var i = $scope.getContactIndexByNum(data.friend)
        if (i >= 0 && i < $scope.contacts.length)
          $scope.contacts[i].status_msg = data.status_msg;
        break;

      case 'status_changed':
        var i = $scope.getContactIndexByNum(data.friend)
        if (i >= 0 && i < $scope.contacts.length)
          $scope.contacts[i].status = data.status;
        break;

      case 'connection_status':
        var i = $scope.getContactIndexByNum(data.friend);
        $scope.contacts[i].online = data.online;
        $scope.showNotification($scope.contacts[i].name+" is now "+(data.online?'online':'offline'));
        break;

      }
      $scope.$apply();
    }
  };
  $scope.ws_create();

}]);
