#!/usr/bin/env python3
import sys
import re
import time
import subprocess
import argparse
import os
import json
import urllib.request
import urllib.parse

# ANSI escape codes for colors
RESET = "\033[0m"
BOLD = "\033[1m"
GREEN = "\033[32m"
RED = "\033[31m"
YELLOW = "\033[33m"
BLUE = "\033[34m"
MAGENTA = "\033[35m"
CYAN = "\033[36m"
WHITE = "\033[37m"

# Nginx Combined Log Regex
# 127.0.0.1 - - [08/Jun/2026:15:30:00 +0700] "GET /path HTTP/1.1" 200 1234 "referer" "user-agent"
NGINX_REGEX = re.compile(
    r'^(\S+) \S+ \S+ \[([^\]]+)\] "([A-Z]+) (\S+)\s*[^"]*" (\d+) (\d+)'
)

# Local cache to avoid calling Geolocation API repeatedly for the same IP
IP_LOCATION_CACHE = {}

def get_ip_location(ip):
    # Filter local/private IPs
    if ip == "127.0.0.1" or ip.startswith("172.") or ip.startswith("10.") or ip.startswith("192.168."):
        return "Local Network"
    if ip in IP_LOCATION_CACHE:
        return IP_LOCATION_CACHE[ip]
    
    try:
        # Fetch geolocation from free ip-api.com (no key needed, fast)
        url = f"http://ip-api.com/json/{ip}?fields=status,countryCode,city"
        # Set 2-second timeout to avoid blocking the log stream if API is slow
        with urllib.request.urlopen(url, timeout=2) as response:
            data = json.loads(response.read().decode('utf-8'))
            if data.get("status") == "success":
                country = data.get("countryCode", "")
                city = data.get("city", "")
                location = f"{country} ({city})" if country and city else country or "Unknown"
            else:
                location = "Unknown"
    except Exception:
        location = "Unknown"
        
    IP_LOCATION_CACHE[ip] = location
    return location

def get_status_style(status_code):
    try:
        code = int(status_code)
        if 200 <= code < 300:
            return f"{GREEN}✔ {code}{RESET}", "Success"
        elif 300 <= code < 400:
            return f"{CYAN}ℹ {code}{RESET}", "Redirect"
        elif 400 <= code < 500:
            return f"{YELLOW}⚠ {code}{RESET}", "Client Error"
        else:
            return f"{RED}✖ {code}{RESET}", "Server Error"
    except ValueError:
        return f"{WHITE}{status_code}{RESET}", "Unknown"

def get_method_style(method):
    method = method.upper()
    if method == "GET":
        return f"{GREEN}{method}{RESET}"
    elif method == "POST":
        return f"{BLUE}{method}{RESET}"
    elif method == "PUT":
        return f"{YELLOW}{method}{RESET}"
    elif method == "DELETE":
        return f"{RED}{method}{RESET}"
    else:
        return f"{MAGENTA}{method}{RESET}"

def parse_nginx_date(date_str):
    # e.g., 08/Jun/2026:15:30:00 +0700
    try:
        parts = date_str.split(':')
        if len(parts) >= 3:
            # return HH:MM:SS
            return parts[1] + ":" + parts[2] + ":" + parts[3].split()[0]
    except Exception:
        pass
    return date_str

def process_line(line):
    line = line.strip()
    if not line:
        return
    
    match = NGINX_REGEX.match(line)
    if not match:
        # Check if it contains raw Nginx-like request
        # Sometimes docker logs have some headers prefixing
        # Let's try to search for Nginx pattern inside the line
        search = NGINX_REGEX.search(line)
        if search:
            match = search
        else:
            # Fallback for unrecognized formats (e.g., raw backend print logs)
            if "GET" in line or "POST" in line or "PUT" in line or "DELETE" in line:
                print(f"{WHITE}[Raw Log]{RESET} {line}")
            return

    ip, date_str, method, path, status, size = match.groups()
    
    time_formatted = parse_nginx_date(date_str)
    status_styled, _ = get_status_style(status)
    method_styled = get_method_style(method)
    location = get_ip_location(ip)
    
    # Highlight API vs Page
    if path.startswith("/api/"):
        path_styled = f"{MAGENTA}{path}{RESET}"
    else:
        path_styled = f"{WHITE}{path}{RESET}"
        
    print(f" {time_formatted:<8}  {ip:<15}  {location:<16}  {method_styled:<14}  {status_styled:<15}  {path_styled}")

