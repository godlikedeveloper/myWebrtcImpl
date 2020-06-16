var RTCPeerConnection =
  window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
var IceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;
var SessionDescription =
  window.mozRTCSessionDescription || window.RTCSessionDescription;
navigator.getUserMedia =
  navigator.getUserMedia ||
  navigator.mozGetUserMedia ||
  navigator.webkitGetUserMedia;

// 做 ICE 的 TURN 和 / 或 STUN 服务器
// 确保大多数用户可以避免因 NAT 和防火墙导致的无法建立连接
var configuration = {
  iceServers: [
    { urls: "stun:23.21.150.121" },
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:numb.viagenie.ca",
      credential: "webrtcdemo",
      username: "louis%40mozilla.com",
    },
  ],
};
var myUsername, targetUsername;

function createPeerConnection() {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      // Information about ICE servers - Use your own!
      {
        urls: "stun:stun.stunprotocol.org",
      },
    ],
  });

  myPeerConnection.onicecandidate = handleICECandidateEvent;
  myPeerConnection.ontrack = handleTrackEvent;
  myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;
  myPeerConnection.onremovetrack = handleRemoveTrackEvent;
  myPeerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
  myPeerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
  myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;
}

// pc.onicecandidate = function (e) {
//   // candidate exists in e.candidate
//   if (!e.candidate) return;
//   send("icecandidate", JSON.stringify(e.candidate));
// };
var connection = new WebSocket("ws://localhost:6503", "json");

function registerEvt() {
  document.querySelector("#confirm").addEventListener(
    "click",
    function () {
      sendToServer({
        type: "userName",
        name: document.querySelector("#userName").value,
      });
    },
    false
  );
}

//#region connection

connection.onmessage = function (event) {
  console.log(event);

  var data=JSON.parse(event.data)
  
};
//#endregion

function sendToServer(msg) {
  var msgJSON = JSON.stringify(msg);
  connection.send(msgJSON);
}
registerEvt();

function closeVideoCall() {
  var remoteVideo = document.getElementById("received_video");
  var localVideo = document.getElementById("local_video");
  // 清除连接
  if (myPeerConnection) {
    myPeerConnection.ontrack = null;
    myPeerConnection.onremovetrack = null;
    myPeerConnection.onremovestream = null;
    myPeerConnection.onicecandidate = null;
    myPeerConnection.oniceconnectionstatechange = null;
    myPeerConnection.onsignalingstatechange = null;
    myPeerConnection.onicegatheringstatechange = null;
    myPeerConnection.onnegotiationneeded = null;
    // 关闭远端流 和本地流
    if (remoteVideo.srcObject) {
      remoteVideo.srcObject.getTracks().forEach((track) => track.stop());
    }

    if (localVideo.srcObject) {
      localVideo.srcObject.getTracks().forEach((track) => track.stop());
    }

    myPeerConnection.close();
    myPeerConnection = null;
  }

  remoteVideo.removeAttribute("src");
  remoteVideo.removeAttribute("srcObject");
  localVideo.removeAttribute("src");
  remoteVideo.removeAttribute("srcObject");

  document.getElementById("hangup-button").disabled = true;
  targetUsername = null;
}
// 交换候选事件 确定传输协议
function handleICECandidateEvent(event) {
  if (event.candidate) {
    sendToServer({
      type: "new-ice-candidate",
      target: targetUsername,
      candidate: event.candidate,
    });
  }
}

function handleTrackEvent(event) {}
// 协商传输格式等信息的事件
function handleNegotiationNeededEvent() {
  myPeerConnection
    .createOffer()
    .then(function (offer) {
      return myPeerConnection.setLocalDescription(offer);
    })
    .then(function () {
      sendToServer({
        name: myUsername,
        target: targetUsername,
        type: "video-offer",
        sdp: myPeerConnection.localDescription,
      });
    })
    .catch(reportError);
}

// 清除轨道 关闭流
function handleRemoveTrackEvent(event) {
  var stream = document.getElementById("received_video").srcObject;
  var trackList = stream.getTracks();

  if (trackList.length == 0) {
    closeVideoCall();
  }
}

function handleICEConnectionStateChangeEvent(event) {
  switch (myPeerConnection.iceConnectionState) {
    case "closed":
    case "failed":
    case "disconnected":
      closeVideoCall();
      break;
  }
}

function handleICEGatheringStateChangeEvent(event) {
  // Our sample just logs information to console here,
  // but you can do whatever you need.
}

function handleICEGatheringStateChangeEvent(event) {
  // Our sample just logs information to console here,
  // but you can do whatever you need.
}

function handleSignalingStateChangeEvent(event) {
  // Our sample just logs information to console here,
  // but you can do whatever you need.
}

// 重新渲染userlist 并加上点击事件
function handleUserlistMsg(msg) {
  var i;
  var listElem = document.querySelector(".userlistbox");

  while (listElem.firstChild) {
    listElem.removeChild(listElem.firstChild);
  }

  msg.users.forEach(function (username) {
    var item = document.createElement("li");
    item.appendChild(document.createTextNode(username));
    item.addEventListener("click", invite, false);

    listElem.appendChild(item);
  });
}
var mediaConstraints = {
  audio: true, // We want an audio track
  video: true, // ...and we want a video track
};

function invite(evt) {
  if (myPeerConnection) {
    alert("You can't start a call because you already have one open!");
  } else {
    var clickedUsername = evt.target.textContent;

    if (clickedUsername === myUsername) {
      alert(
        "I'm afraid I can't let you talk to yourself. That would be weird."
      );
      return;
    }

    targetUsername = clickedUsername;

    createPeerConnection();

    navigator.mediaDevices
      .getUserMedia(mediaConstraints)
      .then(function (localStream) {
        document.getElementById("local_video").srcObject = localStream;
        myPeerConnection.addStream(localStream);
      })
      .catch(handleGetUserMediaError);
  }
}
