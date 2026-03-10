import requests
import time
import threading

# Config
TARGET_URL = "http://localhost:8080/auth/index.php?test_ddos=1" # Using test_ddos flag to bypass localhost whitelist
NUM_THREADS = 10
REQUESTS_PER_THREAD = 10

def ddos_test():
    for _ in range(REQUESTS_PER_THREAD):
        try:
            # Adding a custom user-agent to bypass the simple built-in bot check
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            response = requests.get(TARGET_URL, headers=headers, timeout=2)
            print(f"Status: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"Error: {e}")
        time.sleep(0.1)

print(f"Starting DDoS simulation test on {TARGET_URL}")
print(f"Sending {NUM_THREADS * REQUESTS_PER_THREAD} requests...")

threads = []
for _ in range(NUM_THREADS):
    t = threading.Thread(target=ddos_test)
    threads.append(t)
    t.start()

for t in threads:
    t.join()

print("Test finished.")
