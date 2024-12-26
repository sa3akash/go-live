import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { SocketContext, SocketContextType } from "../hooks/useSocket";

const GoLive = () => {
  const [devices, setDevices] = useState<{ video: MediaDeviceInfo[], audio: MediaDeviceInfo[] }>({ video: [], audio: [] });
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string | undefined>(undefined);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string | undefined>(undefined);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  
  const { socket } = useContext(SocketContext) as SocketContextType

  const startStreaming = async (videoDeviceId?: string, audioDeviceId?: string, isScreenShare = false) => {
    if (!videoRef.current) return;

    try {
      let newStream: MediaStream;

      if (isScreenShare) {
        newStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      } else {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
          audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
        });
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      streamRef.current = newStream;
      videoRef.current.srcObject = newStream;
      videoRef.current.muted = true;
      videoRef.current.play();

      startMediaRecorder(newStream);
      setIsLive(true); // Set live state to true
    } catch (err) {
      console.error("Error starting streaming:", err);
    }
  };

  const stopStreaming = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setIsLive(false);
    // Emit the stop event to the server
    if (socket) {
      socket.emit("stop-stream");
    }
  },[socket]);

  const startMediaRecorder = (stream: MediaStream) => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    mediaRecorderRef.current = new MediaRecorder(stream, {
      mimeType: "video/webm; codecs=vp8,opus",
    });

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        sendToRTMP(event.data);
      }
    };

    mediaRecorderRef.current.start(1000); // Send data every second
  };

  const sendToRTMP = (blob: Blob) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const byteArray = new Uint8Array(arrayBuffer);

      if (socket) {
        socket.emit("stream", byteArray);
      }
    };
    reader.readAsArrayBuffer(blob);
  };

  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const switchCamera = async () => {
    if (isMobile && devices.video.length > 1) {
      const currentIndex = devices.video.findIndex((device) => device.deviceId === selectedVideoDeviceId);
      const nextIndex = (currentIndex + 1) % devices.video.length;
      const newDeviceId = devices.video[nextIndex].deviceId;

      setSelectedVideoDeviceId(newDeviceId);
      await startStreaming(newDeviceId, selectedAudioDeviceId, isScreenSharing);
    }
  };

  const toggleScreenShare = async () => {
    setIsScreenSharing((prev) => !prev);
    await startStreaming(selectedVideoDeviceId, selectedAudioDeviceId, !isScreenSharing);
  };

  const fetchDevices = async () => {
    const allDevices = await navigator.mediaDevices.enumerateDevices();
    setDevices({
      video: allDevices.filter(device => device.kind === "videoinput"),
      audio: allDevices.filter(device => device.kind === "audioinput")
    });
  };

  useEffect(() => {
    fetchDevices();

    return () => {
      stopStreaming();
    };
  }, [stopStreaming]);


  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-gray-100 rounded-lg shadow-md">
      <div className="flex gap-2">
        {!isLive ? (
          <button onClick={() => startStreaming(selectedVideoDeviceId, selectedAudioDeviceId)} className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-500">
            Go Live
          </button>
        ) : (
          <button onClick={stopStreaming} className="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-500">
            Stop Live
          </button>
        )}
        <button onClick={toggleMute} className="px-4 py-2 text-white bg-gray-600 rounded hover:bg-gray-500">
          {isMuted ? "Unmute" : "Mute"}
        </button>
        <button onClick={toggleScreenShare} className="px-4 py-2 text-white bg-yellow-600 rounded hover:bg-yellow-500">
          {isScreenSharing ? "Stop Screen Share" : "Share Screen"}
        </button>
      </div>
      <div className="flex gap-2 w-full mt-2">
        {isMobile ? (
          <button onClick={switchCamera} className="px-4 py-2 text-white bg-purple-600 rounded hover:bg-purple-500">
            Switch Camera
          </button>
        ) : (
          <>
            <select
              value={selectedVideoDeviceId || ""}
              onChange={(e) => setSelectedVideoDeviceId(e.target.value)}
              className="px-2 py-1 border rounded w-full bg-black"
            >
              {devices.video.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${device.deviceId}`}
                </option>
              ))}
            </select>
            <select
              value={selectedAudioDeviceId || ""}
              onChange={(e) => setSelectedAudioDeviceId(e.target.value)}
              className="px-2 py-1 border rounded w-full bg-black"
            >
              {devices.audio.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId}`}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
      <video ref={videoRef} autoPlay muted className="mt-4 w-full h-auto rounded shadow-md"></video>
    </div>
  );
};

export default GoLive;
