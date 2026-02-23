import { Fragment, useMemo, useState } from 'react';
import seedRecords from './data/seedRecords.json';

type Status = 'read' | 'wip' | 'unset' | 'expire';
type GroupBy = 'none' | 'status' | 'usage' | 'branchName';

type UrlItem = {
  tag: string;
  url: string;
};

type TenantRecord = {
  id: string;
  tenantId: string;
  branchName: string;
  usage: string;
  urlList: UrlItem[];
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
  read: { label: 'Ready', color: '#16a34a' },
  wip: { label: 'WIP', color: '#f59e0b' },
  unset: { label: 'Not Started', color: '#64748b' },
  expire: { label: 'Sunset', color: '#dc2626' }
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

const normalizeUrlItem = (value: unknown): UrlItem | null => {
  if (typeof value === 'string') {
    const v = value.trim();
    if (!v) return null;
    return { tag: 'Link', url: v };
  }

  if (value && typeof value === 'object') {
    const maybe = value as { tag?: unknown; url?: unknown };
    const url = String(maybe.url ?? '').trim();
    if (!url) return null;
    const tag = String(maybe.tag ?? 'Link').trim() || 'Link';
    return { tag, url };
  }

  return null;
};

const parseUrlList = (input: unknown): UrlItem[] => {
  if (Array.isArray(input)) {
    const mapped = input.map(normalizeUrlItem).filter((item): item is UrlItem => item !== null);
    return mapped;
  }

  if (typeof input === 'string') {
    return input
      .split(/[\n,\s]+/)
      .map((raw) => raw.trim())
      .filter(Boolean)
      .map((url) => ({ tag: 'Link', url }));
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
  urls: UrlItem[];
  onChange: (value: UrlItem[]) => void;
};

function UrlRichInput({ urls, onChange }: UrlEditorProps) {
  const [draftTag, setDraftTag] = useState('');
  const [draftUrl, setDraftUrl] = useState('');

  const addDraft = () => {
    const normalized = normalizeUrlItem({ tag: draftTag, url: draftUrl });
    if (!normalized) return;

    const exists = urls.some((item) => item.url === normalized.url && item.tag === normalized.tag);
    if (!exists) {
      onChange([...urls, normalized]);
    }

    setDraftTag('');
    setDraftUrl('');
  };

  const removeAt = (index: number) => {
    onChange(urls.filter((_, i) => i !== index));
  };

  const updateAt = (index: number, field: keyof UrlItem, value: string) => {
    const next = urls.map((item, i) => (i === index ? { ...item, [field]: value } : item));
    onChange(next);
  };

  return (
    <div className="url-editor">
      {urls.map((item, index) => (
        <div className="url-row" key={`${item.tag}-${item.url}-${index}`}>
          <input
            value={item.tag}
            onChange={(event) => updateAt(index, 'tag', event.target.value)}
            placeholder="Tag (e.g. Genesis)"
          />
          <input
            value={item.url}
            onChange={(event) => updateAt(index, 'url', event.target.value)}
            placeholder="https://..."
          />
          <button type="button" className="danger small" onClick={() => removeAt(index)}>
            Remove
          </button>
        </div>
      ))}

      <div className="url-row add-row">
        <input value={draftTag} onChange={(event) => setDraftTag(event.target.value)} placeholder="Tag (Genesis, Airflow)" />
        <input value={draftUrl} onChange={(event) => setDraftUrl(event.target.value)} placeholder="https://..." />
        <button type="button" className="small" onClick={addDraft}>
          Add
        </button>
      </div>
    </div>
  );
}

function App() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [filters, setFilters] = useState<Filters>(emptyFilters);

  const [records, setRecords] = useState<TenantRecord[]>(() => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return getSeedData();

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
    save(records.map((record) => (record.id === id ? { ...record, [field]: value } : record)));
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
    if (groupBy === 'none') return [{ key: 'All Records', rows: filteredRecords }];

    const groups = new Map<string, TenantRecord[]>();
    filteredRecords.forEach((record) => {
      const key = String(record[groupBy] || 'Unspecified');
      const existing = groups.get(key) || [];
      existing.push(record);
      groups.set(key, existing);
    });

    return [...groups.entries()].map(([key, rows]) => ({ key, rows }));
  }, [filteredRecords, groupBy]);

  const renderCell = (record: TenantRecord, field: Exclude<keyof TenantRecord, 'urlList' | 'status'>, placeholder: string) => {
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
      <p className="subtitle">Read mode for presentation, edit mode for updates.</p>

      <div className="toolbar">
        <button type="button" onClick={() => setIsEditMode((mode) => !mode)}>
          Switch to {isEditMode ? 'Read' : 'Edit'} mode
        </button>
        {isEditMode && (
          <>
            <button type="button" className="secondary" onClick={() => save([...records, blankRecord()])}>
              + Add row
            </button>
            <button type="button" className="secondary" onClick={() => save(getSeedData())}>
              Reset to JSON seed data
            </button>
          </>
        )}
      </div>

      <section className="filter-panel">
        <h2>Filter & Group</h2>
        <div className="filters grouped">
          <div className="filter-item">
            <label>Tenant ID</label>
            <input
              placeholder="e.g. 811"
              value={filters.tenantId}
              onChange={(event) => setFilters((prev) => ({ ...prev, tenantId: event.target.value }))}
            />
          </div>
          <div className="filter-item">
            <label>Branch</label>
            <input
              placeholder="e.g. London"
              value={filters.branchName}
              onChange={(event) => setFilters((prev) => ({ ...prev, branchName: event.target.value }))}
            />
          </div>
          <div className="filter-item">
            <label>Usage</label>
            <input
              placeholder="e.g. Production"
              value={filters.usage}
              onChange={(event) => setFilters((prev) => ({ ...prev, usage: event.target.value }))}
            />
          </div>
          <div className="filter-item">
            <label>Status</label>
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
          </div>
          <div className="filter-item">
            <label>Group by</label>
            <select value={groupBy} onChange={(event) => setGroupBy(event.target.value as GroupBy)}>
              <option value="none">No Grouping</option>
              <option value="status">Status</option>
              <option value="usage">Usage</option>
              <option value="branchName">Branch</option>
            </select>
          </div>
        </div>
      </section>

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
                  <tr className="group-row">
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
                            record.urlList.map((item, index) => (
                              <a key={`${item.url}-${index}`} href={item.url} target="_blank" rel="noreferrer" className="url-pill">
                                <span className="url-tag-read">{item.tag}</span>
                                <span className="url-text">{item.url}</span>
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
                        <button type="button" className="danger" onClick={() => save(records.filter((r) => r.id !== record.id))}>
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
