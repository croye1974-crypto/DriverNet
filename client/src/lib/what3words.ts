export interface What3WordsAddress {
  words: string;
  nearestPlace: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface What3WordsCoordinates {
  lat: number;
  lng: number;
}

/**
 * Convert GPS coordinates to a What3Words address
 * @param lat Latitude
 * @param lng Longitude
 * @returns What3Words address (e.g., "index.home.raft")
 */
export async function coordinatesToWords(
  lat: number,
  lng: number
): Promise<What3WordsAddress | null> {
  try {
    const response = await fetch("/api/what3words/coordinates-to-words", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ lat, lng }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("What3Words API error:", error);
      return null;
    }

    const data = await response.json();
    
    return {
      words: data.words,
      nearestPlace: data.nearestPlace,
      coordinates: {
        lat: data.coordinates.lat,
        lng: data.coordinates.lng,
      },
    };
  } catch (error) {
    console.error("Error converting coordinates to words:", error);
    return null;
  }
}

/**
 * Convert a What3Words address to GPS coordinates
 * @param words What3Words address (e.g., "index.home.raft")
 * @returns GPS coordinates
 */
export async function wordsToCoordinates(
  words: string
): Promise<What3WordsCoordinates | null> {
  try {
    const cleanWords = cleanWhat3Words(words);
    
    const response = await fetch("/api/what3words/words-to-coordinates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ words: cleanWords }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("What3Words API error:", error);
      return null;
    }

    const data = await response.json();
    
    return {
      lat: data.coordinates.lat,
      lng: data.coordinates.lng,
    };
  } catch (error) {
    console.error("Error converting words to coordinates:", error);
    return null;
  }
}

/**
 * Validate What3Words address format
 * @param words Potential What3Words address
 * @returns true if format is valid (word.word.word)
 */
export function isValidWhat3WordsFormat(words: string): boolean {
  // What3Words format: word.word.word
  // Each word is lowercase letters only
  const regex = /^[a-z]+\.[a-z]+\.[a-z]+$/;
  return regex.test(words);
}

/**
 * Format a What3Words address for display
 * @param words What3Words address
 * @returns Formatted address with slashes (///word.word.word)
 */
export function formatWhat3Words(words: string): string {
  return `///${words}`;
}

/**
 * Remove slashes from What3Words address
 * @param words What3Words address (may have ///)
 * @returns Clean address (word.word.word)
 */
export function cleanWhat3Words(words: string): string {
  return words.replace(/^\/+/, "");
}
