import React, { useEffect, useRef, useState } from "react";
import Client from "./Client";
import Editor from "./Editor";
import { initSocket } from "../Socket";
import { ACTIONS } from "../Actions";
import { useNavigate, useLocation, Navigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";

function EditorPage() {
  const [clients, setClients] = useState([]);
  const codeRef = useRef(null);

  const Location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();

  const socketRef = useRef(null);

  const handleErrors = (err) => {
    console.log("Error", err);
    toast.error("Socket connection failed, Try again later");
    navigate("/");
  };

  useEffect(() => {
    const init = async () => {
      const socket = await initSocket();
      socketRef.current = socket;

      socket.on("connect_error", handleErrors);
      socket.on("connect_failed", handleErrors);

      socket.emit(ACTIONS.JOIN, {
        roomId,
        username: Location.state?.username,
      });

      socket.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
        if (username !== Location.state?.username) {
          toast.success(`${username} joined the room.`);
        }
        setClients(clients);
        
        socket.emit(ACTIONS.SYNC_CODE, {
          code: codeRef.current,
          socketId,
        });
      });

      socket.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast.success(`${username} left the room`);
        setClients((prev) => prev.filter((client) => client.socketId !== socketId));
      });
    };

    init();

    return () => {
      const socket = socketRef.current;
      if (socket) {
        socket.disconnect();
        socket.off(ACTIONS.JOINED);
        socket.off(ACTIONS.DISCONNECTED);
      }
    };
  }, [Location.state?.username, navigate, roomId]);

  if (!Location.state) {
    return <Navigate to="/" />;
  }

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success(`Room ID is copied`);
    } catch (error) {
      console.log(error);
      toast.error("Unable to copy the Room ID");
    }
  };

  const leaveRoom = () => {
    navigate("/");
  };

  return (
    <div className="container-fluid vh-100">
      <div className="row h-100">
        <div className="col-md-2 bg-dark text-light d-flex flex-column h-100" style={{ boxShadow: "2px 0px 4px rgba(0, 0, 0, 0.1)" }}>
          <img src="/images/codecast.png" alt="Logo" className="img-fluid mx-auto" style={{ maxWidth: "150px", marginTop: "-43px" }} />
          <hr style={{ marginTop: "-3rem" }} />

          <div className="d-flex flex-column flex-grow-1 overflow-auto">
            <span className="mb-2">Members</span>
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>

          <hr />
          <div className="mt-auto">
            <button className="btn btn-success" onClick={copyRoomId}>Copy Room ID</button>
            <button className="btn btn-danger mt-2 mb-2 px-3 btn-block" onClick={leaveRoom}>Leave Room</button>
          </div>
        </div>

        <div className="col-md-10 text-light d-flex flex-column h-100">
          <Editor
            socketRef={socketRef}
            roomId={roomId}
            onCodeChange={(code) => {
              codeRef.current = code;
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default EditorPage;
