import type { Scan, InsertVulnerability } from "../../shared/schema";

class Storage {
  async getScan(scanId: string): Promise<Scan> {
    const target = process.argv[3];
    return {
      id: scanId,
      target: target,
      scanType: "full",
      status: "running",
      progress: 0,
      currentTask: ""
    };
  }

  async updateScan(scanId: string, update: Partial<Scan>) {
    console.log(JSON.stringify({ type: 'scan-update', scanId, update }));
  }

  async createVulnerability(vulnerability: InsertVulnerability): Promise<InsertVulnerability> {
    console.log(JSON.stringify({ type: 'vulnerability-found', scanId: vulnerability.scanId, vulnerability }));
    return vulnerability;
  }
}

export const storage = new Storage();
