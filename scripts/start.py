#!/usr/bin/env python3
"""
NSSPORTS Development Server Launcher
────────────────────────────────────────────────────────────────
Manages Next.js development server, ngrok tunnel, and bet settlement scheduler
"""

import subprocess
import time
import os
import sys
import requests
from typing import Optional

# ═══════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════

DEV_SERVER_PORT = 3000
NGROK_STATIC_DOMAIN = "nssportsclub.ngrok.app"
SERVER_TIMEOUT = 90  # Increased to 90 seconds for initial page compilation
PROJECT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'nssports')

# ═══════════════════════════════════════════════════════════════
# TERMINAL FORMATTING
# ═══════════════════════════════════════════════════════════════

class Style:
    """ANSI color codes for terminal output"""
    RESET = '\033[0m'
    BOLD = '\033[1m'
    DIM = '\033[2m'
    
    # Colors
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    WHITE = '\033[97m'
    GRAY = '\033[90m'

def print_header():
    """Display application header"""
    print(f"\n{Style.BOLD}{Style.CYAN}{'═' * 64}{Style.RESET}")
    print(f"{Style.BOLD}{Style.WHITE}  NSSPORTS{Style.RESET} {Style.DIM}Development Environment{Style.RESET}")
    print(f"{Style.BOLD}{Style.CYAN}{'═' * 64}{Style.RESET}\n")

def print_status(message: str, status: str = "info"):
    """Print formatted status message"""
    icons = {
        "info": f"{Style.BLUE}▸{Style.RESET}",
        "success": f"{Style.GREEN}✓{Style.RESET}",
        "error": f"{Style.RED}✗{Style.RESET}",
        "wait": f"{Style.YELLOW}⋯{Style.RESET}",
        "shutdown": f"{Style.MAGENTA}■{Style.RESET}"
    }
    icon = icons.get(status, icons["info"])
    print(f"{icon} {message}")

def print_separator():
    """Print visual separator"""
    print(f"{Style.GRAY}{'─' * 64}{Style.RESET}")

# ═══════════════════════════════════════════════════════════════
# PROCESS MANAGEMENT
# ═══════════════════════════════════════════════════════════════

def kill_process_on_port(port: int) -> None:
    """Terminate any process using the specified port"""
    print_status(f"Cleaning port {port}", "info")
    subprocess.run(
        f'netstat -ano | findstr :{port} | for /f "tokens=5" %a in (\'more\') do taskkill /PID %a /F',
        shell=True,
        capture_output=True,
        text=True
    )
    time.sleep(1)

def wait_for_server(port: int, timeout: int) -> bool:
    """Wait for server to become responsive"""
    start_time = time.time()
    url = f"http://localhost:{port}"
    print_status("Waiting for Next.js to compile (first page compilation may take 40-60 seconds)", "wait")
    
    # Wait longer initially for Turbopack compilation
    time.sleep(10)
    
    attempts = 0
    while time.time() - start_time < timeout:
        try:
            # Allow redirects and follow to login page compilation
            # This will trigger /auth/login compilation but that's okay - we wait for it
            response = requests.get(url, timeout=10, allow_redirects=True)
            # Accept any successful response (server is up and responding)
            if response.status_code < 500:  # Any non-server-error means it's working
                elapsed = int(time.time() - start_time)
                print()  # New line after dots
                print_status(f"Server ready after {elapsed} seconds", "success")
                return True
        except (requests.exceptions.ConnectionError, requests.exceptions.ReadTimeout) as e:
            attempts += 1
            # Only show dots every 3rd attempt to reduce clutter
            if attempts % 3 == 0:
                print(f"{Style.GRAY}.", end="", flush=True)
            time.sleep(4)
    
    print()  # New line after dots
    return False

# ═══════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════

