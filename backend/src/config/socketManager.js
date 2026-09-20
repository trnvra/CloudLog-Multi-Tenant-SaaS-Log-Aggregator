/**
 * Singleton accessor for the Socket.io server instance.
 *
 * Why a separate module?
 * ──────────────────────
 * server.js creates the io instance during bootstrap, but the worker
 * (which runs in the same process) needs to emit events too.
 * A direct require("./server") from the worker would create a circular
 * dependency.  This tiny module breaks that cycle — server.js calls
 * setIO() once, and any module can call getIO() to broadcast.
 */

let io = null;

const setIO = (ioInstance) => {
  io = ioInstance;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialised — call setIO() first");
  }
  return io;
};

module.exports = { setIO, getIO };
