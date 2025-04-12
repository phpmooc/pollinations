import { useEffect, useState } from 'react';

export function useFeedLoader(onNewImage, setLastImage, mode) {
  const [imagesGenerated, setImagesGenerated] = useState(estimateGeneratedImages());

  useEffect(() => {
    let eventSource = null;

    const getEventSource = () => {
      const source = new EventSource("https://image.pollinations.ai/feed");
      source.onmessage = evt => {
        const data = JSON.parse(evt.data);
        setImagesGenerated(no => no + 1);
        
        // Dispatch custom event for counter increment
        window.dispatchEvent(new CustomEvent('image-received', { 
          detail: { image: data } 
        }));
        
        // lastServerLoad = data["concurrentRequests"];
        if (data["status"] === "end_generating")
          setLastImage(data);

        const urlParams = new URLSearchParams(window.location.search);
        const nsfwParam = urlParams.get('nsfw');

        if (data["imageURL"]) {
          onNewImage(data);
        }
      };
      source.onerror = async () => {
        await new Promise(r => setTimeout(r, 1000));
        // Ensure we only try to reconnect if the mode is still 'image'
        if (eventSource) {
          eventSource.close();
        }
        if (mode === 'image') {
          eventSource = getEventSource(); // Attempt to reconnect
        }
      };
      return source;
    };

    if (mode === 'image') {
      eventSource = getEventSource();
    }

    // Cleanup function: Close the connection if it exists when mode changes or component unmounts
    return () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null; // Clear the reference
      }
    };
  }, [mode, onNewImage, setLastImage]); // Add mode to dependency array

  return { imagesGenerated };
}

function estimateGeneratedImages() {
  const launchDate = 1738974161902;
  const now = Date.now();
  const differenceInSeconds = (now - launchDate) / 1000;
  const imagesGeneratedSinceLaunch = Math.round(differenceInSeconds * 23.78); // ~100,000 images per hour

  const imagesGeneratedCalculated = 117772000 + imagesGeneratedSinceLaunch;
  return imagesGeneratedCalculated;
}
