class PeerService {
  constructor() {
    if (!this.peer) {
      this.peer = new RTCPeerConnection({
        iceServers: [
          {
            urls: "stun:stun.relay.metered.ca:80",
          },
          {
            urls: "turn:global.relay.metered.ca:80",
            username: "683476fd9a2b31ef5b7643c3",
            credential: "LxaSTPlWMuANe/T1",
          },
          {
            urls: "turn:global.relay.metered.ca:80?transport=tcp",
            username: "683476fd9a2b31ef5b7643c3",
            credential: "LxaSTPlWMuANe/T1",
          },
          {
            urls: "turn:global.relay.metered.ca:443",
            username: "683476fd9a2b31ef5b7643c3",
            credential: "LxaSTPlWMuANe/T1",
          },
          {
            urls: "turns:global.relay.metered.ca:443?transport=tcp",
            username: "683476fd9a2b31ef5b7643c3",
            credential: "LxaSTPlWMuANe/T1",
          },
        ],
      });
    }
  }
  closeConnection() {
    if (this.peer) {
      // Close the peer connection and stop tracks
      this.peer.getSenders().forEach((sender) => sender.track.stop());
      this.peer.close();
      console.log("Peer connection closed");
    }
  }

  async getAnswer(offer) {
    if (this.peer) {
      await this.peer.setRemoteDescription(offer);
      const ans = await this.peer.createAnswer();
      await this.peer.setLocalDescription(new RTCSessionDescription(ans));
      return ans;
    }
  }

  async setLocalDescription(ans) {
    if (this.peer) {
      await this.peer.setRemoteDescription(new RTCSessionDescription(ans));
    }
  }

  async getOffer() {
    if (this.peer) {
      const offer = await this.peer.createOffer();
      await this.peer.setLocalDescription(new RTCSessionDescription(offer));
      return offer;
    }
  }
  // updateMediaTracks(stream, cameraEnabled) {
  //   const videoTrack = stream.getVideoTracks()[0];

  //   if (videoTrack) {
  //     // If camera is disabled, mute the video track
  //     videoTrack.enabled = cameraEnabled;

  //     // Replace the video track in the peer connection with the updated state
  //     this.peer.getSenders().forEach((sender) => {
  //       if (sender.track.kind === "video") {
  //         sender.replaceTrack(videoTrack);
  //       }
  //     });
  //   }
  // }
  updateMediaTracks(stream, cameraEnabled) {
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = cameraEnabled; // Toggle the local state
      this.peer.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === "video") {
          sender.replaceTrack(videoTrack); // Replace the track in the peer connection
        }
      });
    }
  }

  updateAudioTrack(stream, micEnabled) {
    const audioTrack = stream.getAudioTracks()[0];

    if (audioTrack) {
      // If mic is disabled, mute the audio track
      audioTrack.enabled = micEnabled;

      // Replace the audio track in the peer connection with the updated state
      this.peer.getSenders().forEach((sender) => {
        if (sender.track.kind === "audio") {
          sender.replaceTrack(audioTrack);
        }
      });
    }
  }
}

export default new PeerService();

