import subprocess
import time
import os
import sys
import requests
import psutil

# --- CONFIGURATION ---
DEV_SERVER_PORT = 3000
NGROK_STATIC_DOMAIN = "nssportsclub.ngrok.app"
SERVER_TIMEOUT = 60
PROJECT_PATH = os.path.abspath(os.path.dirname(__file__))
# --- END CONFIGURATION ---

# Robust Windows port killer using netstat and taskkill
def kill_process_on_port(port):
    print(f"🧹 Checking for existing processes on port {port}...")
    result = subprocess.run(f'netstat -ano | findstr :{port}', shell=True, capture_output=True, text=True)
    pids = set()
    for line in result.stdout.splitlines():
        parts = line.split()
        if len(parts) >= 5:
            pids.add(parts[-1])
    if not pids:
        print("   No active processes found on the port. Good to go!")
    for pid in pids:
        print(f"   Killing PID {pid} on port {port}...")
        result = subprocess.run(f'taskkill /PID {pid} /F', shell=True, capture_output=True, text=True)
        print(result.stdout)
        print(result.stderr)
        print(f"   Process {pid} termination attempted.")
    if pids:
        print("   Waiting for port to be released...")
        time.sleep(2)

def wait_for_server(port, timeout):
    start_time = time.time()
    url = f"http://localhost:{port}"
    print(f"\n⏳ Waiting for the server on {url} to be ready...")
    while time.time() - start_time < timeout:
        try:
            requests.get(url, timeout=1)
            print("\n✅ Server is up and running!")
            return True
        except (requests.exceptions.ConnectionError, requests.exceptions.ReadTimeout):
            print(".", end="", flush=True)
            time.sleep(1)
    print(f"\n❌ Error: Server did not start within the {timeout} second timeout.")
    return False

def run():
    kill_process_on_port(DEV_SERVER_PORT)
    npm_executable = 'npm.cmd' if os.name == 'nt' else 'npm'
    dev_server = None
    ngrok = None
    try:
        print("\n🚀 Starting Next.js dev server...")
        dev_server = subprocess.Popen(
            [npm_executable, 'run', 'dev'],
            cwd=PROJECT_PATH,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True,
            env=os.environ.copy()
        )
        if not wait_for_server(DEV_SERVER_PORT, SERVER_TIMEOUT):
            print("   Shutting down due to server startup failure.")
            dev_server.terminate()
            sys.exit(1)

        print("\n🔗 Starting ngrok tunnel...")
        # Kill any existing ngrok processes for clean restart
        print("   Killing any existing ngrok processes...")
        ngrok_kill_result = subprocess.run('taskkill /IM ngrok.exe /F', shell=True, capture_output=True, text=True)
        if "SUCCESS" in ngrok_kill_result.stdout:
            print("   Existing ngrok processes terminated.")
            time.sleep(2)  # Wait for processes to fully terminate
        else:
            print("   No existing ngrok processes found.")
        
        ngrok_command = ['ngrok', 'http', str(DEV_SERVER_PORT), f'--domain={NGROK_STATIC_DOMAIN}']
        ngrok = subprocess.Popen(
            ngrok_command,
            cwd=PROJECT_PATH,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True,
            env=os.environ.copy()
        )

        # Check if dev server process is still running
        if dev_server.poll() is not None:
            print(f"\n❌ Dev server process exited with code: {dev_server.returncode}")
            stdout, stderr = dev_server.communicate()
            print("\n--- DEV SERVER STDOUT ---")
            print(stdout.decode(errors='ignore'))
            print("\n--- DEV SERVER STDERR ---")
            print(stderr.decode(errors='ignore'))
            return
        
        # Give ngrok a moment to start
        time.sleep(3)
        
        # Check if ngrok process is still running
        if ngrok.poll() is None:
            print("\n✅ Your application is now live!")
            print(f"   Public URL: https://{NGROK_STATIC_DOMAIN}")
            print(f"   Local URL: http://localhost:{DEV_SERVER_PORT}")
        else:
            print(f"\n❌ ngrok process exited with code: {ngrok.returncode}")
            # Try to get any error output
            try:
                stdout, stderr = ngrok.communicate(timeout=1)
                if stderr:
                    print("ngrok error:", stderr.decode(errors='ignore'))
            except:
                pass

        print("\nPress Ctrl+C to shut down all processes.")
        dev_server.wait()
    except KeyboardInterrupt:
        print("\nSIGINT received, shutting down gracefully...")
    finally:
        if ngrok:
            ngrok.terminate()
        if dev_server:
            dev_server.terminate()
        print("\nShutdown complete.")

if __name__ == "__main__":
    run()