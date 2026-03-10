# GeoKit - Advanced Geolocation Toolkit

## 🌍 Visão Geral

GeoKit é uma plataforma profissional de geolocalização e OSINT geográfico integrada ao **Olhos De Deus**. Baseado no projeto [EarthKit](https://github.com/JettChenT/earthkit) (GPL v3), oferece ferramentas avançadas para análise e visualização geoespacial.

## ✨ Funcionalidades Principais

### 1. 🗺️ Mapa 3D Interativo
- **Visualização 3D** com Deck.GL
- Controle de pitch, bearing e zoom
- **Marcação de pontos** customizados
- **Heatmaps** dinâmicos com gradiente de cores
- **Arcos conectando pontos** (visualização de rotas)
- Exportação em **GeoJSON**
- Quick locations (Brasil, NY, Tóquio, Londres, etc)

### 2. 🤖 GeoClip AI
- **Upload de imagens** para predição de localização
- Análise com **Deep Learning**
- **Heatmap de probabilidade** de localização
- **Top-K predições** com score de confiança
- Exportação de resultados
- **Demo Mode** (simulação - requer backend ML para produção)

### 3. 🔍 Busca Global de Localizações
- Busca em **220+ países**
- **Geocoding** e **Reverse Geocoding**
- POIs, endereços, cidades, monumentos
- Dados do **OpenStreetMap Nominatim**
- Histórico de buscas
- Exportação de resultados

### 4. 🎯 Analisador de Coordenadas
- **Conversão de formatos**:
  - Decimal (DD)
  - DMS (Graus, Minutos, Segundos)
  - UTM (Universal Transverse Mercator)
- **Reverse geocoding** (coordenadas → endereço)
- Informações administrativas (país, estado, cidade)
- Links diretos para Google Maps
- Copy to clipboard
- Exportação completa

### 5. 🛰️ Visão Satélite (Experimental)
- Baseado em **EigenPlaces** (Visual Place Recognition)
- **Sample4Geo** para cross-view geolocation
- Comparação satélite ↔ ground level
- **Nota**: Requer backend Modal com GPU e modelos ML

## 🛠️ Stack Tecnológico

### Frontend
- **React 19** - Framework principal
- **Deck.GL** - Visualização 3D e heatmaps
- **MapLibre GL** - Mapas base open-source
- **React-Map-GL** - Integração React + MapLibre
- **Turf.js** - Cálculos geoespaciais
- **Axios** - Requisições HTTP
- **Lucide React** - Ícones

### APIs Externas
- **OpenStreetMap Nominatim** - Geocoding/Reverse Geocoding
- **CartoDB** - Base maps (Dark Matter style)

### Dados
- **OpenStreetMap** - Dados geográficos
- **GeoJSON** - Formato de exportação

## 📦 Instalação

As dependências já estão instaladas, mas caso precise reinstalar:

```bash
cd /app/frontend
yarn add deck.gl @deck.gl/react @deck.gl/layers react-map-gl maplibre-gl
yarn add @turf/turf @deck.gl-community/editable-layers
yarn add axios zustand immer osmtogeojson
```

## 🚀 Uso

1. Acesse o site: http://localhost:3000
2. Clique no menu **GeoKit** (ícone de globo 🌍)
3. Escolha a ferramenta desejada nas tabs

### Mapa 3D
1. Use os controles para adicionar pontos
2. Gere heatmaps clicando em "Heatmap"
3. Exporte em GeoJSON

### GeoClip
1. Faça upload de uma imagem
2. Clique em "Analisar Localização"
3. Visualize o heatmap de predições

### Busca de Locais
1. Digite um endereço ou local
2. Veja os resultados no mapa
3. Clique para voar até o local

### Coordenadas
1. Insira lat/lng em formato decimal
2. Veja conversões automáticas
3. Copie ou exporte os dados

## 🎨 Design

O GeoKit segue o tema **cyberpunk/hacker** do Olhos De Deus:
- 🟢 Verde neon (#00ff00) como cor principal
- 🔵 Cyan (#00ffff) para destaques
- ⚫ Dark backgrounds com gradientes
- ✨ Animações fluidas e transições
- 🔲 Borders neon com glow effects

## 📝 Licença

Este módulo é baseado no [EarthKit](https://github.com/JettChenT/earthkit) por JettChenT.

**Licença Original**: GPL v3
**Adaptação**: Mantém GPL v3
**Créditos**: JettChenT (autor original)
**Adaptação para**: Olhos De Deus

## ⚠️ Notas Importantes

### GeoClip AI
- Atualmente em **modo demo** (dados simulados)
- Para análise real, requer:
  - Backend com modelo GeoClip
  - Infraestrutura Modal.com com GPU
  - Base de imagens georreferenciadas

### Satélite View
- Feature **experimental**
- Requer infraestrutura complexa:
  - Modal.com com GPUs
  - Modelos Sample4Geo + EigenPlaces
  - Base de imagens satélite e street view
  - Cold-boot time: ~2-3 minutos

### Rate Limiting
- Nominatim API tem limite de 1 req/segundo
- Respeite os [Usage Policies](https://operations.osmfoundation.org/policies/nominatim/)

## 🔗 Links Úteis

- **EarthKit Original**: https://github.com/JettChenT/earthkit
- **Deck.GL Docs**: https://deck.gl/docs
- **MapLibre GL**: https://maplibre.org/
- **Nominatim**: https://nominatim.org/
- **Turf.js**: https://turfjs.org/

## 📊 Status

- ✅ Mapa 3D Interativo - **COMPLETO**
- ✅ GeoClip AI - **DEMO (funcional)**
- ✅ Busca de Localizações - **COMPLETO**
- ✅ Analisador de Coordenadas - **COMPLETO**
- ⚠️ Satélite View - **EXPERIMENTAL (info only)**

## 🎯 Roadmap Futuro

- [ ] Backend GeoClip real (Modal + ML)
- [ ] Sample4Geo integration
- [ ] EigenPlaces integration
- [ ] Mais mapas base (satélite, terreno)
- [ ] Desenho de polígonos e áreas
- [ ] Medição de distâncias e áreas
- [ ] Importação de KML/KMZ
- [ ] Clustering de pontos
- [ ] Time-series visualization

## 🤝 Contribuições

Este módulo faz parte do **Olhos De Deus**. 
Para contribuir, consulte o projeto principal.

---

**Desenvolvido com** ❤️ **e** ☕ **para a comunidade OSINT**
