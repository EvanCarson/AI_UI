import { useMemo, useState } from 'react';

type Status = 'read' | 'wip' | 'unset' | 'expire';

type TenantRecord = {
  id: string;
  tenantId: string;
  branchName: string;
  usage: string;
  urlList: string;
  omsFirm: string;
  gioFirm: string;
  note: string;
  status: Status;
};

const statusConfig: Record<Status, { label: string; color: string }> = {
  read: { label: 'Read', color: '#16a34a' },
  wip: { label: 'WIP', color: '#f59e0b' },
  unset: { label: 'Unset', color: '#64748b' },
  expire: { label: 'Expire', color: '#dc2626' }
};

const blankRecord = (): TenantRecord => ({
  id: crypto.randomUUID(),
  tenantId: '',
  branchName: '',
  usage: '',
  urlList: '',
  omsFirm: '',
  gioFirm: '',
  note: '',
  status: 'unset'
});

const storageKey = 'tenant-usage-grid-records';

function App() {
  const [records, setRecords] = useState<TenantRecord[]>(() => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return [blankRecord()];
    }

    try {
      const parsed = JSON.parse(raw) as TenantRecord[];
      return parsed.length > 0 ? parsed : [blankRecord()];
    } catch {
      return [blankRecord()];
    }
  });

  const save = (next: TenantRecord[]) => {
    setRecords(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const updateField = <K extends keyof TenantRecord>(id: string, field: K, value: TenantRecord[K]) => {
    const next = records.map((record) => (record.id === id ? { ...record, [field]: value } : record));
    save(next);
  };

  const addRow = () => save([...records, blankRecord()]);

  const removeRow = (id: string) => {
    const next = records.filter((record) => record.id !== id);
    save(next.length > 0 ? next : [blankRecord()]);
  };

  const statusOptions = useMemo(
    () => (Object.keys(statusConfig) as Status[]).map((status) => ({ status, ...statusConfig[status] })),
    []
  );

  return (
    <main className="page">
      <h1>Tenant Usage Tracker</h1>
      <p className="subtitle">Editable TypeScript UI for tenant / branch usage records.</p>

      <div className="legend">
        {statusOptions.map((item) => (
          <div className="legend-item" key={item.status}>
            <span className="status-dot" style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Tenant ID</th>
              <th>Branch Name</th>
              <th>Usage</th>
              <th>URL List</th>
              <th>OMS Firm</th>
              <th>GIO Firm</th>
              <th>Note</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td>
                  <div className="status-cell">
                    <span
                      className="status-dot"
                      style={{ backgroundColor: statusConfig[record.status].color }}
                      title={statusConfig[record.status].label}
                    />
                    <select
                      value={record.status}
                      onChange={(event) => updateField(record.id, 'status', event.target.value as Status)}
                    >
                      {statusOptions.map((item) => (
                        <option key={item.status} value={item.status}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td>
                  <input
                    value={record.tenantId}
                    onChange={(event) => updateField(record.id, 'tenantId', event.target.value)}
                    placeholder="Tenant ID"
                  />
                </td>
                <td>
                  <input
                    value={record.branchName}
                    onChange={(event) => updateField(record.id, 'branchName', event.target.value)}
                    placeholder="Branch Name"
                  />
                </td>
                <td>
                  <input
                    value={record.usage}
                    onChange={(event) => updateField(record.id, 'usage', event.target.value)}
                    placeholder="Usage"
                  />
                </td>
                <td>
                  <textarea
                    value={record.urlList}
                    onChange={(event) => updateField(record.id, 'urlList', event.target.value)}
                    placeholder="Comma/newline separated URLs"
                    rows={2}
                  />
                </td>
                <td>
                  <input
                    value={record.omsFirm}
                    onChange={(event) => updateField(record.id, 'omsFirm', event.target.value)}
                    placeholder="OMS Firm"
                  />
                </td>
                <td>
                  <input
                    value={record.gioFirm}
                    onChange={(event) => updateField(record.id, 'gioFirm', event.target.value)}
                    placeholder="GIO Firm"
                  />
                </td>
                <td>
                  <textarea
                    value={record.note}
                    onChange={(event) => updateField(record.id, 'note', event.target.value)}
                    placeholder="Note"
                    rows={2}
                  />
                </td>
                <td>
                  <button type="button" className="danger" onClick={() => removeRow(record.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" className="add-btn" onClick={addRow}>
        + Add row
      </button>
    </main>
  );
}

export default App;
