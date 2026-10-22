import { initStore, updateData } from "../server/lib/store.js";

try {
  await initStore();

  await updateData((data) => {
    const gateMap = {
      东二门: "东门",
      南二门: "南门",
      西二门: "西门",
      北二门: "北门",
      图书馆门: "西门",
      宿舍区门: "东门",
      实验楼门: "北门",
      停车场入口: "南门"
    };
    const normalizeGateName = (gate) => gateMap[gate] || gate;
    const fourGateSet = new Set(["东门", "西门", "南门", "北门"]);

    data.gates = [
      { id: "GATE-E", name: "东门", campus: "主校区", location: "望江路入口", openTime: "06:30-23:00", status: "开放" },
      { id: "GATE-W", name: "西门", campus: "主校区", location: "图书馆西侧", openTime: "08:00-20:00", status: "开放" },
      { id: "GATE-S", name: "南门", campus: "主校区", location: "学府路入口", openTime: "07:00-22:00", status: "开放" },
      { id: "GATE-N", name: "北门", campus: "主校区", location: "实验楼北侧", openTime: "08:00-18:00", status: "维护中" }
    ];

    // Normalize access rules to use only the four gates
    const fourGates = "东门、西门、南门、北门";
    for (const rule of data.accessRules || []) {
      if (rule.id === "RULE-STUDENT") {
        rule.gates = "东门、南门、西门";
      } else if (rule.id === "RULE-VISITOR") {
        rule.gates = "东门、南门";
      } else if (rule.id === "RULE-ALUMNI") {
        rule.gates = "东门、西门";
      } else if (rule.id === "RULE-CONTRACTOR") {
        rule.gates = "东门、南门";
      } else if (rule.id === "RULE-LOGISTICS") {
        rule.gates = "东门";
      } else if (rule.id === "RULE-CONSTRUCTION") {
        rule.gates = "北门";
      } else if (rule.id === "RULE-TEMP-VISITOR") {
        rule.gates = "东门、南门";
      } else if (rule.id === "RULE-EMERGENCY") {
        rule.gates = fourGates;
      } else {
        // For other rules, restrict to four gates
        rule.gates = fourGates;
      }
    }

    for (const record of data.accessRecords || []) {
      record.gate = normalizeGateName(record.gate);
    }

    for (const item of data.exceptions || []) {
      item.gate = normalizeGateName(item.gate);
    }

    data.devices = (data.devices || [])
      .map((device) => ({ ...device, gate: normalizeGateName(device.gate) }))
      .filter((device) => fourGateSet.has(device.gate) && !["D-LIB-001", "D-DORM-001", "D-LAB-001", "D-PARK-001"].includes(device.id));

    for (const item of data.blacklist || []) {
      if (item.reason === "停车场权限已停用") item.reason = "车辆权限已停用";
    }

    for (const log of data.logs || []) {
      if (log.target === "D-PARK-001") log.target = "D-NF-001";
      if (log.target === "D-LIB-001") log.target = "D-WQ-001";
      if (typeof log.action === "string") log.action = log.action.replace("图书馆扫码设备", "西门扫码设备");
    }

    return true;
  });

  console.log("Applied gate fixes to store.");
  process.exit(0);
} catch (err) {
  console.error("Failed to apply gate fixes:", err?.message || err);
  process.exit(1);
}
