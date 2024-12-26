import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface VideoPlayerProps {
    streamUrl: string; // URL of the HLS stream
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ streamUrl }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (!videoRef.current) return;

        const hls = new Hls();
        
        // Load the stream
        hls.loadSource(streamUrl);
        hls.attachMedia(videoRef.current);
        
        // Play the video
        videoRef.current.play();

        // Cleanup
        return () => {
            hls.destroy();
        };
    }, [streamUrl]);

    return (
        <div>
            <video
                ref={videoRef}
                controls
                style={{ width: '100%', height: 'auto' }}
            />
        </div>
    );
};

export default VideoPlayer;


// import React, { useRef, useEffect } from "react";
// import Hls from "hls.js";
// interface VideoPlayerProps {
//     streamUrl: string; // URL of the HLS stream
// }

// const VideoPlayer = ({ streamUrl }:VideoPlayerProps) => {
//     const videoRef = useRef<HTMLVideoElement>(null);

//   useEffect(() => {
//     if (Hls.isSupported()) {
//       const hls = new Hls();
//       hls.loadSource(streamUrl);
//       hls.attachMedia(videoRef.current!);

//       hls.on(Hls.Events.MANIFEST_PARSED, () => {
//         videoRef.current?.play();
//       });

//       hls.on(Hls.Events.ERROR, (event, data) => {
//         console.error("HLS error:", data);
//       });

//       return () => {
//         hls.destroy();
//       };
//     } else if (videoRef.current?.canPlayType("application/vnd.apple.mpegurl")) {
//       videoRef.current.src = streamUrl;
//       videoRef.current.addEventListener("loadedmetadata", () => {
//         videoRef.current?.play();
//       });
//     }
//   }, [streamUrl]);

//   return (
//     <video
//       ref={videoRef}
//       controls
//       style={{ width: "100%", maxWidth: "500px" }}
//     />
//   );
// };

// export default VideoPlayer;
