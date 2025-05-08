document.addEventListener('DOMContentLoaded', () => {
    const youtubeUrlInput = document.getElementById('youtubeUrl');
    const fetchButton = document.getElementById('fetchButton');
    const transcriptOutput = document.getElementById('transcriptOutput');
    const statusDiv = document.getElementById('status');

    fetchButton.addEventListener('click', async () => {
        const urlOrId = youtubeUrlInput.value.trim();
        if (!urlOrId) {
            statusDiv.textContent = 'Please enter a YouTube Video URL or ID.';
            statusDiv.className = 'error';
            transcriptOutput.textContent = '';
            return;
        }

        let videoId = extractVideoID(urlOrId);

        if (!videoId) {
            statusDiv.textContent = 'Invalid YouTube URL or ID format. Please use a valid YouTube video URL or just the 11-character video ID.';
            statusDiv.className = 'error';
            transcriptOutput.textContent = '';
            return;
        }

        statusDiv.textContent = 'Fetching transcript...';
        statusDiv.className = 'loading';
        transcriptOutput.textContent = ''; // Clear previous transcript

        try {
            const response = await fetch(`/api/get_transcript?videoId=${encodeURIComponent(videoId)}`);
            
            if (!response.ok) {
                // If the response is not OK, try to get more details from the body
                let errorBodyText = "Could not retrieve error body."; // Default if .text() fails
                try {
                    errorBodyText = await response.text(); // Get raw text of the error response
                } catch (e) {
                    console.error("Failed to read error response body:", e);
                }
                
                console.error("Server error response (raw):", errorBodyText); // Log raw response for debugging

                let errorMessage = `HTTP error! Status: ${response.status}. `;
                try {
                    // Attempt to parse the error body as JSON (if our Python server sent a JSON error)
                    const errorJson = JSON.parse(errorBodyText);
                    if (errorJson && errorJson.error) {
                        errorMessage += errorJson.error; // Use the specific error message from our API
                    } else {
                        // It was JSON but not the expected format
                        errorMessage += "Unexpected JSON error structure from server.";
                    }
                } catch (e) {
                    // It wasn't JSON, so it's likely an HTML error page from Vercel or plain text
                    // Take a snippet to avoid huge error messages in UI
                    const snippet = errorBodyText.substring(0, 200);
                    errorMessage += `Server returned non-JSON response: ${snippet}${errorBodyText.length > 200 ? "..." : ""}`;
                }
                throw new Error(errorMessage); // Throw an error to be caught by the outer catch block
            }

            // If response.ok, then proceed to parse JSON
            const data = await response.json(); // This is where "Unexpected token 'A'..." would happen if !response.ok and we didn't handle it above.

            if (data.error) { 
                // Handle cases where the server responds with 200 OK but includes an error in the JSON payload
                statusDiv.textContent = `Error: ${data.error}`;
                statusDiv.className = 'error';
                transcriptOutput.textContent = '';
            } else if (data.transcript && Array.isArray(data.transcript)) {
                if (data.transcript.length > 0) {
                    transcriptOutput.textContent = data.transcript.join('\n\n'); // Join snippets for readability
                    statusDiv.textContent = 'Transcript fetched successfully!';
                    statusDiv.className = '';
                } else {
                    transcriptOutput.textContent = 'Transcript is empty.';
                    statusDiv.textContent = 'Transcript fetched, but it is empty.';
                    statusDiv.className = '';
                }
            } else {
                // This case means the JSON structure was not what we expected (e.g. no 'transcript' or 'error' field)
                transcriptOutput.textContent = 'Unexpected response structure from server.';
                statusDiv.textContent = 'Failed to fetch transcript due to unexpected server response.';
                statusDiv.className = 'error';
            }

        } catch (error) { // Catches errors from fetch() itself (network errors) or errors explicitly thrown above
            console.error('Fetch processing error:', error);
            statusDiv.textContent = `Error: ${error.message}`; // error.message will contain the detailed message we constructed
            statusDiv.className = 'error';
            transcriptOutput.textContent = '';
        }
    });

    // Helper function to extract video ID from various YouTube URL formats
    function extractVideoID(url) {
        let videoID = url; // Default to assuming it's an ID if no URL pattern matches
        const patterns = [
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/,
            /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/,
            // Removed the plain ID regex from here as it could misinterpret parts of invalid URLs
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                videoID = match[1];
                break; // Found ID from URL, use this one
            }
        }
        
        // After attempting to extract from URL or using the input as is,
        // validate if it's an 11-character YouTube ID.
        if (/^[a-zA-Z0-9_-]{11}$/.test(videoID)) {
            return videoID;
        }
        return null; // Return null if no valid ID is found/extracted
    }
});
