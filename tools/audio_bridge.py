#!/usr/bin/env python3
"""
Fleet Studio — Local Audio Bridge
Allows Fleet Studio (on Vercel or localhost) to download YouTube MP3s
directly via residential IP and pipe the audio straight into the browser.
"""

import http.server
import socketserver
import urllib.parse
import subprocess
import os
import tempfile
import json

PORT = 7733

class AudioBridgeHandler(http.server.BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'online', 'service': 'Fleet Studio Audio Bridge'}).encode('utf-8'))
            return

        if parsed.path == '/download':
            query = urllib.parse.parse_qs(parsed.query)
            url = query.get('url', [''])[0]
            if not url:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Missing url parameter'}).encode('utf-8'))
                return

            print(f"[AudioBridge] Downloading audio from: {url}")
            temp_dir = tempfile.mkdtemp()
            out_template = os.path.join(temp_dir, "%(id)s.%(ext)s")

            cmd = [
                "yt-dlp",
                "-x",
                "--audio-format", "mp3",
                "--extractor-args", "youtube:player_client=android,web",
                "-o", out_template,
                url
            ]

            try:
                subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=120)
                
                # Find output mp3
                mp3_files = [os.path.join(temp_dir, f) for f in os.listdir(temp_dir) if f.endswith('.mp3')]
                if not mp3_files:
                    raise RuntimeError("yt-dlp did not produce an MP3 file")

                mp3_path = mp3_files[0]
                file_size = os.path.getsize(mp3_path)
                file_name = os.path.basename(mp3_path)

                self.send_response(200)
                self.send_header('Content-Type', 'audio/mpeg')
                self.send_header('Content-Length', str(file_size))
                self.send_header('Content-Disposition', f'attachment; filename="{file_name}"')
                self.end_headers()

                with open(mp3_path, 'rb') as f:
                    while chunk := f.read(65536):
                        self.wfile.write(chunk)

                print(f"[AudioBridge] Successfully streamed {file_name} ({file_size} bytes)")
            except Exception as e:
                print(f"[AudioBridge] Error: {e}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
            finally:
                # Cleanup temp
                try:
                    for f in os.listdir(temp_dir):
                        os.remove(os.path.join(temp_dir, f))
                    os.rmdir(temp_dir)
                except Exception:
                    pass
            return

        self.send_response(404)
        self.end_headers()

def run():
    with socketserver.TCPServer(("", PORT), AudioBridgeHandler) as httpd:
        print(f"🚀 Fleet Studio Audio Bridge running on http://localhost:{PORT}")
        print("Keep this terminal open to enable 1-Click Auto-Grab MP3 directly in Vercel Studio!")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down Audio Bridge.")

if __name__ == '__main__':
    run()
