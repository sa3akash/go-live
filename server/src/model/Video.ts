import mongoose from "mongoose";

const videoSchema = new mongoose.Schema({
  name: String,
  hlsUrl: [String],
  thumbnails: [String],
  size: Number,
  duration: Number,
  resolution: String,
  codec: String,
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
});

export const Video = mongoose.model("Video", videoSchema);
