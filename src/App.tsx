import { Fragment, useMemo, useState } from 'react';
import seedRecords from './data/seedRecords.json';

type Status = 'read' | 'wip' | 'unset' | 'expire';
type GroupBy = 'none' | 'status' | 'usage' | 'branchName';

type TenantRecord = {
  id: string;
  tenantId: string;
  branchName: string;
  usage: string;
  urlList: string[];
  omsFirm: string;
  gioFirm: string;
  note: string;
  status: Status;
};

type Filters = {
  tenantId: string;
  branchName: string;
  usage: string;
  status: Status | 'all';
};

const statusConfig: Record<Status, { label: string; color: string }> = {
  read: { label: 'Read', color: '#16a34a' },
  wip: { label: 'WIP', color: '#f59e0b' },
  unset: { label: 'Unset', color: '#64748b' },
  expire: { label: 'Expire', color: '#dc2626' }
};

const storageKey = 'tenant-usage-grid-records';

const blankRecord = (): TenantRecord => ({
  id: crypto.randomUUID(),
  tenantId: '',
  branchName: '',
  usage: '',
  urlList: [],
  omsFirm: '',
  gioFirm: '',
  note: '',
  status: 'unset'
});

const parseUrlList = (input: unknown): string[] => {
  if (Array.isArray(input)) {
    return input.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split(/[\n,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeSeedRecord = (record: Partial<TenantRecord>): TenantRecord => ({
  id: record.id || crypto.randomUUID(),
  tenantId: record.tenantId || '',
  branchName: record.branchName || '',
  usage: record.usage || '',
  urlList: parseUrlList(record.urlList),
  omsFirm: record.omsFirm || '',
  gioFirm: record.gioFirm || '',
  note: record.note || '',
  status: record.status && statusConfig[record.status] ? record.status : 'unset'
});

const getSeedData = (): TenantRecord[] => {
  if (!Array.isArray(seedRecords)) {
    return [blankRecord()];
  }

  const mapped = seedRecords
    .map((record) => normalizeSeedRecord(record as Partial<TenantRecord>))
    .filter((record) => record.id && record.tenantId);

  return mapped.length > 0 ? mapped : [blankRecord()];
};

const emptyFilters: Filters = {
  tenantId: '',
  branchName: '',
  usage: '',
  status: 'all'
};

type UrlEditorProps = {
  urls: string[];
  onChange: (value: string[]) => void;
};

function UrlRichInput({ urls, onChange }: UrlEditorProps) {
  const [draft, setDraft] = useState('');

  const addFromDraft = () => {
    if (!draft.trim()) {
      return;
    }

    const values = draft
      .split(/[\n,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    const deduped = [...new Set([...urls, ...values])];
    onChange(deduped);
    setDraft('');
  };

  const removeUrl = (url: string) => {
    onChange(urls.filter((item) => item !== url));
  };

  return (
    <div className="url-editor">
      <div className="url-tags">
        {urls.map((url) => (
          <span className="url-tag" key={url}>
            {url}
            <button type="button" onClick={() => removeUrl(url)} aria-label={`remove ${url}`}>
              ×
            </button>
          </span>
        ))}
      </div>
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Type URL(s), separate with comma, space, or newline"
        rows={2}
        onBlur={addFromDraft}
      />
      <button type="button" className="small" onClick={addFromDraft}>
        Add URL
      </button>
    </div>
  );
}

function App() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [filters, setFilters] = useState<Filters>(emptyFilters);

  const [records, setRecords] = useState<TenantRecord[]>(() => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return getSeedData();
    }

    try {
      const parsed = JSON.parse(raw) as Partial<TenantRecord>[];
      return parsed.length > 0 ? parsed.map(normalizeSeedRecord) : getSeedData();
    } catch {
      return getSeedData();
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

  const resetFromSeed = () => {
    save(getSeedData());
  };

  const statusOptions = useMemo(
    () => (Object.keys(statusConfig) as Status[]).map((status) => ({ status, ...statusConfig[status] })),
    []
  );

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        const statusMatch = filters.status === 'all' || record.status === filters.status;
        return (
          statusMatch &&
          record.tenantId.toLowerCase().includes(filters.tenantId.toLowerCase()) &&
          record.branchName.toLowerCase().includes(filters.branchName.toLowerCase()) &&
          record.usage.toLowerCase().includes(filters.usage.toLowerCase())
        );
      }),
    [records, filters]
  );

  const groupedRecords = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'All Records', rows: filteredRecords }];
    }

    const groups = new Map<string, TenantRecord[]>();
    filteredRecords.forEach((record) => {
      const key = String(record[groupBy] || 'Unspecified');
      const existing = groups.get(key) || [];
      existing.push(record);
      groups.set(key, existing);
    });

    return [...groups.entries()].map(([key, rows]) => ({ key, rows }));
  }, [filteredRecords, groupBy]);

  const renderCell = (record: TenantRecord, field: keyof TenantRecord, placeholder: string) => {
    if (isEditMode) {
      return (
        <input
          value={String(record[field])}
          onChange={(event) => updateField(record.id, field, event.target.value as TenantRecord[typeof field])}
          placeholder={placeholder}
        />
      );
    }

    return <span className="read-value">{String(record[field]) || '—'}</span>;
  };

  return (
    <main className="page">
      <h1>Tenant Usage Tracker</h1>
      <p className="subtitle">Read mode for clean presentation, edit mode for updates.</p>

      <div className="toolbar">
        <button type="button" onClick={() => setIsEditMode((mode) => !mode)}>
          Switch to {isEditMode ? 'Read' : 'Edit'} mode
        </button>
        {isEditMode && (
          <>
            <button type="button" className="secondary" onClick={addRow}>
              + Add row
            </button>
            <button type="button" className="secondary" onClick={resetFromSeed}>
              Reset to JSON seed data
            </button>
          </>
        )}
      </div>

      <div className="filters">
        <input
          placeholder="Filter Tenant ID"
          value={filters.tenantId}
          onChange={(event) => setFilters((prev) => ({ ...prev, tenantId: event.target.value }))}
        />
        <input
          placeholder="Filter Branch"
          value={filters.branchName}
          onChange={(event) => setFilters((prev) => ({ ...prev, branchName: event.target.value }))}
        />
        <input
          placeholder="Filter Usage"
          value={filters.usage}
          onChange={(event) => setFilters((prev) => ({ ...prev, usage: event.target.value }))}
        />
        <select
          value={filters.status}
          onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value as Filters['status'] }))}
        >
          <option value="all">All Status</option>
          {statusOptions.map((item) => (
            <option key={item.status} value={item.status}>
              {item.label}
            </option>
          ))}
        </select>
        <select value={groupBy} onChange={(event) => setGroupBy(event.target.value as GroupBy)}>
          <option value="none">No Grouping</option>
          <option value="status">Group by Status</option>
          <option value="usage">Group by Usage</option>
          <option value="branchName">Group by Branch</option>
        </select>
      </div>

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
              {isEditMode && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {groupedRecords.map((group) => (
              <Fragment key={`group-wrap-${group.key}`}>
                {groupBy !== 'none' && (
                  <tr key={`group-${group.key}`} className="group-row">
                    <td colSpan={isEditMode ? 9 : 8}>
                      {groupBy}: {group.key} ({group.rows.length})
                    </td>
                  </tr>
                )}
                {group.rows.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <div className="status-cell">
                        <span
                          className="status-dot"
                          style={{ backgroundColor: statusConfig[record.status].color }}
                          title={statusConfig[record.status].label}
                        />
                        {isEditMode ? (
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
                        ) : (
                          <span className="read-value">{statusConfig[record.status].label}</span>
                        )}
                      </div>
                    </td>
                    <td>{renderCell(record, 'tenantId', 'Tenant ID')}</td>
                    <td>{renderCell(record, 'branchName', 'Branch Name')}</td>
                    <td>{renderCell(record, 'usage', 'Usage')}</td>
                    <td>
                      {isEditMode ? (
                        <UrlRichInput urls={record.urlList} onChange={(value) => updateField(record.id, 'urlList', value)} />
                      ) : (
                        <div className="url-read-list">
                          {record.urlList.length > 0 ? (
                            record.urlList.map((url) => (
                              <a key={url} href={url} target="_blank" rel="noreferrer">
                                {url}
                              </a>
                            ))
                          ) : (
                            <span className="read-value">—</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>{renderCell(record, 'omsFirm', 'OMS Firm')}</td>
                    <td>{renderCell(record, 'gioFirm', 'GIO Firm')}</td>
                    <td>
                      {isEditMode ? (
                        <textarea
                          value={record.note}
                          onChange={(event) => updateField(record.id, 'note', event.target.value)}
                          placeholder="Note"
                          rows={2}
                        />
                      ) : (
                        <span className="read-value">{record.note || '—'}</span>
                      )}
                    </td>
                    {isEditMode && (
                      <td>
                        <button type="button" className="danger" onClick={() => removeRow(record.id)}>
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export default App;
