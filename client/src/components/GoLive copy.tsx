import React, { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const GoLive = ({ id }: { id: string }) => {
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const startStreaming = async () => {
    if (!videoRef.current) return;
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (streamRef.current) {
        // play video
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.muted = true;
        videoRef.current.play();

        mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
          mimeType: 'video/webm; codecs=vp8,opus',
        });

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            sendToRTMP(event.data);
          }
        };

        mediaRecorderRef.current.start(1000); // Send data every second
      }
    } catch (err) {
      console.log(err);
    }
  };

  const sendToRTMP = (blob: Blob) => {
    console.log("Sending to RTMP server:", blob);
    const reader = new FileReader();
    reader.onloadend = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const byteArray = new Uint8Array(arrayBuffer);

      if (socketRef.current) {
        socketRef.current.emit("stream", byteArray);
      }
    };
    reader.readAsArrayBuffer(blob);
  };

  const stopStreaming = () => {
    // Stop the MediaRecorder
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    // Stop all tracks of the media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Emit the stop event to the server
    if (socketRef.current) {
      socketRef.current.emit("stop-stream");
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    const socket: Socket = io("http://localhost:5555", {
      query: { authId: id },
    });

    socket.on("connect", () => {
      console.log("Connected to server");
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [id]);

  return (
    <div>
      <div className="flex flex-col gap-2">
        <button onClick={startStreaming}>Go Live</button>
        <button onClick={stopStreaming}>Cancel Live</button>
      </div>
      <video ref={videoRef} autoPlay muted></video>
    </div>
  );
};

export default GoLive;
