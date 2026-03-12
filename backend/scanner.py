import asyncio
import asyncio.subprocess
import json
import logging
import os
from typing import Optional, Dict

logger = logging.getLogger(__name__)

class VulnerabilityScanner:
    """Scanner de vulnerabilidades usando o motor TypeScript `scanner.ts` via NodeJS"""
    
    def __init__(self, websocket_manager=None):
        self.websocket_manager = websocket_manager
    
    async def scan_target(self, scan_id: str, target: str, scan_type: str, status_callback=None):
        """Executa scan delegando para o processo TypeScript Node"""
        vulnerabilities = []
        root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # O npx deve estar disponível no PATH (Node.js instalado)
        scanner_dir = os.path.join(root_dir, "backend", "scanner")
        
        npx_cmd = "npx.cmd" if os.name == "nt" else "npx"
        command = [npx_cmd, "tsx", "run_scanner.ts", scan_id, target]
        
        try:
            logger.info(f"Iniciando TypeScript Scanner engine (scanId={scan_id}, target={target})")
            
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=scanner_dir
            )
            
            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                
                line_str = line.decode('utf-8', errors='ignore').strip()
                if not line_str:
                    continue
                    
                try:
                    data = json.loads(line_str)
                    event_type = data.get('type')
                    
                    if event_type == 'scan-update':
                        update_obj = data.get('update', {})
                        if status_callback:
                            await status_callback(update_obj)
                            
                    elif event_type == 'vulnerability-found':
                        vuln = data.get('vulnerability', {})
                        vulnerabilities.append({
                            "scan_id": vuln.get("scanId"),
                            "severity": vuln.get("severity"),
                            "title": vuln.get("title"),
                            "description": vuln.get("description"),
                            "category": vuln.get("category"),
                            "endpoint": vuln.get("endpoint"),
                            "payload": vuln.get("payload"),
                            "evidence": vuln.get("evidence"),
                            "recommendation": vuln.get("recommendation"),
                            "cve": vuln.get("cve")
                        })
                except json.JSONDecodeError:
                    # Logs do console normais ou output do ts-node
                    logger.debug(f"[TS Scanner]: {line_str}")
                    pass
                except Exception as e:
                    logger.error(f"Erro parseando JSON do TS Scanner: {e}")

            await process.wait()
            
            if status_callback:
                await status_callback({
                    "progress": 100,
                    "currentTask": "Scan completed",
                    "status": "completed"
                })
                
            return vulnerabilities
            
        except Exception as e:
            logger.error(f"Failed to execute TS scanner subprocess: {e}")
            
            # Avisa a UI que falhou
            if status_callback:
                await status_callback({
                    "progress": 100,
                    "currentTask": f"Erro fatal ao invocar scanner.ts: {e}",
                    "status": "error"
                })
            return vulnerabilities
