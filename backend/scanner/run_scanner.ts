import { VulnerabilityScanner } from "./scanner";

const scanId = process.argv[2];
const target = process.argv[3];

if (!scanId || !target) {
  console.error("Missing arguments. Usage: tsx run_scanner.ts <scanId> <target>");
  process.exit(1);
}

// Mock WebSocket server since we are running as a subprocess
const mockWss = {
  clients: [] 
};

const scanner = new VulnerabilityScanner(mockWss);

scanner.startScan(scanId).then(() => {
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
