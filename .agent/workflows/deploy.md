---
description: Build and package the application for deployment to a VPS
---

To package the MissionControl application for deployment, follow these steps:

1. **Build the production assets**
// turbo
```bash
npm run build
```

2. **Compress the build output**
This creates a compressed tarball of the `dist` directory, which is ready to be uploaded.
// turbo
```bash
tar -czvf mission-control.tar.gz dist/
```

3. **Upload to your VPS**
Replace `user` and `vps-ip` with your actual VPS credentials and the destination path.
```bash
scp mission-control.tar.gz user@vps-ip:/var/www/mission-control/
```

4. **Deploy on the VPS**
SSH into your VPS and unpack the archive:
```bash
ssh user@vps-ip
cd /var/www/mission-control/
tar -xzvf mission-control.tar.gz --strip-components=1
```

5. **Configure Nginx (Recommended)**
If you are using Nginx, ensure your site configuration points to the directory where you unpacked the files. Example configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/mission-control;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```
