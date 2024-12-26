import { Socket } from "socket.io";
import axios from "axios";
import xml2js from "xml2js";
import Redis from "ioredis";

// Define interfaces for the data structure
interface RTMPStatsResponse {
  rtmp: {
    nginx_version: string;
    nginx_rtmp_version: string;
    uptime: string;
    server: {
      application: Application[];
    };
  };
}

interface Application {
  name: string;
  live: LiveStream;
}

interface LiveStream {
  nclients: number;
  stream: Stream[];
}

interface Stream {
  name: string;
  time: number;
  bytes_in: number;
  bytes_out: number;
  client: number;
  meta: Meta;
}

interface Meta {
  video: VideoMeta;
  audio: AudioMeta;
}

interface VideoMeta {
  width: number;
  height: number;
  frame_rate: number;
  codec: string;
}

interface AudioMeta {
  codec: string;
  channels: number;
  sample_rate: number;
}

const rtmpStatsUrl = "http://localhost:8888/stat"; // RTMP stats URL

export class RTMPStats {
  private socket: Socket;
  private redis: Redis;
  private viewerCounts: Map<string, number> = new Map(); // Track viewers per stream

  constructor(socket: Socket) {
    this.socket = socket;
    this.redis = new Redis({ host: "localhost", port: 6379 });
    this.startFetchingStats();
    this.trackViewers();
  }

  private trackViewers() {
    this.socket.on("startViewing", (streamName: string) => {
      const currentCount = this.viewerCounts.get(streamName) || 0;
      this.viewerCounts.set(streamName, currentCount + 1);
    });

    this.socket.on("stopViewing", (streamName: string) => {
      const currentCount = this.viewerCounts.get(streamName) || 1;
      this.viewerCounts.set(streamName, Math.max(0, currentCount - 1));
    });
  }

  private startFetchingStats() {
    setInterval(async () => {
      try {
        const { data } = await axios.get(rtmpStatsUrl);
        const parsedData = await this.parseXML(data);

        await this.storeStreamMetrics(parsedData);

        for (const app of parsedData.rtmp.server.application) {
          if (app.name === "live") {
            const streams = Array.isArray(app.live.stream) ? app.live.stream : [app.live.stream];
            for (const stream of streams) {
              const streamData = await this.getStreamData(stream.name);
              this.socket.emit("streamChartData", streamData); // Emit data for real-time charting
            }
          }
        }
      } catch (err) {
        console.error("Error fetching RTMP stats:", err);
      }
    }, 60000); // Fetch stats every minute
  }

  private async parseXML(xml: string): Promise<RTMPStatsResponse> {
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xml);
    return this.transformData(result);
  }

  private transformData(data: any): RTMPStatsResponse {
    const applications = Array.isArray(data.rtmp.server.application)
      ? data.rtmp.server.application
      : [data.rtmp.server.application];

    return {
      rtmp: {
        nginx_version: data.rtmp.nginx_version,
        nginx_rtmp_version: data.rtmp.nginx_rtmp_version,
        uptime: data.rtmp.uptime,
        server: {
          application: applications.map((app:Application) => this.processApplication(app)),
        },
      },
    };
  }

  private processApplication(app: any): Application {
    const streams = Array.isArray(app.live.stream) ? app.live.stream : [app.live.stream];
    return {
      name: app.name,
      live: {
        nclients: app.live.nclients,
        stream: streams.map((stream:Stream) => this.processStream(stream)),
      },
    };
  }

  private processStream(stream: any): Stream {

    return {
      name: stream.name,
      time: stream.time,
      bytes_in: stream.bytes_in,
      bytes_out: stream.bytes_out,
      client: Array.isArray(stream.client) ? stream.client.length : 0,
      meta: stream.meta,
    };
  }

  private async storeStreamMetrics(parsedData: RTMPStatsResponse) {
    const applications = parsedData.rtmp.server.application;
    const timestamp = Math.floor(Date.now() / 60000) * 60000; // Current minute timestamp
  
    for (const app of applications) {
      if (app.name === "live") {
        for (const stream of app.live.stream) {
          const streamKey = `stream:${stream.name}`;
          const fps = parseFloat(`${stream.meta.video.frame_rate}`) || 0;
          const bytesIn = stream.bytes_in || 0;
          const viewCount = this.viewerCounts.get(stream.name) || 0;
          const bitrate = bytesIn > 0 && stream.time > 0 ? (bytesIn * 8) / stream.time : 0;
  
          const newData = {
            timestamp: timestamp,
            time: stream.time,
            fps,
            bytes_in: bytesIn,
            viewCount,
            bitrate,
            meta: stream.meta,
            client: stream.client
          };
  
          // Check if the entry with the same timestamp already exists
          const existingData = await this.redis.zscore(streamKey, timestamp);
  
          if (!existingData) {
            // If no entry exists, add it
            await this.redis.zadd(streamKey, timestamp, JSON.stringify(newData));
          } else {
            // Optionally update the existing entry if needed
            await this.redis.zadd(streamKey, timestamp, JSON.stringify(newData));
          }
  
          // Remove data older than 30 minutes
          await this.redis.zremrangebyscore(streamKey, "-inf", timestamp - 30 * 60 * 1000);
        }
      }
    }
  }
  

  public async getStreamData(streamName: string): Promise<any[]> {
    const streamKey = `stream:${streamName}`;
    const currentTime = Math.floor(Date.now() / 60000) * 60000;
    const thirtyMinutesAgo = currentTime - 30 * 60 * 1000;

    const data = await this.redis.zrangebyscore(streamKey, thirtyMinutesAgo, "+inf");
    const parsedData = data.map((entry) => JSON.parse(entry));
    return parsedData.slice(-10).map((metrics) => ({
      timestamp: new Date(metrics.time).toLocaleTimeString(),
      time: metrics.time,
      fps: metrics.fps,
      bytes_in: metrics.bytes_in,
      viewCount: metrics.viewCount,
      bitrate: metrics.bitrate,
      meta:metrics.meta,
      client:metrics.client
    }));
  }
}