def print_header():
    print(f"{BOLD}{CYAN}")
    print(" ┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐")
    print(" │                                JAKSU HEALTH LIVE TRAFFIC MONITOR                                     │")
    print(" └──────────────────────────────────────────────────────────────────────────────────────────────────────┘")
    print(f"{RESET}")
    print(f" {BOLD}{WHITE}{'Time':<8}  {'IP Address':<15}  {'Location':<16}  {'Method':<5}   {'Status':<6}    {'URI / Path'}{RESET}")
    print(f" {CYAN}────────────────────────────────────────────────────────────────────────────────────────────────────────{RESET}")
    sys.stdout.flush()

def follow_file(filepath):
    print(f"{YELLOW}Monitoring log file: {filepath}{RESET}\n")
    print_header()
    try:
        # Seek to end first
        with open(filepath, 'r') as f:
            f.seek(0, 2)
            while True:
                line = f.readline()
                if not line:
                    time.sleep(0.1)
                    continue
                process_line(line)
                sys.stdout.flush()
    except PermissionError:
        print(f"{RED}Error: Permission denied to read {filepath}. Try running with sudo.{RESET}")
    except FileNotFoundError:
        print(f"{RED}Error: Log file not found at {filepath}.{RESET}")

def follow_stdin():
    print(f"{YELLOW}Monitoring from Stdin...{RESET}\n")
    print_header()
    try:
        for line in sys.stdin:
            process_line(line)
            sys.stdout.flush()
    except KeyboardInterrupt:
        pass

def follow_docker(container_name):
    print(f"{YELLOW}Monitoring docker container: {container_name}...{RESET}\n")
    print_header()
    try:
        proc = subprocess.Popen(
            ["docker", "logs", "-f", "--tail", "10", container_name],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )
        for line in proc.stdout:
            process_line(line)
            sys.stdout.flush()
    except KeyboardInterrupt:
        pass
    except Exception as e:
        print(f"{RED}Error running docker logs: {e}{RESET}")

def main():
    parser = argparse.ArgumentParser(description="JaksuHealth Live Nginx/Docker Log Monitor")
    parser.add_argument("--file", "-f", help="Path to Nginx access.log file")
    parser.add_argument("--docker", "-d", help="Docker container name to monitor")
    parser.add_argument("--stdin", "-s", action="store_true", help="Read from stdin")
    
    args = parser.parse_args()
    
    # Auto-detect mode if no args given
    if not (args.file or args.docker or args.stdin):
        # Check if we are running in piping environment
        if not sys.stdin.isatty():
            args.stdin = True
        # Check default Nginx log location on Linux
        elif os.path.exists("/var/log/nginx/access.log") and os.access("/var/log/nginx/access.log", os.R_OK):
            args.file = "/var/log/nginx/access.log"
        # Check if docker command exists and frontend container is running
        else:
            # Check if docker container exists
            try:
                res = subprocess.run(["docker", "ps", "-q", "-f", "name=jaksuhealth-frontend"], capture_output=True, text=True)
                if res.stdout.strip():
                    args.docker = "jaksuhealth-frontend"
            except Exception:
                pass
                
    if args.stdin:
        follow_stdin()
    elif args.docker:
        follow_docker(args.docker)
    elif args.file:
        follow_file(args.file)
    else:
        # Fallback to stdin guide
        print(f"{YELLOW}No source specified and couldn't auto-detect. Reading from stdin...{RESET}")
        print("Usage examples:")
        print("  sudo python3 monitor.py                    (auto-detects nginx log)")
        print("  python3 monitor.py -d jaksuhealth-frontend (monitors docker container)")
        print("  tail -f /var/log/nginx/access.log | python3 monitor.py")
        print()
        follow_stdin()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Monitor stopped.{RESET}")
