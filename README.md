# 🌸 One Last Message — Interactive Live Wallpaper

An interactive web application featuring an animated WebGL live wallpaper, ambient Demon Slayer soundtrack (*Nezuko's Thought* OST), volumetric sunbeams, floating firefly particles, 2.5D mouse parallax, and a frosted-glass message card protected with a PIN lock.

---

## 🔑 Access PIN
The PIN to unlock the message card is: **`2007`**

---

## ✨ Features
- 🍃 **WebGL Foliage Sway**: Real-time wave distortion shader on foliage & hair.
- ✨ **Dual-Pass Glow**: Dynamic aura and eye pulse glow synced to the background music.
- 🏮 **Particle Engine**: Volumetric light shafts, glowing fireflies, and interactive spark bursts on click.
- 🧭 **2.5D Mouse Parallax**: Smooth spring-damped camera tilt following mouse movement.
- 🎵 **Endless Looping OST**: Auto-playing Demon Slayer OST (*Nezuko's Thought*).
- 📜 **Frosted Glass Message**: Elegant left-aligned card with Quicksand typography.

---

## 🚀 How to Publish on GitHub Pages

### Step 1: Create a new repository on GitHub
1. Go to [github.com/new](https://github.com/new).
2. Name your repository (e.g. `one-last-message`) and set it to **Public**.
3. Do not initialize with a README (already included).

### Step 2: Push your code to GitHub
Run the following commands in this directory (or use **GitHub Desktop**):

```bash
git init
git add .
git commit -m "One Last Message - Live Wallpaper"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git
git push -u origin main
```

### Step 3: Enable GitHub Pages
1. Go to your GitHub repository **Settings** → **Pages**.
2. Under **Build and deployment** → **Source**, select **GitHub Actions** (or Deploy from a branch -> `main`).
3. Your live wallpaper will be published at:
   `https://YOUR_USERNAME.github.io/YOUR_REPOSITORY_NAME/`

---

## 📁 Repository Structure
```
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions automated Pages deployment
├── assets/
│   ├── audio/
│   │   └── bgm.mp3         # Background soundtrack
│   ├── masks/              # Shader opacity masks
│   └── nezuko.png          # High-resolution base artwork
├── js/
│   ├── audio.js            # Audio controller & analyser
│   ├── main.js             # Main wallpaper animation loop
│   ├── noise.js            # Seamless procedural noise generator
│   ├── particles.js        # Light shafts & firefly particle engine
│   └── webgl-engine.js     # WebGL shader render pipeline
├── index.html              # Main webpage with PIN lock & letter
├── style.css               # Glassmorphic responsive styling
├── package.json            # Project metadata
└── .gitignore              # Standard gitignore
```
