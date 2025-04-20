import express from "express";
import { Server } from "socket.io";
import cors from "cors";
const io = new Server(3001, {
  cors: true,
});
const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/movement/:direction", (req, res) => {
  const { direction } = req.body;
  console.log(`Received movement command: ${direction}`);
  // Perform actions for movement
  res.status(200).send({ message: `${direction} command executed` });
});
const emailToSocketIdMap = new Map();
const socketidToEmailMap = new Map();
// const express = require('express');
io.on("connection", (socket) => {
  console.log(`Socket Connected`, socket.id);
  socket.on("room:join", (data) => {
    const { email, room } = data;
    emailToSocketIdMap.set(email, socket.id);
    socketidToEmailMap.set(socket.id, email);
    io.to(room).emit("user:joined", { email, id: socket.id });
    socket.join(room);
    io.to(socket.id).emit("room:join", data);
  });

  socket.on("user:call", ({ to, offer }) => {
    io.to(to).emit("incomming:call", { from: socket.id, offer });
  });

  socket.on("call:accepted", ({ to, ans }) => {
    io.to(to).emit("call:accepted", { from: socket.id, ans });
  });

  socket.on("peer:nego:needed", ({ to, offer }) => {
    console.log("peer:nego:needed", offer);
    io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
  });

  socket.on("peer:nego:done", ({ to, ans }) => {
    console.log("peer:nego:done", ans);
    io.to(to).emit("peer:nego:final", { from: socket.id, ans });
  });
  socket.on("call:ended", ({ to }) => {
    io.to(to).emit("call:ended");
    console.log(`Call ended with ${to}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    // Optionally notify others about the disconnection
    io.emit("user:disconnected", { id: socket.id });
  });
  // Socket.io event handling for camera toggle
  socket.on("camera:toggled", ({ to, cameraOn }) => {
    socket.to(to).emit("camera:toggled", { cameraOn });
  });
  socket.on("mic:muted", ({ to }) => {
    console.log(`${socket.id} has muted their microphone`);
    io.to(to).emit("mic:muted", { from: socket.id });
  });

  // Handle mic unmuted event
  socket.on("mic:unmuted", ({ to }) => {
    console.log(`${socket.id} has unmuted their microphone`);
    io.to(to).emit("mic:unmuted", { from: socket.id });
  });
});
app.listen(3002, () => console.log("Server running on port 3002"));
