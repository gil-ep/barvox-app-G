// src/components/AdminPanel.jsx

import React, { useRef, useState } from "react";

const AdminPanel = ({
  isRecordingNewWord,
  startNewWordRecording,
  stopNewWordRecording,
  recordingBlob,
  saveNewWord,
  cancelNewWord,
  uploadFile,
  dictionary,
  editEntry,
  deleteEntry,
  debugEntryId,
  setDebugEntryId,
  exportDebug,
}) => {
  const [label, setLabel] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editId, setEditId] = useState(null);
  const fileInputRef = useRef();

  // Reset file input and label after upload
  const handleUpload = () => {
    if (fileInputRef.current && fileInputRef.current.files.length > 0) {
      uploadFile(fileInputRef.current.files[0]);
      fileInputRef.current.value = "";
      setLabel("");
    }
  };

  const handleEdit = (id, currentLabel) => {
    setEditId(id);
    setEditLabel(currentLabel);
  };

  const handleEditSave = (id) => {
    if (editLabel.trim()) {
      editEntry(id, editLabel.trim());
      setEditId(null);
    }
  };

  const handleEditCancel = () => {
    setEditId(null);
    setEditLabel("");
  };

  return (
    <div>
      <h2>Dictionary Admin</h2>
      <div>
        {!isRecordingNewWord ? (
          <>
            <button onClick={startNewWordRecording}>Start Recording</button>
            <input
              type="file"
              accept="audio/*"
              style={{ display: "none" }}
              ref={fileInputRef}
              onChange={handleUpload}
            />
            <button onClick={() => fileInputRef.current && fileInputRef.current.click()}>Upload File</button>
          </>
        ) : (
          <button onClick={stopNewWordRecording}>Stop Recording</button>
        )}
      </div>

      {recordingBlob && (
        <div>
          <audio src={URL.createObjectURL(recordingBlob)} controls />
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Enter label"
            style={{ marginLeft: 10 }}
          />
          <button onClick={() => { saveNewWord(label); setLabel(""); }} disabled={!label}>Save</button>
          <button onClick={cancelNewWord}>Cancel</button>
        </div>
      )}

      <h3>Words in Dictionary</h3>
      <ul>
        {dictionary.map(entry => (
          <li key={entry.id} style={{ marginBottom: 12 }}>
            <audio src={entry.audioBase64 ? `data:audio/webm;base64,${entry.audioBase64}` : undefined} controls />
            {editId === entry.id ? (
              <>
                <input
                  type="text"
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  style={{ marginLeft: 10 }}
                />
                <button onClick={() => handleEditSave(entry.id)} disabled={!editLabel}>Save</button>
                <button onClick={handleEditCancel}>Cancel</button>
              </>
            ) : (
              <>
                <span style={{ fontWeight: "bold", marginLeft: 10 }}>{entry.label}</span>
                <button onClick={() => handleEdit(entry.id, entry.label)}>Edit</button>
                <button onClick={() => deleteEntry(entry.id)}>Delete</button>
                <button onClick={() => setDebugEntryId(debugEntryId === entry.id ? null : entry.id)}>Show Debug</button>
                <button onClick={() => exportDebug(entry)}>Download Debug</button>
              </>
            )}
            {debugEntryId === entry.id && (
              <pre style={{ background: "#fafafa", fontSize: 11, maxWidth: 450, overflowX: "auto", marginTop: 6 }}>
                {JSON.stringify(entry, null, 2)}
              </pre>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminPanel;