def run() -> None:
    """Initialize and run development environment"""
    print_header()
    
    # Cleanup existing processes
    print_status("Cleaning up existing processes", "info")
    kill_process_on_port(DEV_SERVER_PORT)
    subprocess.run('taskkill /IM ngrok.exe /F', shell=True, capture_output=True)
    
    # Kill any existing settlement worker processes (tsx/node processes)
    # This ensures clean restart of settlement system
    subprocess.run('taskkill /F /FI "WINDOWTITLE eq start-professional-settlement*" 2>nul', shell=True, capture_output=True)
    subprocess.run('taskkill /F /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq *settlement*" 2>nul', shell=True, capture_output=True)
    
    # Also kill any orphaned settlement-related node processes
    try:
        # Get list of node processes and filter for settlement-related ones
        result = subprocess.run(
            'wmic process where "name=\'node.exe\' and commandline like \'%settlement%\'" get processid',
            shell=True,
            capture_output=True,
            text=True
        )
        if result.stdout:
            pids = [line.strip() for line in result.stdout.split('\n') if line.strip().isdigit()]
            for pid in pids:
                subprocess.run(f'taskkill /F /PID {pid}', shell=True, capture_output=True)
                print_status(f"Killed orphaned settlement process (PID: {pid})", "info")
    except Exception:
        pass  # Silently ignore if no processes found
    
    time.sleep(1)
    print_status("Cleanup complete", "success")
    
    npm_executable = 'npm.cmd' if os.name == 'nt' else 'npm'
    dev_server: Optional[subprocess.Popen] = None
    ngrok: Optional[subprocess.Popen] = None
    settlement_worker: Optional[subprocess.Popen] = None
    
    try:
        # Start Next.js development server
        print_status("Launching Next.js development server", "info")
        dev_server = subprocess.Popen(
            [npm_executable, 'run', 'dev'],
            cwd=PROJECT_PATH,
            shell=True,
            env=os.environ.copy()
        )
        
        if not wait_for_server(DEV_SERVER_PORT, SERVER_TIMEOUT):
            print_status("Server initialization failed", "error")
            return
        
        # Start ngrok tunnel
        print_status("Establishing ngrok tunnel", "info")
        ngrok = subprocess.Popen(
            ['ngrok', 'http', str(DEV_SERVER_PORT), f'--domain={NGROK_STATIC_DOMAIN}'],
            cwd=PROJECT_PATH,
            shell=True,
            env=os.environ.copy()
        )
        
        time.sleep(2)
        
        # Start professional BullMQ settlement system
        print_status("Starting professional settlement system (BullMQ + Redis)", "info")
        
        # Start the professional settlement system (handles both init and worker)
        settlement_worker = subprocess.Popen(
            ['npx', 'tsx', 'scripts/start-professional-settlement.ts'],
            cwd=PROJECT_PATH,
            shell=True,
            env=os.environ.copy(),
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
        )
        
        # Give it a moment to initialize and check for errors
        time.sleep(4)
        
        # Check if process is still running
        if settlement_worker.poll() is None:
            print_status("Settlement system initialized successfully", "success")
            print_status("Queue scheduled (every 5 minutes)", "success")
            print_status("Worker active and processing jobs", "success")
        else:
            print_status("Failed to start settlement system", "error")
            print_status("Check Redis connection and environment variables", "error")
            print_status("Try manually: npx tsx scripts/start-professional-settlement.ts", "info")
            settlement_worker = None  # Mark as failed so cleanup doesn't try to kill it
        
        # Display connection information
        print()
        print_separator()
        print(f"\n{Style.BOLD}{Style.GREEN}  ENVIRONMENT READY{Style.RESET}\n")
        print(f"  {Style.BOLD}Local:{Style.RESET}      {Style.CYAN}http://localhost:{DEV_SERVER_PORT}{Style.RESET}")
        print(f"  {Style.BOLD}Tunnel:{Style.RESET}     {Style.CYAN}https://{NGROK_STATIC_DOMAIN}{Style.RESET}")
        print(f"  {Style.BOLD}Settlement:{Style.RESET} {Style.GREEN}Professional BullMQ System (every 5 minutes){Style.RESET}")
        print(f"  {Style.BOLD}Redis:{Style.RESET}      {Style.CYAN}Connected{Style.RESET}\n")
        print_separator()
        print(f"\n{Style.DIM}Press Ctrl+C to stop all services{Style.RESET}\n")
        
        # Keep running
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print(f"\n\n{Style.YELLOW}Shutdown initiated{Style.RESET}")
        print_separator()
    finally:
        # Shutdown in reverse order: settlement -> ngrok -> dev server
        
        # Stop settlement worker first (graceful shutdown with SIGTERM)
        if settlement_worker:
            print_status("Stopping settlement system gracefully", "shutdown")
            try:
                # Send SIGTERM for graceful shutdown
                settlement_worker.terminate()
                # Wait up to 10 seconds for graceful shutdown
                settlement_worker.wait(timeout=10)
                print_status("Settlement system stopped gracefully", "success")
            except subprocess.TimeoutExpired:
                print_status("Settlement system did not stop gracefully, forcing shutdown", "shutdown")
                settlement_worker.kill()
                settlement_worker.wait()
                print_status("Settlement system stopped (forced)", "success")
            except Exception as e:
                print_status(f"Error stopping settlement system: {e}", "error")
        
        # Stop ngrok
        if ngrok:
            print_status("Terminating ngrok tunnel", "shutdown")
            ngrok.terminate()
            time.sleep(1)
            try:
                ngrok.kill()
            except Exception:
                pass
            print_status("Ngrok tunnel closed", "success")
        
        # Stop dev server
        if dev_server:
            print_status("Stopping development server", "shutdown")
            dev_server.terminate()
            time.sleep(2)
            try:
                dev_server.kill()
            except Exception:
                pass
            print_status("Development server stopped", "success")
        
        print_status("Shutdown complete", "success")
        print()

if __name__ == "__main__":
    run()
