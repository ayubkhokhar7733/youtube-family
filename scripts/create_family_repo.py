#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
create_family_repo.py — Automated 30-Second Channel Repository Provisioner

Usage:
    python scripts/create_family_repo.py --repo channel-nephew-mente --owner "Nephew" --name "Mente & Enfoque" --speaker "Dra. Marian Rojas Estapé" --public
"""

import os
import sys
import json
import argparse
import subprocess

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHANNELS_FILE = os.path.join(BASE_DIR, "channels.json")

def main():
    parser = argparse.ArgumentParser(description="Provision a new GitHub repository for a family/friend YouTube channel.")
    parser.add_argument("--repo", type=str, required=True, help="Repository name (e.g. channel-nephew-mente)")
    parser.add_argument("--name", type=str, required=True, help="Display channel name (e.g. Mente & Enfoque)")
    parser.add_argument("--owner", type=str, default="Family Member", help="Channel owner (e.g. Nephew, Brother)")
    parser.add_argument("--speaker", type=str, required=True, help="Primary authority speaker (e.g. Dra. Marian Rojas Estapé)")
    parser.add_argument("--niche", type=str, default="Personal Development", help="Channel niche")
    parser.add_argument("--public", action="store_true", default=True, help="Create as public repository (unlimited free GitHub Actions minutes)")
    parser.add_argument("--schedule", type=int, default=72, help="Release gap in hours (default: 72)")

    args = parser.parse_args()

    print(f"\n🚀 Provisioning New Channel: \"{args.name}\" for {args.owner}...")

    # Check gh CLI
    try:
        gh_user = subprocess.check_output(["gh", "api", "user", "-q", ".login"], text=True).strip()
        print(f"✅ Authenticated as GitHub user: @{gh_user}")
    except Exception as e:
        print(f"❌ gh CLI error: {e}")
        sys.exit(1)

    full_repo = f"{gh_user}/{args.repo}"
    visibility_flag = "--public" if args.public else "--private"

    # Create repo on GitHub
    print(f"📦 Creating {visibility_flag} repository: {full_repo} on GitHub...")
    create_cmd = ["gh", "repo", "create", full_repo, visibility_flag, "--description", f"Automated Video Pipeline for {args.name}", "--confirm"]
    res = subprocess.run(create_cmd)
    if res.returncode != 0:
        print(f"⚠️ Note: Repo might already exist, continuing with setup...")

    # Register in channels.json
    data = {"channels": []}
    if os.path.exists(CHANNELS_FILE):
        try:
            with open(CHANNELS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            pass

    # Check if channel already exists
    existing = [c for c in data.get("channels", []) if c.get("repo") == full_repo]
    if not existing:
        new_entry = {
            "id": args.repo.replace("-", "_"),
            "name": args.name,
            "owner": args.owner,
            "handle": f"@{args.name.lower().replace(' ', '')}",
            "speaker": args.speaker,
            "language": "es" if any(w in args.speaker.lower() for w in ["dra", "marian", "mario", "alonso"]) else "en",
            "niche": args.niche,
            "schedule_hours": args.schedule,
            "prime_time_utc": 16,
            "repo": full_repo,
            "workflow": "repurpose.yml",
            "is_public_repo": args.public,
            "color": "emerald",
            "badge": "FAMILY"
        }
        data.setdefault("channels", []).append(new_entry)
        with open(CHANNELS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"✅ Successfully registered in channels.json!")

    print(f"\n🎉 Channel Provisioning Complete!")
    print(f"   • Channel Name: {args.name}")
    print(f"   • GitHub Repo:  https://github.com/{full_repo}")
    print(f"   • Unlimited Minutes: {'Yes (Public Repo)' if args.public else 'No (Private)'}")
    print(f"   • Dashboard Ready: Open the Fleet Studio dashboard to start generating!\n")

if __name__ == "__main__":
    main()
