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
SERVER_TIMEOUT = 45
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
    print_status("Initializing server", "wait")
    
    time.sleep(3)
    
    while time.time() - start_time < timeout:
        try:
            response = requests.get(url, timeout=3, allow_redirects=False)
            # Accept any successful response (2xx) or redirect (3xx)
            if 200 <= response.status_code < 400:
                print_status("Server initialized successfully", "success")
                return True
        except (requests.exceptions.ConnectionError, requests.exceptions.ReadTimeout):
            print(f"{Style.GRAY}.", end="", flush=True)
            time.sleep(2)
    
    print()  # New line after dots
    return False

# ═══════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════

def run() -> None:
    """Initialize and run development environment"""
    print_header()
    
    # Cleanup existing processes
    kill_process_on_port(DEV_SERVER_PORT)
    subprocess.run('taskkill /IM ngrok.exe /F', shell=True, capture_output=True)
    time.sleep(1)
    
    npm_executable = 'npm.cmd' if os.name == 'nt' else 'npm'
    dev_server: Optional[subprocess.Popen] = None
    ngrok: Optional[subprocess.Popen] = None
    settlement_scheduler: Optional[subprocess.Popen] = None
    
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
        
        # Start bet settlement scheduler
        print_status("Starting bet settlement scheduler", "info")
        settlement_scheduler = subprocess.Popen(
            [npm_executable, 'run', 'settlement:scheduler'],
            cwd=PROJECT_PATH,
            shell=True,
            env=os.environ.copy()
        )
        
        time.sleep(1)
        print_status("Settlement scheduler active (5min intervals)", "success")
        
        # Display connection information
        print()
        print_separator()
        print(f"\n{Style.BOLD}{Style.GREEN}  ENVIRONMENT READY{Style.RESET}\n")
        print(f"  {Style.BOLD}Local:{Style.RESET}      {Style.CYAN}http://localhost:{DEV_SERVER_PORT}{Style.RESET}")
        print(f"  {Style.BOLD}Tunnel:{Style.RESET}     {Style.CYAN}https://{NGROK_STATIC_DOMAIN}{Style.RESET}")
        print(f"  {Style.BOLD}Settlement:{Style.RESET} {Style.GREEN}Active (every 5 minutes){Style.RESET}\n")
        print_separator()
        print(f"\n{Style.DIM}Press Ctrl+C to stop all services{Style.RESET}\n")
        
        # Keep running
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print(f"\n\n{Style.YELLOW}Shutdown initiated{Style.RESET}")
        print_separator()
    finally:
        if settlement_scheduler:
            print_status("Stopping settlement scheduler", "shutdown")
            settlement_scheduler.terminate()
        if ngrok:
            print_status("Terminating ngrok tunnel", "shutdown")
            ngrok.terminate()
        if dev_server:
            print_status("Stopping development server", "shutdown")
            dev_server.terminate()
        print_status("Shutdown complete", "success")
        print()

if __name__ == "__main__":
    run()
