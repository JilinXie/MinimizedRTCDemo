
var wsAddr = 'ws://localhost:9090';


new Vue({
    el: "#container",
    data: {
        username: '',
        peername: '',
        conn: null,
        peerConn: null,
        videoDom: null,
        localVideo: null,
    },
    mounted: function() {
        this.videoDom = document.querySelector('video#vscreen');
        this.connect(); 
        this.rtcConnect();
    },
    methods: {
        sendMsg: function(msg) {
            this.conn.send(JSON.stringify(msg));
        },
        connect: function(method=null) {
            this.conn = new WebSocket(wsAddr);
            let self = this;
            this.conn.onmessage = function(msg) {
                let data = JSON.parse(msg.data); 
                switch(data.operation) {
                    case "login":
                        console.log('logged in as ' + data.username);
                        break;
                    case "candidate":
                        if (data.candidate != null) {
                            self.rtcConn.addIceCandidate(data.candidate);
                            console.log(self.username + " candidate added");
                        }
                        break;
                    case "offer":
                        console.log("received offer from " + data.peer);
                        self.rtcConn.setRemoteDescription(data.offer)
                            .then(function() {
                                self.rtcConn.createAnswer().then(function(desc) {
                                    self.rtcConn.setLocalDescription(desc)
                                        .then(function() {
                                            console.log("give answer to " + data.peer);
                                            self.sendMsg({operation: "answer",
                                                          answer: desc,
                                                          to: data.peer,
                                                          from: self.username});
                                        }).catch(function(e) { alert('error: ' + ename)});
                                }).catch(function(e) { alert('error: ' + ename)});
                            }).catch(function(e) { alert('error: ' + ename)});
                        console.log("offer accepted from " + data.peer);
                        break;
                    case "answer":
                        self.rtcConn.setRemoteDescription(data.answer);
                        break;
                    case "error":
                        alert(data.msg);
                        break;
                    default:
                        break;
                }
            }
        },
        login: function() {
            this.sendMsg({operation: "login", username: this.username});
        },
        rtcConnect: function() {
            let configuration = { 
               "iceServers": [{ "url": "stun:stun2.1.google.com:19302" }]  
            };
            let self = this;
            this.rtcConn = new RTCPeerConnection(configuration);
            this.rtcConn.onicecandidate = function(e) {
                self.sendMsg({operation: 'candidate',  
                              to: self.peername,
                              from: self.username,                              
                              candidate: e.candidate});
            }
            this.rtcConn.ontrack = function(e) {
                self.videoDom.srcObject = e.streams[0];
                console.log('Received remote stream');
            }
        },
        peerconnect: function() {
            let self = this;
            navigator.mediaDevices.getUserMedia({audio: true, video: true})
                .then(function(stream) {
                    self.localVideo = stream;
                    self.localVideo.getTracks().forEach(
                        function(track) {
                            self.rtcConn.addTrack(track, self.localVideo);
                        }
                    );
                    var offerOptions = { 
                          offerToReceiveAudio: 1,
                          offerToReceiveVideo: 1,
                          voiceActivityDetection: false
                    };
                    self.rtcConn.createOffer(offerOptions).then(function(desc) {
                        self.rtcConn.setLocalDescription(desc).then(function() {
                            console.log('send offer to ' + self.peername);
                            self.sendMsg({operation: 'offer',
                                          to: self.peername,
                                          from: self.username,
                                          offer: desc});
                        }).catch(function(e) { alert('error: ' + ename)});
                    }).catch(function(e) {alert('error: ' + e.name)});
                }).catch(function(e) {alert('error: ' + e.name)});
        }
    }
});
