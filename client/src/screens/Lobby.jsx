import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";

const LobbyScreen = () => {
  const [email, setEmail] = useState("");
  const [room, setRoom] = useState("");
  const socket = useSocket();
  const navigate = useNavigate();

  const handleSubmitForm = useCallback(
    (e) => {
      e.preventDefault();
      socket.emit("room:join", { email, room });
    },
    [email, room, socket]
  );

  const handleJoinRoom = useCallback(
    (data) => {
      const { email, room } = data;
      navigate(`/room/${room}`);
    },
    [navigate]
  );

  // useEffect(() => {
  //   socket.on("room:join", handleJoinRoom);
  //   return () => {
  //     socket.off("room:join", handleJoinRoom);
  //   };
  // }, [socket, handleJoinRoom]);
  useEffect(() => {
    const handleRoomReset = () => {
      window.location.reload(); // Reload the page
    };

    socket.on("room:join", handleJoinRoom);
    socket.on("room:reset", handleRoomReset);

    return () => {
      socket.off("room:join", handleJoinRoom);
      socket.off("room:reset", handleRoomReset);
    };
  }, [socket, handleJoinRoom]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white shadow-2xl rounded-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-8">
          Lobby
        </h1>
        <form onSubmit={handleSubmitForm} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-bold text-left text-gray-700 mb-2"
            >
              Email ID:
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label
              htmlFor="room"
              className="block text-sm text-left font-bold text-gray-700 mb-2"
            >
              Room Number:
            </label>
            <input
              type="text"
              id="room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              placeholder="Enter room number"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
};

export default LobbyScreen;
