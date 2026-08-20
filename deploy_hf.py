"""
Create the Hugging Face Static Space and upload the built static site.
Run AFTER logging in:  hf auth login   (or: huggingface-cli login)

Usage: python deploy_hf.py
Uploads the folder ../hf-space (the built dist + Space config).
"""
import os
from huggingface_hub import create_repo, upload_folder, whoami

SPACE_NAME = "blood-cell-ai-detector"
FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "hf-space")

def main():
    who = whoami()   # fails clearly if not logged in
    print("Logged in as:", who["name"])
    REPO_ID = f"{who['name']}/{SPACE_NAME}"   # use the actual HF username
    print("Creating Space (if needed):", REPO_ID)
    create_repo(REPO_ID, repo_type="space", space_sdk="static", exist_ok=True)
    print("Uploading", FOLDER, "...")
    upload_folder(
        folder_path=FOLDER,
        repo_id=REPO_ID,
        repo_type="space",
        ignore_patterns=[".git*"],
        commit_message="Deploy Blood Cell AI Detector (static, in-browser)",
    )
    user = REPO_ID.split("/")[0].lower()
    name = REPO_ID.split("/")[1].lower()
    # Static Spaces are served from the .static.hf.space subdomain.
    print("\nDONE. Live at: https://%s-%s.static.hf.space" % (user, name))
    print("Space page:    https://huggingface.co/spaces/%s" % REPO_ID)

if __name__ == "__main__":
    main()
