# Subscription-Tracker — Project Notes

## Deployment

- Always push feature commits to the **beta branch** — Gitea Actions deploys to Cloudflare Pages on push to `beta`, not `main`.
- Version control is on a local Gitea instance (`http://192.168.68.67:3003`, repo `Leon/Subscription-Tracker`), not GitHub.
