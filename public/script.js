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
            statusDiv.textContent = 'Invalid YouTube URL or ID format.';
            statusDiv.className = 'error';
            transcriptOutput.textContent = '';
            return;
        }

        statusDiv.textContent = 'Fetching transcript...';
        statusDiv.className = 'loading';
        transcriptOutput.textContent = ''; // Clear previous transcript

        try {
            // The path /api/get_transcript will be routed by Vercel
            // to your api/get_transcript.py function
            const response = await fetch(`/api/get_transcript?videoId=${encodeURIComponent(videoId)}`);
            
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            if (data.transcript && data.transcript.length > 0) {
                transcriptOutput.textContent = data.transcript.join('\n\n'); // Join snippets with double newline for readability
                statusDiv.textContent = 'Transcript fetched successfully!';
                statusDiv.className = '';
            } else if (data.transcript && data.transcript.length === 0) {
                transcriptOutput.textContent = 'Transcript is empty.';
                statusDiv.textContent = 'Transcript fetched, but it is empty.';
                statusDiv.className = '';
            } else {
                 // This case should ideally be covered by response.ok check or error in data.error
                transcriptOutput.textContent = 'No transcript found or an unknown issue occurred.';
                statusDiv.textContent = data.error || 'Failed to fetch transcript.';
                statusDiv.className = 'error';
            }

        } catch (error) {
            console.error('Fetch error:', error);
            statusDiv.textContent = `Error: ${error.message}`;
            statusDiv.className = 'error';
            transcriptOutput.textContent = '';
        }
    });

    // Helper function to extract video ID from various YouTube URL formats
    function extractVideoID(url) {
        let videoID = url;
        const patterns = [
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/,
            /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/,
            /^[a-zA-Z0-9_-]{11}$/ // Plain video ID
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                videoID = match[1];
                break;
            } else if (pattern.test(url)) { // For plain ID
                videoID = url;
                break;
            }
        }
         // Clean up any extra parameters after the ID if it was part of a URL
        const ampersandPosition = videoID.indexOf('&');
        if (ampersandPosition !== -1 && videoID.includes('=')) { // check if it's not just an ID with &
             // No, this part is likely wrong, the regex should handle it.
             // If the regex got it, it's fine. If it's a plain ID, it's fine.
        }

        // Final check if it looks like a valid ID (11 chars, specific characters)
        if (/^[a-zA-Z0-9_-]{11}$/.test(videoID)) {
            return videoID;
        }
        return null; // Return null if no valid ID is found
    }
});
