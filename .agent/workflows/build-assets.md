---
description: Build JS/React assets using a temporary Node container
---

To build the frontend assets (JS/React/CSS) without needing Node.js installed on the host machine, run:

// turbo
1. Execute the build command via Docker:
```bash
docker run --rm -v $(pwd):/var/www -w /var/www node:20-alpine npm run build
```

2. (Optional) Clear Laravel cache to ensure manifest updates:
```bash
docker exec api-laido_app_1 php artisan optimize:clear
```
