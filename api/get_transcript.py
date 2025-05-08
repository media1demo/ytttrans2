import os
import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import WebshareProxyConfig
from youtube_transcript_api.errors import TranscriptsDisabled, NoTranscriptFound, VideoUnavailable

# IMPORTANT: Set these as Environment Variables in your Vercel project settings
PROXY_USERNAME = "ovzsrnps-rotate"
PROXY_PASSWORD = "ajl5st67thul"

class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        query_components = parse_qs(urlparse(self.path).query)
        video_id = query_components.get("videoId", [None])[0]

        if not video_id:
            self.send_response(400)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "videoId query parameter is required"}).encode("utf-8"))
            return

        if not PROXY_USERNAME or not PROXY_PASSWORD:
            self.send_response(500)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Proxy credentials not configured on the server."}).encode("utf-8"))
            return

        try:
            ytt_api = YouTubeTranscriptApi(
                proxy_config=WebshareProxyConfig(
                    proxy_username=PROXY_USERNAME,
                    proxy_password=PROXY_PASSWORD,
                )
            )
            fetched_transcript = ytt_api.fetch(video_id)
            
            transcript_texts = [snippet['text'] for snippet in fetched_transcript]

            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"transcript": transcript_texts}).encode("utf-8"))

        except (TranscriptsDisabled, NoTranscriptFound) as e:
            self.send_response(404)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": f"Transcript not found or disabled: {str(e)}"}).encode("utf-8"))
        except VideoUnavailable as e:
            self.send_response(404)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": f"Video unavailable: {str(e)}"}).encode("utf-8"))
        except Exception as e:
            # Log the full error for debugging on the server side (Vercel logs)
            print(f"An unexpected error occurred: {str(e)}") 
            self.send_response(500)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": f"An unexpected error occurred: {str(e)}"}).encode("utf-8"))
        return
