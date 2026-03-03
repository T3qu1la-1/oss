from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import requests
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import io
from datetime import datetime
import base64
import aiohttp
import asyncio
from bs4 import BeautifulSoup
from typing import List, Dict

router = APIRouter()

def extract_exif(image_data):
    """Extract EXIF data from image"""
    try:
        image = Image.open(io.BytesIO(image_data))
        exif_data = {}
        
        exif = image._getexif()
        if not exif:
            return {"error": "No EXIF data found"}
        
        # Extract basic info
        for tag_id, value in exif.items():
            tag = TAGS.get(tag_id, tag_id)
            
            # Handle GPS data
            if tag == "GPSInfo":
                gps_data = {}
                for gps_tag_id, gps_value in value.items():
                    gps_tag = GPSTAGS.get(gps_tag_id, gps_tag_id)
                    gps_data[gps_tag] = gps_value
                
                # Convert GPS to decimal degrees
                if "GPSLatitude" in gps_data and "GPSLongitude" in gps_data:
                    lat = gps_data["GPSLatitude"]
                    lon = gps_data["GPSLongitude"]
                    
                    lat_deg = float(lat[0]) + float(lat[1])/60 + float(lat[2])/3600
                    lon_deg = float(lon[0]) + float(lon[1])/60 + float(lon[2])/3600
                    
                    if gps_data.get("GPSLatitudeRef") == "S":
                        lat_deg = -lat_deg
                    if gps_data.get("GPSLongitudeRef") == "W":
                        lon_deg = -lon_deg
                    
                    exif_data["gps"] = {
                        "lat": round(lat_deg, 6),
                        "lng": round(lon_deg, 6)
                    }
            else:
                exif_data[tag] = str(value)
        
        return exif_data
    except Exception as e:
        return {"error": str(e)}

@router.post("/extract-exif")
async def extract_exif_endpoint(file: UploadFile = File(...)):
    """Extract EXIF metadata from uploaded image"""
    try:
        contents = await file.read()
        exif_data = extract_exif(contents)
        
        # Get image basic info
        image = Image.open(io.BytesIO(contents))
        
        result = {
            "camera": exif_data.get("Model", "Unknown"),
            "date": exif_data.get("DateTime", "Unknown"),
            "gps": exif_data.get("gps", {"lat": None, "lng": None}),
            "settings": {
                "iso": exif_data.get("ISOSpeedRatings", "Unknown"),
                "aperture": exif_data.get("FNumber", "Unknown"),
                "shutter": exif_data.get("ExposureTime", "Unknown"),
                "focal": exif_data.get("FocalLength", "Unknown")
            },
            "software": exif_data.get("Software", "Unknown"),
            "resolution": f"{image.width} x {image.height}",
            "size": f"{len(contents) / 1024:.2f} KB",
            "format": image.format
        }
        
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/clone-website")
async def clone_website(data: dict):
    """Clone website HTML"""
    try:
        url = data.get("url")
        if not url:
            raise HTTPException(status_code=400, detail="URL is required")
        
        # Fetch the website
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        return {
            "html": response.text,
            "status": response.status_code,
            "size": len(response.text)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/analyze-face")
async def analyze_face(file: UploadFile = File(...)):
    """Analyze face in image - placeholder for face-api.js integration"""
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # This would integrate with face-api.js or similar
        # For now, return structure for frontend to use
        return {
            "faces": 1,
            "width": image.width,
            "height": image.height,
            "format": image.format
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/reverse-image-search")
async def reverse_image_search(data: dict):
    """Perform reverse image search across multiple engines and return aggregated results"""
    try:
        image_url = data.get("imageUrl")
        if not image_url:
            raise HTTPException(status_code=400, detail="Image URL is required")
        
        engines = [
            {
                "name": "Google Images",
                "url": f"https://images.google.com/searchbyimage?image_url={image_url}",
                "search_url": f"https://www.google.com/searchbyimage?image_url={image_url}&encoded_image=&image_content=&filename=&hl=en"
            },
            {
                "name": "Yandex Images", 
                "url": f"https://yandex.com/images/search?rpt=imageview&url={image_url}",
                "search_url": f"https://yandex.com/images/search?rpt=imageview&url={image_url}"
            },
            {
                "name": "Bing Images",
                "url": f"https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIIRP&sbisrc=UrlPaste&q=imgurl:{image_url}",
                "search_url": f"https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIIRP&sbisrc=UrlPaste&q=imgurl:{image_url}"
            },
            {
                "name": "TinEye",
                "url": f"https://tineye.com/search?url={image_url}",
                "search_url": f"https://tineye.com/search?url={image_url}"
            }
        ]
        
        async def fetch_engine_results(session: aiohttp.ClientSession, engine: Dict) -> Dict:
            """Fetch results from a single search engine"""
            try:
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
                
                async with session.get(engine["search_url"], headers=headers, timeout=aiohttp.ClientTimeout(total=10), ssl=False) as response:
                    if response.status == 200:
                        html = await response.text()
                        
                        # Parse results based on engine
                        results_found = 0
                        snippet = ""
                        
                        if engine["name"] == "Google Images":
                            if "Best guess for this image" in html or "Pages that include matching images" in html:
                                results_found = html.count('<div class="g">')
                                soup = BeautifulSoup(html, 'html.parser')
                                guess = soup.find(string=lambda text: text and "Best guess" in text)
                                if guess:
                                    snippet = guess.strip()[:200]
                        
                        elif engine["name"] == "Yandex Images":
                            if "Similar images" in html or "Sites" in html:
                                results_found = html.count('serp-item')
                        
                        elif engine["name"] == "Bing Images":
                            if "Image results" in html or "Related" in html:
                                results_found = html.count('iusc')
                        
                        elif engine["name"] == "TinEye":
                            soup = BeautifulSoup(html, 'html.parser')
                            match_count = soup.find(class_='matches')
                            if match_count:
                                text = match_count.get_text()
                                import re
                                numbers = re.findall(r'\d+', text)
                                if numbers:
                                    results_found = int(numbers[0])
                        
                        return {
                            "engine": engine["name"],
                            "status": "success",
                            "results_found": results_found if results_found > 0 else "Unknown",
                            "url": engine["search_url"],
                            "snippet": snippet if snippet else "Resultados encontrados",
                            "available": results_found > 0 or "Similar" in html or "match" in html.lower()
                        }
                    else:
                        return {
                            "engine": engine["name"],
                            "status": "error",
                            "results_found": 0,
                            "url": engine["search_url"],
                            "snippet": f"HTTP {response.status}",
                            "available": False
                        }
            except asyncio.TimeoutError:
                return {
                    "engine": engine["name"],
                    "status": "timeout",
                    "results_found": 0,
                    "url": engine["search_url"],
                    "snippet": "Timeout ao buscar resultados",
                    "available": False
                }
            except Exception as e:
                return {
                    "engine": engine["name"],
                    "status": "error",
                    "results_found": 0,
                    "url": engine["search_url"],
                    "snippet": str(e)[:100],
                    "available": False
                }
        
        # Fetch all engines in parallel
        async with aiohttp.ClientSession() as session:
            tasks = [fetch_engine_results(session, engine) for engine in engines]
            results = await asyncio.gather(*tasks)
        
        return {
            "imageUrl": image_url,
            "engines": results,
            "totalEngines": len(engines),
            "successfulSearches": sum(1 for r in results if r["available"])
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
