import Bull from "bull";
import fs from "fs";
import path from "path";
import { Video } from "../model/Video";
import ffmpeg from "fluent-ffmpeg";

// Define the shape of the job data
interface VideoJobData {
  name: string;
  videoPath: string;
}

// Create a Bull queue with type safety
export const videoQueue = new Bull<VideoJobData>("videoQueue", {
  redis: {
    host: "127.0.0.1", // Your Redis host
    port: 6379, // Your Redis port
  },
});


videoQueue.on("completed", async (job) => {
  console.log(`Job completed with result: ${job?.id}`);
  await job.remove(); // Remove job from the queue after completion
  console.log(`Job ${job.id} removed from the queue.`);
});

// Handle job failure
videoQueue.on("failed", async (job, err) => {
  await job.remove(); // Remove job from the queue after failure
  console.log(`Job ${job?.id} removed from the queue.`);
});

// Process video jobs
videoQueue.process(async (job) => {
  ffmpeg.setFfmpegPath(`${global.appRoot}/bin/ffmpeg.exe`); // Replace with actual path
  ffmpeg.setFfprobePath(`${global.appRoot}/bin/ffprobe.exe`);

  console.log('Job Processing...');

  const { name, videoPath } = job.data;

  // Save video metadata to MongoDB
  const video = new Video({
    name,
    hlsUrl: [],
    thumbnails: [],
    size: 0,
    duration: 0,
    resolution: "",
    codec: "",
  });

  const originalVideoPath = path.join(
    global.appRoot,
    "recorded",
    path.basename(videoPath)
  );
  const thumbnailDir = path.join(
    global.appRoot,
    "public",
    "thumbnails",
    video._id.toString()
  );
  const hlsDir = path.join(
    global.appRoot,
    "public",
    "hls",
    video._id.toString()
  );

  // Ensure thumbnail and HLS directories exist
  fs.mkdirSync(thumbnailDir, { recursive: true });
  fs.mkdirSync(hlsDir, { recursive: true });

  if(!fs.existsSync(originalVideoPath)) {
    console.log("Original video not found:", originalVideoPath);
    return;
  }

  // Get video metadata
  return new Promise<void>((resolve, reject) => {
    ffmpeg.ffprobe(originalVideoPath, async (err, metadata) => {
      if (err) {
        console.error("Error getting video metadata:", err);
        return reject(new Error("Error processing video"));
      }

      const videoStream = metadata.streams.find(
        (stream) => stream.codec_type === "video"
      );

      if (!videoStream) {
        console.error("No video stream found in metadata.");
        return reject(new Error("No video stream found in metadata"));
      }

      const videoSize = metadata.format.size;
      const bit_rate = metadata.format.bit_rate;
      const duration = parseFloat(`{metadata.format.duration}`) || 0;
      const resolution = `${videoStream.width}x${videoStream.height}`;
      const codec = videoStream.codec_name;

      // Generate thumbnails
      const timestamps = Array.from({ length: 4 }, () =>
        (Math.random() * duration).toFixed(2)
      );
      const thumbnailPaths: string[] = [];

      const thumbnailName = `${name}-${video._id}-${resolution}`;

      for (const timestamp of timestamps) {
        const thumbnailPath = path.join(
          thumbnailDir,
          `${thumbnailName}_thumbnail_${timestamp}.jpg`
        );
        thumbnailPaths.push(thumbnailPath);

        await new Promise<void>((thumbResolve, thumbReject) => {
          ffmpeg(originalVideoPath)
            .on("end", () => {
              thumbResolve();
            })
            .on("error", (error) => {
              console.error("Error generating thumbnail:", error);
              thumbReject(error);
            })
            .screenshots({
              timestamps: [timestamp],
              filename: path.basename(thumbnailPath),
              folder: thumbnailDir,
            });
        });
      }

      // Determine HLS variants based on original resolution
      const getHeight = videoStream.height || 360;
      const resolutions = heightToResolutions[getHeight];

      const hlsName = `${name}-${Date.now()}`;

      const hlsPaths: string[] = [];

      // Generate HLS output for each resolution
      const hlsPromises = resolutions.map(({ resolution, bitrate }) => {
        const hlsVariantPath = path.join( hlsDir, `${hlsName}_${resolution}.m3u8` );
        return new Promise<void>((hlsResolve, hlsReject) => {
          ffmpeg(originalVideoPath)
            .outputOptions([
              `-c:a aac`,
              `-b:a 128k`,
              `-c:v libx264`,
              `-b:v ${bitrate}`,
              `-f hls`,
              `-hls_time 5`,
              `-hls_list_size 0`,
              `-hls_segment_filename ${path.join(
                hlsDir,
                `${hlsName}_${resolution}_%03d.ts`
              )}`,
            ])
            .output(hlsVariantPath)
            .on("end", () => {
              hlsPaths.push(
                `http://localhost:5555/hls/${video._id}/${hlsName}_${resolution}.m3u8`
              );
              hlsResolve();
            })
            .on("error", hlsReject)
            .run();
        });
      });

      // After all HLS files are created, create a master playlist
      await Promise.all(hlsPromises);

      const masterPlaylist = [
        '#EXTM3U', // Playlist header
        '#EXT-X-VERSION:3', // Version of the HLS protocol
        ...hlsPaths.map((hlsPath, index) => {
          const { resolution, bitrate } = resolutions[index]; // Get the associated resolution and bitrate
          return `#EXT-X-STREAM-INF:BANDWIDTH=${bitrate},RESOLUTION=${resolution}\n${hlsPath}`;
        })
      ].join("\n");

      // Save master playlist to a file
      const masterPlaylistPath = path.join(hlsDir, `${hlsName}_index.m3u8`);
      fs.writeFileSync(masterPlaylistPath, masterPlaylist);

      // Add the master playlist URL to the video object
      video.hlsUrl = [
        ...hlsPaths,
        `http://localhost:5555/hls/${video._id}/${hlsName}_index.m3u8`,
      ];

      // Save video metadata to MongoDB
      await video.save();

      if (fs.existsSync(originalVideoPath)) {
        fs.unlinkSync(originalVideoPath);
      }

      console.log(`Job Processed ${name}: HLS master playlist created.`);
      resolve();
    });
  });
});

