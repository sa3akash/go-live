interface ClientData {
  address: string;
  state: string;
  time: number;
}

export interface StreamData {
  streamKey: string;
  viewCount: number;
  video: {
    codec: string;
    bitrate: number;
    size: string;
    fps: number;
    profile: string;
  };
  audio: {
    codec: string;
    bitrate: number;
    frequency: number;
    channels: number;
    profile: string;
  };
  traffic: {
    inBytes: number;
    outBytes: number;
    inBitsPerSec: number;
    outBitsPerSec: number;
  };
  clients: ClientData[];
}
