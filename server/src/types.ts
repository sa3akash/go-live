// types.ts
export interface VideoStats {
    codec: string;
    bitrate: number;
    size: string;
    fps: number;
    profile: string;
}

export interface AudioStats {
    codec: string;
    bitrate: number;
    frequency: number;
    channels: number;
    profile: string;
}

export interface TrafficStats {
    inBytes: number;
    outBytes: number;
    inBitsPerSec: number;
    outBitsPerSec: number;
}

export interface ClientData {
    address: string;
    state: string;
    time: number;
}

export interface StreamData {
    streamKey: string;
    viewCount: number;
    video: VideoStats;
    audio: AudioStats;
    traffic: TrafficStats;
    clients: ClientData[];
    startTime:number
}





// import axios from "axios";
// import xml2js from "xml2js";
// import {
//   StreamData,
//   VideoStats,
//   AudioStats,
//   TrafficStats,
//   ClientData,
// } from "./types";
// const RTMP_STATS_URL = "http://localhost:8888/stat";

// const parseRTMPStats = async (): Promise<StreamData[]> => {
//   try {
//     const response = await axios.get(RTMP_STATS_URL);
//     // Log the raw XML response
//     const parsedData = await xml2js.parseStringPromise(response.data);

//     // console.log(parsedData.rtmp?.server?.[0]?.application?.flatMap((app: any) => app.live?.flatMap((live: any) => live.stream?.map((stream: any) => stream))))

//     const streams: StreamData[] =
//       parsedData.rtmp?.server?.[0]?.application?.flatMap((app: any) =>
//         app.live?.flatMap((live: any) =>
//           live.stream?.map((stream: any) => {
//             const videoMeta = stream.meta?.[0]?.video?.[0] || {};
//             const audioMeta = stream.meta?.[0]?.audio?.[0] || {};
//             const clients = stream.client || [];

//             const videoStats: VideoStats = {
//               codec: videoMeta.codec?.[0] || "unknown",
//               bitrate: Number(stream.bw_video?.[0] || 0),
//               size: `${videoMeta.width?.[0] || 0}x${
//                 videoMeta.height?.[0] || 0
//               }`,
//               fps: Number(videoMeta.frame_rate?.[0] || 0),
//               profile: videoMeta.profile?.[0] || "unknown",
//             };

//             const audioStats: AudioStats = {
//               codec: audioMeta.codec?.[0] || "unknown",
//               bitrate: Number(stream.bw_audio?.[0] || 0),
//               frequency: Number(audioMeta.sample_rate?.[0] || 0),
//               channels: Number(audioMeta.channels?.[0] || 0),
//               profile: audioMeta.profile?.[0] || "unknown",
//             };

//             const trafficStats: TrafficStats = {
//               inBytes: Number(stream.bytes_in?.[0] || 0),
//               outBytes: Number(stream.bytes_out?.[0] || 0),
//               inBitsPerSec: Number(stream.bw_in?.[0] || 0),
//               outBitsPerSec: Number(stream.bw_out?.[0] || 0),
//             };

//             const clientData: ClientData[] =
//               clients.map((client: any) => ({
//                 address: client.address?.[0] || "unknown",
//                 state: client.state?.[0] || "unknown", // assuming 'state' exists in client
//                 time: Number(client.time?.[0] || 0),
//                 flashver: client.flashver?.[0] || "unknown",
//               })) || [];

//             return {
//               streamKey: stream?.name?.[0] || "unknown",
//               viewCount: stream?.nclients ? stream?.nclients[0] : 0,
//               video: videoStats,
//               audio: audioStats,
//               traffic: trafficStats,
//               clients: clientData,
//               startTime: Number(stream.time?.[0]) || 0, // If time represents start time
//             } as StreamData;
//           })
//         )
//       );

//     return streams[0] !== undefined ? streams : [];
//   } catch (error) {
//     return [];
//   }
// };