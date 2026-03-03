from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import requests
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import io
from datetime import datetime
import base64

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