// Define the resolutions and bitrates based on the original video height
const heightToResolutions: Record<
  number,
  { resolution: string; bitrate: number }[]
> = {
  2160: [
    // { resolution: "2160p", bitrate: 20000000 },
    // { resolution: "1440p", bitrate: 10000000 },
    // { resolution: "1080p", bitrate: 4000000 },
    { resolution: "720p", bitrate: 2500000 },
    { resolution: "480p", bitrate: 1000000 },
    { resolution: "360p", bitrate: 750000 },
    { resolution: "240p", bitrate: 400000 },
  ],
  1440: [
    // { resolution: "1440p", bitrate: 10000000 },
    // { resolution: "1080p", bitrate: 4000000 },
    { resolution: "720p", bitrate: 2500000 },
    { resolution: "480p", bitrate: 1000000 },
    { resolution: "360p", bitrate: 750000 },
    { resolution: "240p", bitrate: 400000 },
  ],
  1080: [
    // { resolution: "1080p", bitrate: 4000000 },
    { resolution: "720p", bitrate: 2500000 },
    { resolution: "480p", bitrate: 1000000 },
    { resolution: "360p", bitrate: 750000 },
    { resolution: "240p", bitrate: 400000 },
  ],
  720: [
    { resolution: "720p", bitrate: 2500000 },
    { resolution: "480p", bitrate: 1000000 },
    { resolution: "360p", bitrate: 750000 },
    { resolution: "240p", bitrate: 400000 },
  ],
  480: [
    { resolution: "480p", bitrate: 1000000 },
    { resolution: "360p", bitrate: 750000 },
    { resolution: "240p", bitrate: 400000 },
  ],
  360: [
    { resolution: "360p", bitrate: 750000 },
    { resolution: "240p", bitrate: 400000 },
  ],
};
