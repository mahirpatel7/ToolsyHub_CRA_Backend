#!/bin/bash
apt-get update
apt-get install -y libreoffice ghostscript python3 python3-pip
pip3 install pdf2docx
npm install
```

4. **Save the file**

---

### **STEP 3: Update Render Settings**

1. **Go to** [https://dashboard.render.com](https://dashboard.render.com)

2. **Click on your service** (toolsyhub-backend)

3. **Click "Settings"** (left sidebar)

4. **Scroll down to "Build & Deploy"** section

5. **Find "Build Command"** and change it to:
```
   bash build.sh
```

6. **Find "Start Command"** and change it to:
```
   node server.js