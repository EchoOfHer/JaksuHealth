import { useState } from "react";

const Dashboard = () => {
  // ข้อมูลจำลอง (Mock Data) สำหรับคิวคนไข้
  const [patients] = useState([
    { id: "P-2605-012", name: "John Doe", time: "09:00 AM", status: "High Risk" },
    { id: "P-2605-013", name: "Jane Smith", time: "09:30 AM", status: "Pending" },
    { id: "P-2605-014", name: "Somchai M.", time: "10:00 AM", status: "Complete" },
  ]);

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: "#333" }}>
      
      {/* ส่วนหัวหน้าจอ */}
      <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>
        Today's Overview
      </h2>

      {/* กล่องสรุปสถิติ (Summary Cards) */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "30px" }}>
        <div style={{ flex: 1, background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", borderLeft: "4px solid #F59E0B" }}>
          <div style={{ fontSize: "14px", color: "#666" }}>Pending Scans</div>
          <div style={{ fontSize: "28px", fontWeight: "bold" }}>12</div>
        </div>
        <div style={{ flex: 1, background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", borderLeft: "4px solid #EF4444" }}>
          <div style={{ fontSize: "14px", color: "#666" }}>High Risk Detected</div>
          <div style={{ fontSize: "28px", fontWeight: "bold", color: "#EF4444" }}>3</div>
        </div>
        <div style={{ flex: 1, background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", borderLeft: "4px solid #10B981" }}>
          <div style={{ fontSize: "14px", color: "#666" }}>Completed</div>
          <div style={{ fontSize: "28px", fontWeight: "bold" }}>45</div>
        </div>
      </div>

      {/* ตารางคิวคนไข้ (Worklist) */}
      <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <h3 style={{ fontSize: "18px", marginBottom: "15px" }}>Patient Worklist</h3>
        
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #eee", color: "#888" }}>
              <th style={{ padding: "12px 8px" }}>Patient ID</th>
              <th style={{ padding: "12px 8px" }}>Name</th>
              <th style={{ padding: "12px 8px" }}>Time</th>
              <th style={{ padding: "12px 8px" }}>Status</th>
              <th style={{ padding: "12px 8px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p, index) => (
              <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "12px 8px", fontWeight: "500" }}>{p.id}</td>
                <td style={{ padding: "12px 8px" }}>{p.name}</td>
                <td style={{ padding: "12px 8px" }}>{p.time}</td>
                <td style={{ padding: "12px 8px" }}>
                  <span style={{
                    padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold",
                    background: p.status === "High Risk" ? "#FEE2E2" : p.status === "Pending" ? "#FEF3C7" : "#D1FAE5",
                    color: p.status === "High Risk" ? "#EF4444" : p.status === "Pending" ? "#D97706" : "#059669"
                  }}>
                    {p.status}
                  </span>
                </td>
                <td style={{ padding: "12px 8px" }}>
                  <button style={{ padding: "6px 12px", background: "#F97316", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>
                    Analyze
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default Dashboard;