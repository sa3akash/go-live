// hooks/useStreamStats.ts
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { StreamData } from '../types';

const useStreamStats = () => {
  const [streamData, setStreamData] = useState<StreamData[]>([]);

  useEffect(() => {
    const socket: Socket = io('http://localhost:5555'); // Update if needed

    socket.on('streamStats', (data: StreamData[]) => {
      setStreamData(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return streamData;
};

export default useStreamStats;
