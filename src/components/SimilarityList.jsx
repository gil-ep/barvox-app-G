import React from "react";

const SimilarityList = ({ similarities }) => {
  // Check if there are formant means to show
  const showFormantMeans = similarities.length && similarities[0].inputMean && similarities[0].dictMean;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left" }}>Label</th>
          <th>Score</th>
          {showFormantMeans && <th>Input Formants</th>}
          {showFormantMeans && <th>Dict Formants</th>}
          {similarities[0]?.distance !== undefined && <th>DTW Dist.</th>}
        </tr>
      </thead>
      <tbody>
        {similarities.map((s, idx) => (
          <tr key={s.label} style={idx === 0 ? { background: "#eafddb", fontWeight: "bold" } : {}}>
            <td>{s.label}</td>
            <td>{(s.score * 100).toFixed(1)}%</td>
            {showFormantMeans &&
              <td>{s.inputMean.map(f => f ? f.toFixed(0) : "-").join(", ")}</td>}
            {showFormantMeans &&
              <td>{s.dictMean.map(f => f ? f.toFixed(0) : "-").join(", ")}</td>}
            {s.distance !== undefined && <td>{s.distance.toFixed(2)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default SimilarityList;
