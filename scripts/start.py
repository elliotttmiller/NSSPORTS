import subprocess
import time
import os
import sys
import requests

# --- CONFIGURATION ---
DEV_SERVER_PORT = 3000
NGROK_STATIC_DOMAIN = "nssportsclub.ngrok.app"
SERVER_TIMEOUT = 45  # Increased timeout for Next.js with Turbopack
# Project path points to the nssports directory
PROJECT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'nssports')
# --- END CONFIGURATION ---

def kill_process_on_port(port):
    print(f"🧹 Cleaning port {port}...")
    subprocess.run(f'netstat -ano | findstr :{port} | for /f "tokens=5" %a in (\'more\') do taskkill /PID %a /F', 
                  shell=True, capture_output=True, text=True)
    time.sleep(1)

def wait_for_server(port, timeout):
    start_time = time.time()
    url = f"http://localhost:{port}"
    print(f"⏳ Waiting for server...")
    
    # Give Next.js a bit more time to initialize
    time.sleep(3)
    
    while time.time() - start_time < timeout:
        try:
            response = requests.get(url, timeout=3)
            if response.status_code == 200:
                print("✅ Server ready!")
                return True
        except (requests.exceptions.ConnectionError, requests.exceptions.ReadTimeout):
            print(".", end="", flush=True)
            time.sleep(2)
    return False

def run():
    kill_process_on_port(DEV_SERVER_PORT)
    
    # Kill existing ngrok processes
    subprocess.run('taskkill /IM ngrok.exe /F', shell=True, capture_output=True)
    time.sleep(1)
    
    npm_executable = 'npm.cmd' if os.name == 'nt' else 'npm'
    dev_server = None
    ngrok = None
    
    try:
        print("🚀 Starting Next.js...")
        # Start dev server with no output capture for maximum performance
        dev_server = subprocess.Popen(
            [npm_executable, 'run', 'dev'],
            cwd=PROJECT_PATH,
            shell=True,
            env=os.environ.copy()
        )
        
        if not wait_for_server(DEV_SERVER_PORT, SERVER_TIMEOUT):
            print("❌ Server failed to start")
            return
        
        print("🔗 Starting ngrok...")
        # Start ngrok with no output capture for maximum performance
        ngrok = subprocess.Popen(
            ['ngrok', 'http', str(DEV_SERVER_PORT), f'--domain={NGROK_STATIC_DOMAIN}'],
            cwd=PROJECT_PATH,
            shell=True,
            env=os.environ.copy()
        )
        
        time.sleep(2)
        
        print("\n✅ Ready!")
        print(f"   Local:  http://localhost:{DEV_SERVER_PORT}")
        print(f"   Public: https://{NGROK_STATIC_DOMAIN}")
        print("\nPress Ctrl+C to stop")
        
        # Keep script running
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
    finally:
        if ngrok:
            ngrok.terminate()
        if dev_server:
            dev_server.terminate()
        print("✅ Shutdown complete")

if __name__ == "__main__":
    run()
