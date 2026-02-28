// OLHOS DE DEUS - Base de 150+ Google Dorks Organizados
// Todos os dorks são reais e funcionais

export const dorksDatabase = {
  categories: [
    {
      id: 'login',
      name: 'Páginas de Login',
      icon: '🔐',
      description: 'Encontre páginas de login e autenticação',
      dorks: [
        { query: 'intitle:"login" inurl:admin', description: 'Painéis admin com login' },
        { query: 'intitle:"login" inurl:user', description: 'Páginas de login de usuário' },
        { query: 'inurl:wp-login.php', description: 'Login WordPress' },
        { query: 'inurl:administrator/index.php', description: 'Login Joomla' },
        { query: 'intitle:"Login" "admin" "password"', description: 'Logins com campos visíveis' },
        { query: 'inurl:/admin/login', description: 'Admin login genérico' },
        { query: 'inurl:signin inurl:admin', description: 'Signin admin' },
        { query: 'intitle:"Admin Login" "Username"', description: 'Admin login com username' },
        { query: 'inurl:auth/login', description: 'Auth endpoints' },
        { query: 'intitle:"Sign In" inurl:portal', description: 'Portais de login' },
      ]
    },
    {
      id: 'admin',
      name: 'Painéis Administrativos',
      icon: '⚙️',
      description: 'Painéis de administração expostos',
      dorks: [
        { query: 'intitle:"Dashboard" inurl:admin', description: 'Dashboards admin' },
        { query: 'inurl:admin intitle:"admin panel"', description: 'Painéis admin' },
        { query: 'inurl:cpanel', description: 'cPanel exposto' },
        { query: 'inurl:phpmyadmin', description: 'PHPMyAdmin exposto' },
        { query: 'intitle:"Webmin"', description: 'Webmin interface' },
        { query: 'inurl:/manager/html', description: 'Tomcat Manager' },
        { query: 'intitle:"Adminer"', description: 'Adminer database' },
        { query: 'inurl:wp-admin', description: 'WordPress Admin' },
        { query: 'intitle:"Control Panel" inurl:admin', description: 'Control panels' },
        { query: 'inurl:admin.php intitle:"Admin"', description: 'Admin PHP pages' },
        { query: 'inurl:backend intitle:"Admin"', description: 'Backend admin' },
        { query: 'intitle:"Site Administration"', description: 'Site admin' },
      ]
    },
    {
      id: 'database',
      name: 'Arquivos de Banco de Dados',
      icon: '🗄️',
      description: 'Dumps de database e backups SQL',
      dorks: [
        { query: 'ext:sql intext:password', description: 'SQL dumps com senhas' },
        { query: 'filetype:sql "insert into" password', description: 'SQL inserts com password' },
        { query: 'ext:sql intext:"CREATE TABLE"', description: 'SQL schema dumps' },
        { query: 'filetype:sql site:edu', description: 'SQL em sites educacionais' },
        { query: 'intitle:"index of" "database.sql"', description: 'Database SQL exposto' },
        { query: 'ext:sql intext:@gmail.com', description: 'SQL com emails Gmail' },
        { query: 'filetype:mdb inurl:database', description: 'Access database files' },
        { query: 'ext:sqlite intext:password', description: 'SQLite com senhas' },
        { query: 'intitle:"index of" backup.sql', description: 'Backup SQL' },
        { query: 'ext:sql "DROP TABLE"', description: 'SQL com DROP commands' },
      ]
    },
    {
      id: 'config',
      name: 'Arquivos de Configuração',
      icon: '📋',
      description: 'Arquivos de config com credenciais',
      dorks: [
        { query: 'ext:xml intext:password', description: 'XML com senhas' },
        { query: 'ext:conf intext:password', description: 'Config com senhas' },
        { query: 'ext:ini intext:password', description: 'INI files com senhas' },
        { query: 'filetype:env "DB_PASSWORD"', description: '.env com DB password' },
        { query: 'filetype:yml intext:password', description: 'YAML com senhas' },
        { query: 'intitle:"index of" web.config', description: 'ASP.NET config' },
        { query: 'ext:cfg intext:password', description: 'CFG files' },
        { query: 'filetype:properties intext:password', description: 'Java properties' },
        { query: 'ext:json intext:"password"', description: 'JSON com password' },
        { query: 'intitle:"index of" config.php', description: 'PHP config' },
        { query: 'ext:inc intext:mysql_connect', description: 'PHP includes' },
        { query: 'filetype:bak intext:password', description: 'Backup files' },
      ]
    },
    {
      id: 'sensitive',
      name: 'Documentos Sensíveis',
      icon: '📄',
      description: 'Documentos com informações sensíveis',
      dorks: [
        { query: 'filetype:pdf "confidential"', description: 'PDFs confidenciais' },
        { query: 'filetype:doc "internal use only"', description: 'Docs internos' },
        { query: 'filetype:xls intext:password', description: 'Excel com senhas' },
        { query: 'filetype:ppt "not for distribution"', description: 'PPT restritos' },
        { query: 'ext:pdf intext:"social security"', description: 'PDFs com SSN' },
        { query: 'filetype:pdf intext:"salary"', description: 'Documentos de salário' },
        { query: 'ext:doc intext:"private"', description: 'Docs privados' },
        { query: 'filetype:xlsx "employee"', description: 'Planilhas de funcionários' },
        { query: 'ext:pdf "bank statement"', description: 'Extratos bancários' },
        { query: 'filetype:csv intext:email password', description: 'CSV com credenciais' },
      ]
    },
    {
      id: 'cameras',
      name: 'Câmeras e IoT',
      icon: '📹',
      description: 'Câmeras IP e dispositivos IoT expostos',
      dorks: [
        { query: 'intitle:"Live View / - AXIS"', description: 'Câmeras AXIS' },
        { query: 'inurl:view/index.shtml', description: 'Câmeras genéricas' },
        { query: 'intitle:"webcamXP 5"', description: 'WebcamXP' },
        { query: 'inurl:"ViewerFrame?Mode="', description: 'Panasonic cams' },
        { query: 'intitle:"Network Camera"', description: 'Network cameras' },
        { query: 'inurl:/view.shtml', description: 'Câmeras MOBOTIX' },
        { query: 'intitle:"IP CAMERA Viewer"', description: 'IP Camera viewers' },
        { query: 'inurl:lvappl intitle:liveapplet', description: 'Canon cams' },
        { query: 'intitle:"i-Catcher Console"', description: 'i-Catcher cams' },
        { query: 'inurl:"CgiStart?page="', description: 'Toshiba cams' },
        { query: 'intitle:"BlueIris Login"', description: 'BlueIris DVR' },
        { query: 'inurl:"/control/userimage.html"', description: 'Câmeras DVR' },
      ]
    },
    {
      id: 'wordpress',
      name: 'WordPress',
      icon: '📝',
      description: 'Vulnerabilidades e exposições WordPress',
      dorks: [
        { query: 'inurl:wp-content/uploads', description: 'Uploads WordPress' },
        { query: 'inurl:wp-config.php.bak', description: 'Backup wp-config' },
        { query: 'intitle:"Index of" wp-admin', description: 'WP-Admin exposto' },
        { query: 'inurl:wp-includes/certificates', description: 'Certificados WP' },
        { query: 'ext:txt inurl:wp-content', description: 'TXT em wp-content' },
        { query: 'inurl:xmlrpc.php', description: 'XMLRPC endpoint' },
        { query: 'inurl:wp-json/wp/v2/users', description: 'API users WP' },
        { query: 'intitle:"WordPress" inurl:readme.html', description: 'WP readme' },
        { query: 'inurl:wp-content/debug.log', description: 'WP debug logs' },
        { query: 'inurl:wp-content/uploads/wpcf7_uploads', description: 'Contact Form uploads' },
      ]
    },
    {
      id: 'email',
      name: 'Emails e Credenciais',
      icon: '📧',
      description: 'Listas de email e credenciais expostas',
      dorks: [
        { query: 'filetype:xls intext:email', description: 'Excel com emails' },
        { query: 'ext:txt intext:@gmail.com password', description: 'Gmail + password' },
        { query: 'filetype:csv "email" "password"', description: 'CSV credentials' },
        { query: 'intext:"email" intext:"password" filetype:log', description: 'Logs com creds' },
        { query: 'ext:sql intext:@hotmail.com', description: 'SQL com Hotmail' },
        { query: 'filetype:txt intext:@yahoo.com', description: 'TXT com Yahoo' },
        { query: 'inurl:email filetype:mdb', description: 'MDB com emails' },
        { query: 'ext:bak intext:@', description: 'Backups com emails' },
        { query: 'filetype:log intext:"password="', description: 'Logs com passwords' },
        { query: 'intext:"username" intext:"password" ext:log', description: 'Login logs' },
      ]
    },
    {
      id: 'ftp',
      name: 'Servidores FTP',
      icon: '📂',
      description: 'Servidores FTP abertos e index of',
      dorks: [
        { query: 'intitle:"index of" "ftp"', description: 'FTP index' },
        { query: 'intitle:"index of" inurl:ftp', description: 'FTP directories' },
        { query: 'intitle:"index of" "Parent Directory"', description: 'Directory listing' },
        { query: 'intitle:"index of" "password.txt"', description: 'Password files' },
        { query: 'intitle:"index of" ".htpasswd"', description: 'HTPasswd files' },
        { query: 'intitle:"index of" "backup"', description: 'Backup folders' },
        { query: 'intitle:"index of" "private"', description: 'Private directories' },
        { query: 'intitle:"index of" "admin"', description: 'Admin directories' },
        { query: 'intitle:"index of" "secret"', description: 'Secret folders' },
        { query: 'intitle:"index of" "confidential"', description: 'Confidential dirs' },
      ]
    },
    {
      id: 'logs',
      name: 'Logs e Debug',
      icon: '📊',
      description: 'Arquivos de log e debug expostos',
      dorks: [
        { query: 'ext:log intext:password', description: 'Logs com password' },
        { query: 'filetype:log "PHP Warning"', description: 'PHP warnings' },
        { query: 'ext:log intext:"authentication"', description: 'Auth logs' },
        { query: 'filetype:log intext:"error"', description: 'Error logs' },
        { query: 'intitle:"Apache Status"', description: 'Apache status' },
        { query: 'inurl:access.log', description: 'Access logs' },
        { query: 'inurl:error.log', description: 'Error logs' },
        { query: 'filetype:log "SQL"', description: 'SQL logs' },
        { query: 'ext:log "failed login"', description: 'Failed login logs' },
        { query: 'inurl:debug.log', description: 'Debug logs' },
      ]
    },
    {
      id: 'git',
      name: 'Repositórios Git',
      icon: '🔗',
      description: 'Repositórios Git e código fonte exposto',
      dorks: [
        { query: 'intitle:"index of" ".git"', description: '.git folders' },
        { query: 'inurl:".git/config"', description: 'Git config' },
        { query: 'intitle:"index of" ".svn"', description: 'SVN repos' },
        { query: 'inurl:".env" "DB_PASSWORD"', description: 'Env files' },
        { query: 'intitle:"index of" ".hg"', description: 'Mercurial repos' },
        { query: 'filetype:gitignore', description: 'Gitignore files' },
        { query: 'inurl:gitlab ext:php', description: 'GitLab instances' },
        { query: 'intitle:"Gitea"', description: 'Gitea instances' },
        { query: 'inurl:bitbucket', description: 'Bitbucket links' },
        { query: 'intext:"BEGIN RSA PRIVATE KEY"', description: 'Private keys' },
      ]
    },
    {
      id: 'api',
      name: 'APIs e Endpoints',
      icon: '🔌',
      description: 'APIs expostas e documentação',
      dorks: [
        { query: 'inurl:api intext:apikey', description: 'APIs com keys' },
        { query: 'intitle:"Swagger UI"', description: 'Swagger docs' },
        { query: 'inurl:graphql intitle:"GraphQL"', description: 'GraphQL endpoints' },
        { query: 'inurl:"/api/v1"', description: 'API v1 endpoints' },
        { query: 'intitle:"API Documentation"', description: 'API docs' },
        { query: 'inurl:api-docs', description: 'API documentation' },
        { query: 'intext:"api_key" ext:json', description: 'API keys em JSON' },
        { query: 'inurl:rest/api', description: 'REST APIs' },
        { query: 'intitle:"Postman" ext:json', description: 'Postman collections' },
        { query: 'inurl:api filetype:yaml', description: 'API YAML specs' },
      ]
    },
    {
      id: 'cloud',
      name: 'Cloud Storage',
      icon: '☁️',
      description: 'Buckets S3, Azure e GCP expostos',
      dorks: [
        { query: 'site:s3.amazonaws.com', description: 'S3 buckets públicos' },
        { query: 'site:blob.core.windows.net', description: 'Azure blobs' },
        { query: 'site:storage.googleapis.com', description: 'GCP storage' },
        { query: 'inurl:digitaloceanspaces.com', description: 'DigitalOcean spaces' },
        { query: 'intitle:"Index of" site:s3.amazonaws.com', description: 'S3 listing' },
        { query: 'site:firebasestorage.googleapis.com', description: 'Firebase storage' },
        { query: 'site:storage.cloud.google.com', description: 'GCloud storage' },
        { query: 'inurl:cloudfront.net', description: 'CloudFront assets' },
        { query: 'site:core.windows.net', description: 'Azure core' },
        { query: 'site:s3.amazonaws.com filetype:pdf', description: 'S3 PDFs' },
      ]
    },
    {
      id: 'network',
      name: 'Dispositivos de Rede',
      icon: '🌐',
      description: 'Roteadores, switches e firewalls',
      dorks: [
        { query: 'intitle:"RouterOS" inurl:winbox', description: 'MikroTik routers' },
        { query: 'intitle:"DD-WRT"', description: 'DD-WRT routers' },
        { query: 'intitle:"pfSense"', description: 'pfSense firewalls' },
        { query: 'intitle:"OpenWrt"', description: 'OpenWrt routers' },
        { query: 'intitle:"NETGEAR"', description: 'NETGEAR devices' },
        { query: 'intitle:"TP-LINK"', description: 'TP-Link routers' },
        { query: 'intitle:"Cisco"', description: 'Cisco devices' },
        { query: 'intitle:"Ubiquiti"', description: 'Ubiquiti devices' },
        { query: 'intitle:"FortiGate"', description: 'FortiGate firewalls' },
        { query: 'inurl:"/cgi-bin/luci"', description: 'OpenWrt interface' },
      ]
    },
    {
      id: 'vuln',
      name: 'Vulnerabilidades Conhecidas',
      icon: '🐛',
      description: 'Aplicações com vulnerabilidades conhecidas',
      dorks: [
        { query: 'inurl:"/cgi-bin/php"', description: 'PHP CGI vulns' },
        { query: 'intitle:"phpMyAdmin" inurl:setup', description: 'phpMyAdmin setup' },
        { query: 'inurl:"/wp-includes/wlwmanifest.xml"', description: 'WP enumeration' },
        { query: 'inurl:fckeditor', description: 'FCKEditor vulns' },
        { query: 'inurl:"/elfinder/"', description: 'elFinder vulns' },
        { query: 'inurl:"/tinymce/"', description: 'TinyMCE instances' },
        { query: 'intitle:"Apache Tomcat" intitle:"Error"', description: 'Tomcat errors' },
        { query: 'inurl:"/jmx-console/"', description: 'JBoss JMX' },
        { query: 'intitle:"Jenkins" intitle:"Dashboard"', description: 'Jenkins open' },
        { query: 'inurl:"/solr/admin"', description: 'Apache Solr admin' },
      ]
    },
  ],
  
  // Dorks por alvo específico (quando usuário digita domínio)
  targetedDorks: [
    { query: 'site:{TARGET}', description: 'Todas as páginas indexadas' },
    { query: 'site:{TARGET} filetype:pdf', description: 'PDFs do site' },
    { query: 'site:{TARGET} filetype:doc OR filetype:docx', description: 'Documentos Word' },
    { query: 'site:{TARGET} filetype:xls OR filetype:xlsx', description: 'Planilhas Excel' },
    { query: 'site:{TARGET} inurl:admin', description: 'Páginas admin' },
    { query: 'site:{TARGET} inurl:login', description: 'Páginas de login' },
    { query: 'site:{TARGET} intitle:"index of"', description: 'Directory listings' },
    { query: 'site:{TARGET} ext:sql', description: 'Arquivos SQL' },
    { query: 'site:{TARGET} ext:conf OR ext:cfg', description: 'Configs' },
    { query: 'site:{TARGET} ext:log', description: 'Logs' },
    { query: 'site:{TARGET} ext:bak OR ext:backup', description: 'Backups' },
    { query: 'site:{TARGET} ext:txt password', description: 'TXT com password' },
    { query: 'site:{TARGET} intext:password', description: 'Páginas com password' },
    { query: 'site:{TARGET} intext:username', description: 'Páginas com username' },
    { query: 'site:{TARGET} inurl:wp-content', description: 'WordPress content' },
    { query: 'site:{TARGET} inurl:api', description: 'Endpoints API' },
    { query: 'site:{TARGET} "php error"', description: 'Erros PHP' },
    { query: 'site:{TARGET} "mysql error"', description: 'Erros MySQL' },
    { query: 'site:{TARGET} inurl:backup', description: 'Páginas de backup' },
    { query: 'site:{TARGET} inurl:test', description: 'Páginas de teste' },
    { query: 'site:{TARGET} intitle:test', description: 'Títulos com test' },
    { query: 'site:{TARGET} inurl:dev', description: 'Desenvolvimento' },
    { query: 'site:{TARGET} inurl:staging', description: 'Staging env' },
    { query: 'site:{TARGET} ext:env', description: 'Arquivos .env' },
    { query: 'site:{TARGET} ext:json', description: 'Arquivos JSON' },
  ],

  // Total de dorks para exibir
  getTotalCount: function() {
    let total = 0;
    this.categories.forEach(cat => {
      total += cat.dorks.length;
    });
    total += this.targetedDorks.length;
    return total;
  }
};

export default dorksDatabase;
