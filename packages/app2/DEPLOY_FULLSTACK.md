# Full Stack CI/CD

This deployment flow keeps `FrontEnd`, `Backend/Crawl`, and `Backend/OpenMAIC`
on the same server revision window so the frontend does not drift away from the
APIs it depends on.

## Scope

- `FrontEnd` publishes the Vue + Nginx site on port `80`
- `Backend/Crawl` publishes:
  - `api` on port `8000`
  - `crawler` on port `6600`
  - `monitor` on port `6666`
- `Backend/OpenMAIC` publishes Next.js on port `3000`

## Trigger strategy

The same GitHub Actions workflow should exist in both repositories:

- `FrontEnd/.github/workflows/deploy.yml`
- `Backend/.github/workflows/deploy-full-stack.yml`

The legacy backend workflow at `Backend/.github/workflows/deploy.yml` is kept as
manual fallback only. It should not auto-run on `push`.

Any push to `main` in either repo triggers the same remote deploy routine:

1. Pull `Backend/main`
2. Pull `FrontEnd/main`
3. Rebuild and restart `Crawl`
4. Rebuild and restart `OpenMAIC`
5. Rebuild and restart `FrontEnd`

This fixes the old problem where only `FrontEnd` was updated.

## Server layout

The workflow assumes these directories already exist on the server:

```bash
~/FrontEnd-0317
~/Backend
```

And that they are Git working copies of:

- `FrontEnd-0317.git`
- `Backend.git`

## Required GitHub secrets

Configure the same secrets in both repositories:

- `ECS_HOST`
- `ECS_USER`
- `ECS_SSH_KEY`

## Required server-side env files

These files are not committed, but must exist on the server before deployment:

```bash
~/Backend/Crawl/.env
~/Backend/WorkShop/.env
~/Backend/OpenMAIC/.env.local
```

`~/Backend/WorkShop/.env` is the shared backend env file used by both
`Backend/WorkShop` and `Backend/Crawl` for OSS / DashScope-style credentials.

If `OpenMAIC` image/video generation is required, make sure
`~/Backend/OpenMAIC/.env.local` includes valid provider credentials such as:

- `IMAGE_SEEDREAM_API_KEY`
- `IMAGE_QWEN_IMAGE_API_KEY`
- `IMAGE_NANO_BANANA_API_KEY`
- `VIDEO_SEEDANCE_API_KEY`
- `VIDEO_KLING_API_KEY`

## Zero-drift deployment order

The workflow uses:

```bash
docker compose -f ~/Backend/Crawl/docker-compose.yml up -d --build --remove-orphans
docker compose -f ~/Backend/OpenMAIC/docker-compose.yml up -d --build --remove-orphans
docker compose -f ~/FrontEnd-0317/docker-compose.yml up -d --build --remove-orphans
```

Why this order:

- `Crawl` first, because `FrontEnd` depends on `/api/ranks`, `/api/og-image`, and screenshot APIs
- `OpenMAIC` second, because `FrontEnd` links into it and calls its generation APIs
- `FrontEnd` last, so the user-facing shell is rebuilt only after its dependencies are ready

## First-time migration checklist

1. Confirm both repositories are on the server and track `main`
2. Add the GitHub secrets to both repositories
3. Ensure the server env files exist and contain production credentials
4. Push the workflow change to both repositories
5. Trigger `workflow_dispatch` once from either repository to validate the server layout
6. Verify:
   - `http://server/api/ranks/main/weibo`
   - `http://server/openmaic` or direct `:3000` access path
   - homepage leaderboard cover images
   - OpenMAIC image generation

## Operational notes

- The workflow uses `git pull --ff-only` to avoid silently overwriting server-side changes
- If one repo fails to pull, the deployment stops before partial rollout
- Frontend static images are still heavily cached by Nginx; if a PNG changes without a filename
  change, browsers may continue to show the old asset until cache is busted
