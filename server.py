#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
server.py — Local & Network Fleet Dashboard Server
Run on your machine to open the dashboard locally or on your phone via home Wi-Fi!

Usage:
    python server.py
    Open: http://localhost:5000 (or http://<your-local-ip>:5000 on smartphone)
"""

import os
import sys
import json
import urllib.request
import urllib.error
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder="public")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CHANNELS_FILE = os.path.join(BASE_DIR, "channels.json")

def load_channels():
    if os.path.exists(CHANNELS_FILE):
        try:
            with open(CHANNELS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"channels": []}

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/<path:path>")
def static_files(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    if os.path.exists(os.path.join(BASE_DIR, path)):
        return send_from_directory(BASE_DIR, path)
    return "Not found", 404

@app.route("/api/channels", methods=["GET"])
def get_channels():
    return jsonify(load_channels())

@app.route("/api/channels", methods=["POST"])
def add_channel():
    new_ch = request.json
    data = load_channels()
    data.setdefault("channels", []).append(new_ch)
    with open(CHANNELS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return jsonify({"success": True, "channels": data["channels"]})

@app.route("/api/trigger", methods=["POST"])
def proxy_trigger():
    """Proxies workflow dispatch to GitHub Actions using local or passed GitHub token."""
    body = request.json or {}
    repo = body.get("repo")
    workflow = body.get("workflow", "repurpose.yml")
    token = body.get("token") or os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")

    if not token:
        # Check if gh cli is logged in
        import subprocess
        try:
            tok_out = subprocess.check_output(["gh", "auth", "token"], text=True).strip()
            if tok_out:
                token = tok_out
        except Exception:
            pass

    if not token:
        return jsonify({"error": "GitHub Personal Access Token required."}), 400

    gh_url = f"https://api.github.com/repos/{repo}/actions/workflows/{workflow}/dispatches"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "Family-Fleet-Studio",
    }
    payload = {
        "ref": "main",
        "inputs": {
            "youtube_url": body.get("youtube_url", ""),
            "speaker_name": body.get("speaker_name", ""),
            "aspect": body.get("aspect", "landscape"),
            "duration": "0",
            "upload": str(body.get("upload", True)).lower(),
            "privacy": body.get("privacy", "scheduled"),
            "schedule_hours": str(body.get("schedule_hours", 72)),
        }
    }

    try:
        req = urllib.request.Request(gh_url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
        with urllib.request.urlopen(req) as resp:
            return jsonify({"success": True, "status": resp.status})
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        return jsonify({"error": f"GitHub API error ({e.code}): {err_msg}"}), e.code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"\n=======================================================")
    print(f"🚀 YouTube Family Fleet Studio Live Server Running!")
    print(f"   • Local:   http://localhost:{port}")
    print(f"   • Mobile:  Open on phone using your PC's Wi-Fi IP")
    print(f"=======================================================\n")
    app.run(host="0.0.0.0", port=port, debug=False)
