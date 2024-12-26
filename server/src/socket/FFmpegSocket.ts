import { Socket } from "socket.io";
import ffmpeg from "fluent-ffmpeg";
import { PassThrough } from "stream";
import { User } from "../model/User";

export const ffmpegSocket = (socket: Socket) => {
  ffmpeg.setFfmpegPath(`${global.appRoot}/bin/ffmpeg.exe`); // Replace with actual path

  let command: any;
  const inputStream = new PassThrough();

  socket.on("stream", async (data: Uint8Array) => {
    const id = socket.authId;
    const user = await User.findById(id);
    if (!user) return;

    const streamKey = user.streamKey;

    if (!command) {
      command = ffmpeg()
        .input(inputStream) // Use the input stream from the Writable
        .inputFormat("webm") // Ensure this matches the format being sent
        .videoCodec("libx264") // Use a video codec for encoding
        .audioCodec("aac") // Use an audio codec for encoding
        .format("flv") // The format that is compatible with RTMP
        .output(`rtmp://localhost:2323/live/${streamKey}`) // Output to RTMP server
        .outputOptions([
          "-preset veryfast",
          "-b:v 2500k", // Video bitrate
          "-b:a 128k", // Audio bitrate
          "-g 30", // Keyframe interval
          "-r 30", // Frame rate
          // "-report" // This will create a report file
        ])
        .on("start", () => {
          console.log("FFmpeg process started");
        })
        .on("error", (err) => {
          // Only log the error if it is not from stopping the stream
          if (!err.message.includes("SIGINT")) {
            console.error("FFmpeg error:", err.message);
          }
          command = null; // Reset command on error
        })
        .on("end", () => {
          console.log("FFmpeg process ended");
          command = null; // Reset command when finished
        });

      // Start the FFmpeg process
      command.run();
    }

    // Write incoming data to the FFmpeg input stream
    inputStream.write(Buffer.from(data));
  });

  socket.on("stop-stream", () => {
    if (command) {
      command.on("end", () => {
        console.log("FFmpeg process ended gracefully after stop-stream");
        command = null; // Reset command reference
      });

      command.kill("SIGINT"); // Gracefully stop the FFmpeg process
      // console.log("Stream stopped");
    }
  });

  socket.on("disconnect", () => {
    console.log("disconnected=", socket.id);
    // Clean up on disconnect
    if (command) {
      command.kill("SIGINT"); // Ensure the FFmpeg process stops
      command = null; // Reset command reference
    }
  });
};
