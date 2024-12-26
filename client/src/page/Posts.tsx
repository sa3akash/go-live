import React, { useEffect } from "react";

const Posts = () => {
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("http://localhost:8888/stat");
        const textData = await response.text();

        // Parse the XML response
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(textData, "application/xml");

        // Locate the specific stream by key
        const streamNode = Array.from(xmlDoc.getElementsByTagName("stream"));
        console.log(streamNode);
      } catch (error) {
        console.error("Failed to fetch stream stats:", error);
      }
    };

    fetchStats();
  }, []);

  return <div>Posts</div>;
};

export default Posts;
