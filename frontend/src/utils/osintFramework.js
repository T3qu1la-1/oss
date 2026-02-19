// Estrutura completa do OSINT Framework
export const osintFramework = [
  {
    category: "🔍 Busca de Usuários",
    tools: [
      { name: "Knowem", url: "https://knowem.com/", description: "Busca de username em 500+ sites" },
      { name: "WhatsMyName", url: "https://whatsmyname.app/", description: "Busca de username" },
      { name: "NameChk", url: "https://namechk.com/", description: "Verificador de disponibilidade" },
      { name: "Sherlock", url: "https://github.com/sherlock-project/sherlock", description: "Hunt usernames" }
    ]
  },
  {
    category: "📧 Email",
    tools: [
      { name: "Hunter.io", url: "https://hunter.io/", description: "Busca de emails" },
      { name: "Have I Been Pwned", url: "https://haveibeenpwned.com/", description: "Verifica vazamentos" },
      { name: "EmailRep", url: "https://emailrep.io/", description: "Reputação de email" },
      { name: "Email Header Analyzer", url: "https://mxtoolbox.com/EmailHeaders.aspx", description: "Análise de cabeçalhos" }
    ]
  },
  {
    category: "📱 Telefone",
    tools: [
      { name: "TrueCaller", url: "https://www.truecaller.com/", description: "Identificação de número" },
      { name: "Phone Validator", url: "https://www.phonevalidator.com/", description: "Validação de telefone" },
      { name: "Reverse Phone Lookup", url: "https://www.reversephonelookup.com/", description: "Busca reversa" }
    ]
  },
  {
    category: "🌐 Redes Sociais",
    tools: [
      { name: "Social Searcher", url: "https://www.social-searcher.com/", description: "Busca em redes sociais" },
      { name: "TweetDeck", url: "https://tweetdeck.twitter.com/", description: "Monitoramento Twitter" },
      { name: "Facebook Graph Search", url: "https://www.facebook.com/", description: "Busca avançada Facebook" },
      { name: "Instagram OSINT", url: "https://osintgram.com/", description: "Análise Instagram" }
    ]
  },
  {
    category: "🖼️ Imagens",
    tools: [
      { name: "Google Images", url: "https://images.google.com/", description: "Busca reversa" },
      { name: "TinEye", url: "https://tineye.com/", description: "Busca reversa de imagens" },
      { name: "Yandex Images", url: "https://yandex.com/images/", description: "Busca reversa" },
      { name: "Jeffrey's Image Metadata Viewer", url: "http://exif.regex.info/", description: "Extração EXIF" }
    ]
  },
  {
    category: "🗺️ Geolocalização",
    tools: [
      { name: "Google Earth", url: "https://earth.google.com/", description: "Imagens de satélite" },
      { name: "GeoGuessr", url: "https://www.geoguessr.com/", description: "Jogo de geolocalização" },
      { name: "Wikimapia", url: "http://wikimapia.org/", description: "Mapa colaborativo" },
      { name: "OpenStreetMap", url: "https://www.openstreetmap.org/", description: "Mapa livre" }
    ]
  },
  {
    category: "🌍 Domínios/IPs",
    tools: [
      { name: "WHOIS", url: "https://who.is/", description: "Informações de domínio" },
      { name: "ViewDNS", url: "https://viewdns.info/", description: "Ferramentas DNS" },
      { name: "Shodan", url: "https://www.shodan.io/", description: "Motor de busca IoT" },
      { name: "Censys", url: "https://censys.io/", description: "Busca de dispositivos" },
      { name: "SecurityTrails", url: "https://securitytrails.com/", description: "Histórico DNS" },
      { name: "BuiltWith", url: "https://builtwith.com/", description: "Tecnologias do site" }
    ]
  },
  {
    category: "📄 Documentos",
    tools: [
      { name: "DocumentCloud", url: "https://www.documentcloud.org/", description: "Biblioteca de documentos" },
      { name: "PDF Examiner", url: "https://www.pdfexaminer.com/", description: "Análise de PDF" },
      { name: "FOCA", url: "https://github.com/ElevenPaths/FOCA", description: "Extração de metadados" }
    ]
  },
  {
    category: "💼 Empresas",
    tools: [
      { name: "OpenCorporates", url: "https://opencorporates.com/", description: "Registro de empresas" },
      { name: "Crunchbase", url: "https://www.crunchbase.com/", description: "Informações de startups" },
      { name: "LinkedIn", url: "https://www.linkedin.com/", description: "Rede profissional" }
    ]
  },
  {
    category: "🎥 Vídeos",
    tools: [
      { name: "YouTube DataViewer", url: "https://citizenevidence.amnestyusa.org/", description: "Análise de vídeos YouTube" },
      { name: "InVID", url: "https://www.invid-project.eu/", description: "Verificação de vídeos" }
    ]
  },
  {
    category: "🗞️ Notícias",
    tools: [
      { name: "Google News", url: "https://news.google.com/", description: "Agregador de notícias" },
      { name: "NewsNow", url: "https://www.newsnow.co.uk/", description: "Notícias em tempo real" },
      { name: "Wayback Machine", url: "https://archive.org/web/", description: "Arquivo da web" }
    ]
  },
  {
    category: "🔐 Vazamentos",
    tools: [
      { name: "Have I Been Pwned", url: "https://haveibeenpwned.com/", description: "Verifica vazamentos" },
      { name: "DeHashed", url: "https://dehashed.com/", description: "Busca em vazamentos" },
      { name: "LeakCheck", url: "https://leakcheck.io/", description: "Busca de credenciais" }
    ]
  },
  {
    category: "🛰️ Satélite/Aviação",
    tools: [
      { name: "FlightRadar24", url: "https://www.flightradar24.com/", description: "Rastreamento de voos" },
      { name: "MarineTraffic", url: "https://www.marinetraffic.com/", description: "Rastreamento marítimo" },
      { name: "Satellite Map", url: "https://maps.esri.com/", description: "Imagens de satélite" }
    ]
  },
  {
    category: "🔧 Ferramentas Gerais",
    tools: [
      { name: "Maltego", url: "https://www.maltego.com/", description: "Link analysis" },
      { name: "SpiderFoot", url: "https://www.spiderfoot.net/", description: "Automação OSINT" },
      { name: "Recon-ng", url: "https://github.com/lanmaster53/recon-ng", description: "Framework de reconhecimento" },
      { name: "theHarvester", url: "https://github.com/laramies/theHarvester", description: "Coleta de informações" }
    ]
  },
  {
    category: "🌐 Dark Web",
    tools: [
      { name: "Tor Browser", url: "https://www.torproject.org/", description: "Navegador anônimo" },
      { name: "Ahmia", url: "https://ahmia.fi/", description: "Motor de busca .onion" },
      { name: "DarkSearch", url: "https://darksearch.io/", description: "Busca dark web" }
    ]
  },
  {
    category: "📊 Dados Públicos",
    tools: [
      { name: "PublicWWW", url: "https://publicwww.com/", description: "Busca em código fonte" },
      { name: "Pastebin", url: "https://pastebin.com/", description: "Busca em pastes" },
      { name: "GitHub Search", url: "https://github.com/search", description: "Busca em repositórios" }
    ]
  }
];
