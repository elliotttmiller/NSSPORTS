# Scripts Directory

This folder contains automation scripts for the NSSPORTS project.

## 📜 Available Scripts

### 🚀 `start.py` - Development Server Launcher
Automatically starts Next.js dev server with ngrok tunneling.

**Features:**
- Kills existing processes on port 3000
- Starts Next.js development server
- Launches ngrok with static domain `nssportsclub.ngrok.app`
- Optimized for maximum performance (no output streaming)

**Usage:**
```bash
cd scripts
python start.py
```

**URLs:**
- Local: `http://localhost:3000`
- Public: `https://nssportsclub.ngrok.app`

---

### 🧹 `clean.py` - Safe Empty File Cleaner
Safely removes completely empty files (0 bytes only) from the project.

**Safety Features:**
- Only deletes files with exactly 0 bytes
- Excludes sensitive directories (`.git`, `node_modules`, etc.)
- Requires user confirmation before deletion
- Double-checks file size before removal

**Usage:**
```bash
cd scripts
python clean.py
```

---

## 🔧 Requirements

- Python 3.7+
- `requests` library: `pip install requests`
- `ngrok` installed and authenticated
- Node.js and npm

## 📁 Project Structure

```
NSSPORTS/
├── scripts/           # 👈 Automation scripts
│   ├── start.py       # Dev server + ngrok launcher
│   ├── clean.py       # Empty file cleaner
│   └── README.md      # This file
├── nssports/          # Main Next.js application
└── ...
```

## 🛡️ Safety Notes

- All scripts include safety checks and user confirmations
- Protected directories are automatically excluded
- Scripts can be safely interrupted with Ctrl+C
- No destructive operations without explicit user consent

## 🚀 Future Scripts

Add new automation scripts to this directory:
- Database migration scripts
- Build and deployment automation
- Code quality checks
- Performance monitoring tools
