import React, { useCallback, useEffect, useState } from "react";
import { useSocket } from "../context/SocketProvider";
import peer from "../service/peer";
import { FiCamera, FiMic, FiPhone, FiMoreVertical } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const RoomPage = () => {
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setMyStream(stream); // Save the stream to state
      } catch (error) {
        console.error("Error accessing media devices:", error);
      }
    };

    startCamera();

    // Cleanup function to stop camera when the user leaves
    return () => {
      if (myStream) {
        myStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []); // Empty dependency array ensures it runs only on mount
  const [activeMovement, setActiveMovement] = useState(null);
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [isCallActive, setIsCallActive] = useState(false);
  const isNavigate = useNavigate();
  const [isReconnecting, setIsReconnecting] = useState(false); // New state
  // Handle when a user joins the room
  const handleConnectionStateChange = useCallback(() => {
    const connectionState =
      peer.peer.connectionState || peer.peer.iceConnectionState;
    console.log("Connection State:", connectionState);

    if (connectionState === "disconnected" || connectionState === "failed") {
      setIsReconnecting(true);

      // Wait for a timeout before navigating back
      setTimeout(() => {
        setIsReconnecting(false);
        handleCallEnded();
        isNavigate("/");
      }, 5000); // 5 seconds
    }
  }, [isNavigate()]);
  useEffect(() => {
    peer.peer.addEventListener(
      "connectionstatechange",
      handleConnectionStateChange
    );
    peer.peer.addEventListener(
      "iceconnectionstatechange",
      handleConnectionStateChange
    );

    return () => {
      peer.peer.removeEventListener(
        "connectionstatechange",
        handleConnectionStateChange
      );
      peer.peer.removeEventListener(
        "iceconnectionstatechange",
        handleConnectionStateChange
      );
    };
  }, [handleConnectionStateChange]);
  // useEffect(() => {
  //   // Disable video track on component mount
  //   if (myStream) {
  //     const videoTrack = myStream.getVideoTracks()[0];
  //     if (videoTrack) {
  //       videoTrack.enabled = false; // Ensure video is off
  //     }
  //   }
  // }, [myStream]);

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`);
    setRemoteSocketId(id);
  }, []);

  // Handle outgoing call to another user
  const handleCallUser = useCallback(async () => {
    setIsCallActive(true);
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true, // Capture audio
      video: true, // Capture video
    });
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
    setMyStream(stream);
  }, [remoteSocketId, socket]);

  // Handle incoming call from another user
  const handleIncommingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true, // Capture audio
        video: true, // Capture video
      });
      setMyStream(stream);
      console.log(`Incoming Call`, from, offer);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });// these are event names , enables communication between client and server
    },
    [socket]
  );

  // Send the local media stream to the peer connection

  const sendStreams = useCallback(() => {
    if (myStream) {
      for (const track of myStream.getTracks()) {
        peer.peer.addTrack(track, myStream); // Add track to peer connection
      }
    }
  }, [myStream]);

  // Handle when a call is accepted
  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      console.log("Call Accepted!");
      sendStreams();
    },
    [sendStreams]
  );

  // Handle negotiation needed (when media constraints change)
  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  // Handle incoming negotiation request
  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  // Handle final negotiation response
  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    // Add event listener to receive media tracks from the remote peer
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;
      console.log("GOT TRACKS!!");
      setRemoteStream(remoteStream[0]);
    });
  }, []);

  useEffect(() => {
    // Setup socket event listeners
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);
    socket.on("call:ended", handleCallEnded);

    // Clean up socket event listeners on unmount
    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
      socket.off("call:ended", handleCallEnded);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeedIncomming,
    handleNegoNeedFinal,
  ]);

  // Handle call disconnection
  const handleCallEnded = useCallback(() => {
    // Stop all tracks and reset streams
    myStream?.getTracks().forEach((track) => track.stop());
    setMyStream(null);
    setRemoteStream(null);
    console.log("Call ended");
    isNavigate("/");
  }, [myStream, isNavigate]);
  useEffect(() => {
    socket.on("call:ended", () => {
      // Navigate to the lobby and reload
      isNavigate("/");
      setTimeout(() => {
        window.location.reload();
      }, 100); // Adjust delay as needed
    });

    return () => {
      socket.off("call:ended"); // Clean up the listener
    };
  }, [socket, isNavigate]);

  const disconnectCall = useCallback(() => {
    // setIsCallActive(false);
    // Emit call ended event to notify the other user
    socket.emit("call:ended", { to: remoteSocketId });

    // Disconnect media streams
    peer.peer.close();
    // handleCallEnded();
    // setIsCallActive(false);
    // setMyStream(null);
    // setRemoteStream(null);
    // setRemoteSocketId(null);
    // setCameraOn(false); // Reset camera status (assumed default state)
    // setMicOn(false);
    // Reload the page to go back to the lobby
    isNavigate("/");
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }, [socket, remoteSocketId, handleCallEnded]);

  const toggleCamera = () => {
    if (myStream) {
      const videoTrack = myStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled; // Toggle video track state
        setCameraOn(videoTrack.enabled); // Update the UI state
        peer.updateMediaTracks(myStream, videoTrack.enabled); // Replace the track in the peer connection
      }
    }
  };

  const toggleMic = () => {
    if (myStream) {
      const audioTrack = myStream.getAudioTracks()[0];
      if (audioTrack) {
        // Toggle the enabled state of the audio track
        audioTrack.enabled = !audioTrack.enabled;
        setMicOn(audioTrack.enabled);

        // Update the peer connection with the new audio track state
        peer.updateAudioTrack(myStream, audioTrack.enabled);
      }
    }
  };
  // const handleMovement = async (direction) => {
  //   try {
  //     const response = await fetch(
  //       `http://localhost:3002/api/movement/${direction}`,
  //       {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify({ direction }),
  //       }
  //     );

  //     if (!response.ok) {
  //       throw new Error("Failed to send movement command");
  //     }

  //     console.log(`${direction} command sent successfully`);
  //   } catch (error) {
  //     console.error("Error sending movement command:", error);
  //   }
  // };
  const handleMovementStart = async (direction) => {
    try {
      const response = await fetch(
        `http://localhost:3002/api/movement/${direction}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ direction }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to send ${direction} command`);
      }

      console.log(`${direction} command sent successfully`);
    } catch (error) {
      console.error("Error sending movement command:", error);
    }
  };

  const handleMovementStop = async () => {
    try {
      const response = await fetch(`http://localhost:3002/api/movement/stop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to send stop command");
      }

      console.log("Stop command sent successfully");
    } catch (error) {
      console.error("Error sending stop command:", error);
    }
  };
  useEffect(() => {
    const handleKeyDown = (event) => {
      switch (event.key.toLowerCase()) {
        case "w":
          handleMovementStart("forward");
          break;
        case "a":
          handleMovementStart("left");
          break;
        case "d":
          handleMovementStart("right");
          break;
        case "t":
          handleMovementStart("up");
          break;
        case "y":
          handleMovementStart("down");
          break;
        default:
          // handleMovementStart("Stop");
          break;
      }
    };

    const handleKeyUp = (event) => {
      switch (event.key.toLowerCase()) {
        case "w":
        case "a":
        case "d":
        case "t":
        case "y":
          handleMovementStop();
          break;
        default:
          break;
      }
    };

    // Add event listeners
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Cleanup event listeners on component unmount
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []); // Empty dependency array ensures this runs once on mount

  // useEffect(() => {
  //   const handleKeyDown = (event) => {
  //     const directionMap = {
  //       w: "forward",
  //       a: "left",
  //       d: "right",
  //       t: "up",
  //       y: "down",
  //     };

  //     const direction = directionMap[event.key.toLowerCase()];

  //     if (direction && activeMovement !== direction) {
  //       setActiveMovement(direction);
  //       handleMovementStart(direction);
  //     }
  //   };

  //   const handleKeyUp = (event) => {
  //     const directionMap = {
  //       w: "forward",
  //       a: "left",
  //       d: "right",
  //       t: "up",
  //       y: "down",
  //     };

  //     const direction = directionMap[event.key.toLowerCase()];

  //     if (direction && activeMovement === direction) {
  //       setActiveMovement(null);
  //       handleMovementStop();
  //     }
  //   };

  //   window.addEventListener("keydown", handleKeyDown);
  //   window.addEventListener("keyup", handleKeyUp);

  //   return () => {
  //     window.removeEventListener("keydown", handleKeyDown);
  //     window.removeEventListener("keyup", handleKeyUp);
  //   };
  // }, [activeMovement]);
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="bg-white shadow-2xl rounded-xl w-full max-w-4xl flex flex-col">
        <div className="flex justify-between items-center bg-gray-100 p-4 rounded-t-xl">
          <h1 className="text-2xl font-bold text-gray-800">Room Page</h1>
          <div className="flex items-center space-x-4">
            <button
              className={`p-2 rounded-full ${
                cameraOn
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-gray-300 hover:bg-gray-400 text-gray-600"
              }`}
              onClick={toggleCamera}
            >
              <FiCamera size={18} />
            </button>
            <button
              className={`p-2 rounded-full ${
                micOn
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-gray-300 hover:bg-gray-400 text-gray-600"
              }`}
              onClick={toggleMic}
            >
              <FiMic size={18} />
            </button>
            <button className="p-2 rounded-full bg-gray-300 hover:bg-gray-400 text-gray-600">
              <FiPhone size={18} />
            </button>
            <button className="p-2 rounded-full bg-gray-300 hover:bg-gray-400 text-gray-600">
              <FiMoreVertical size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex justify-center items-center p-8">
          {myStream && (
            <div className="mr-4">
              <h2 className="text-lg font-medium text-gray-800 mb-2">
                My Stream
              </h2>
              <video
                autoPlay
                muted
                className="rounded-md shadow-lg"
                ref={(ref) => {
                  if (ref) {
                    ref.srcObject = myStream;
                  }
                }}
              />
            </div>
          )}

          {remoteStream && (
            <div>
              <h2 className="text-lg font-medium text-gray-800 mb-2">
                Remote Stream
              </h2>
              <video
                autoPlay
                className="rounded-md shadow-lg"
                ref={(ref) => {
                  if (ref) {
                    ref.srcObject = remoteStream;
                  }
                }}
              />
            </div>
          )}
        </div>

        <div className="flex justify-between items-center bg-gray-100 p-4 rounded-b-xl">
          <p className="text-gray-600">
            {remoteSocketId ? "Connected" : "No one in room"}
          </p>
          <div className="flex items-center space-x-4">
            {/* {myStream && (
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                onClick={sendStreams}
              >
                Send Stream
              </button>
            )} */}
            {remoteSocketId && (
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                onClick={handleCallUser}
              >
                CALL
              </button>
            )}
            {myStream && (
              <button
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
                onClick={disconnectCall}
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>

      {isCallActive && (
        <div className="fixed right-8 top-1/2 -translate-y-1/2 bg-white p-4 rounded-xl shadow-lg">
          <div className="grid grid-cols-3 gap-2 w-32">
            <div className="movementButtons space-x-2">
              <button
                onMouseDown={() => handleMovementStart("forward")}
                onMouseUp={handleMovementStop}
                onMouseLeave={handleMovementStop}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
              >
                Move Forward
              </button>
              <button
                onMouseDown={() => handleMovementStart("left")}
                onMouseUp={handleMovementStop}
                onMouseLeave={handleMovementStop}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
              >
                Move Left
              </button>
              <button
                onMouseDown={() => handleMovementStart("right")}
                onMouseUp={handleMovementStop}
                onMouseLeave={handleMovementStop}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md"
              >
                Move Right
              </button>
              <button
                onMouseDown={() => handleMovementStart("up")}
                onMouseUp={handleMovementStop}
                onMouseLeave={handleMovementStop}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md"
              >
                Move Up
              </button>
              <button
                onMouseDown={() => handleMovementStart("down")}
                onMouseUp={handleMovementStop}
                onMouseLeave={handleMovementStop}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
              >
                Move Down
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomPage;
