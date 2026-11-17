# Flipo phone control

Phone control uses a small Node.js bridge on the same private Wi-Fi as the PC. The paired phone can edit the same Classic, Subject Flow, and Story prompts and generation settings as Flipo, manage reference images, import/export full Subject Flow presets, and start/stop/retry runs. Settings and selected image data move only between the phone and Flipo over the local network; Google credentials remain in Chrome on the PC.

1. Install Node.js 18 or newer on the PC.
2. Run `start-mobile-remote.bat` in this folder once. On first run it installs the locked QR/WebSocket packages and starts the bridge in the background. Allow Node.js on **Private networks** in Windows Firewall if Windows asks.
3. Reload Flipo from `chrome://extensions` so Chrome picks up version 4.3.9 and its local bridge permission.
4. Open Flipo, expand **Phone remote**, choose **Create phone QR**, and scan it while the phone is on the same Wi-Fi.

Chrome may be minimized while the PC remains awake and Chrome stays open. Fully quitting Chrome or putting the PC to sleep stops extension control. Keep the bridge process running while paired. Creating a new QR replaces the old pairing token. Treat the QR as a private control key and scan it only on a trusted network.

This implementation has no internet relay. Control from outside the local network would require deploying and securing a public relay, so this QR does not work from anywhere over the internet.
