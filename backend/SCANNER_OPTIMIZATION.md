# Scanner Optimizations
# Add to mega_scanner.py at class level

# Optimize by:
# 1. Increase connector limit to 50
# 2. Reduce timeout to 5 seconds
# 3. Add semaphore to limit concurrent requests
# 4. Skip redundant tests

# Updated __aenter__ method:
async def __aenter__(self):
    self.session = aiohttp.ClientSession(
        timeout=aiohttp.ClientTimeout(total=5),  # Reduced from 10
        connector=aiohttp.TCPConnector(ssl=False, limit=50)  # Increased from 20
    )
    self.semaphore = asyncio.Semaphore(30)  # Max 30 concurrent requests
    return self

# Updated make_request to use semaphore:
async def make_request(self, url: str, method: str = "GET", headers: Dict = None, 
                      data: Any = None, allow_redirects: bool = False) -> Dict:
    try:
        async with self.semaphore:
            async with self.session.request(
                method=method, url=url, headers=headers or {},
                data=data, allow_redirects=allow_redirects
            ) as response:
                body = await response.text()
                return {
                    "status_code": response.status,
                    "headers": dict(response.headers),
                    "body": body[:10000],  # Reduced from 15000
                    "url": str(response.url)
                }
    except Exception:
        return {"status_code": 0, "headers": {}, "body": "", "url": url}
