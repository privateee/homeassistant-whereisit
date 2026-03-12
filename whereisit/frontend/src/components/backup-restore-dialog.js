import { LitElement, html, css } from 'lit';
import '@material/mwc-dialog';
import '@material/mwc-button';
import '@material/mwc-icon';

export class BackupRestoreDialog extends LitElement {
  static styles = css`
    .section {
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #9e9e9e;
      margin-bottom: 12px;
    }
    .action-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .action-row:last-child { border-bottom: none; }
    .action-icon {
      width: 40px; height: 40px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .action-icon mwc-icon { --mdc-icon-size: 22px; }
    .action-icon.blue  { background: #e3f2fd; color: #1976d2; }
    .action-icon.green { background: #e8f5e9; color: #388e3c; }
    .action-icon.amber { background: #fff8e1; color: #f57f17; }
    .action-icon.red   { background: #fce4ec; color: #c62828; }
    .action-text { flex: 1; }
    .action-label { font-size: 0.95rem; font-weight: 500; margin-bottom: 2px; }
    .action-desc  { font-size: 0.8rem; color: #9e9e9e; line-height: 1.4; }
    .action-btn {
      padding: 7px 16px; border-radius: 8px; border: none;
      font-size: 0.85rem; font-weight: 600; cursor: pointer;
      white-space: nowrap; flex-shrink: 0;
    }
    .btn-blue  { background: #1976d2; color: white; }
    .btn-green { background: #388e3c; color: white; }
    .btn-amber { background: #f57f17; color: white; }
    .btn-red   { background: #c62828; color: white; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .status {
      margin-top: 12px; padding: 10px 14px;
      border-radius: 8px; font-size: 0.85rem; line-height: 1.5;
    }
    .status.success { background: #e8f5e9; color: #2e7d32; }
    .status.error   { background: #fce4ec; color: #c62828; }
    .status.info    { background: #e3f2fd; color: #1565c0; }
    input[type=file] { display: none; }
    .divider { border: none; border-top: 1px solid #eeeeee; margin: 4px 0 20px; }
  `;

  static properties = {
    _status: { type: Object, state: true },
    _loading: { type: String, state: true },
  };

  constructor() {
    super();
    this._status = null;
    this._loading = null;
  }

  show() {
    this._status = null;
    this._loading = null;
    this.shadowRoot.querySelector('mwc-dialog').show();
  }

  _apiUrl(path) {
    return window.AppRouter ? window.AppRouter.urlForPath(path) : path;
  }

  async _downloadFull() {
    this._loading = 'full';
    this._status = null;
    try {
      const res = await fetch(this._apiUrl('/api/backup/full'));
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      this._triggerDownload(blob, 'whereisit-backup.zip');
      this._status = { type: 'success', text: 'Full backup downloaded successfully.' };
    } catch (e) {
      this._status = { type: 'error', text: `Error: ${e.message}` };
    } finally { this._loading = null; }
  }

  async _downloadCSV() {
    this._loading = 'csv';
    this._status = null;
    try {
      const res = await fetch(this._apiUrl('/api/backup/csv'));
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      this._triggerDownload(blob, 'whereisit-export.csv');
      this._status = { type: 'success', text: 'CSV exported successfully. Open in Excel or any spreadsheet app.' };
    } catch (e) {
      this._status = { type: 'error', text: `Error: ${e.message}` };
    } finally { this._loading = null; }
  }

  _triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  _pickRestoreFile() {
    this.shadowRoot.getElementById('restoreInput').click();
  }

  async _onRestoreFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm(`Restore from "${file.name}"?\n\nThis will overwrite your current data and photos. Make sure you have a backup first!`)) {
      e.target.value = '';
      return;
    }

    this._loading = 'restore';
    this._status = null;

    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(this._apiUrl('/api/restore/full'), {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Restore failed');
      this._status = {
        type: 'info',
        text: `Restore complete! DB restored, ${data.photos_restored} photos restored. Restart the addon to reload.`,
      };
    } catch (e) {
      this._status = { type: 'error', text: `Error: ${e.message}` };
    } finally {
      this._loading = null;
      e.target.value = '';
    }
  }

  render() {
    return html`
      <mwc-dialog heading="Settings & Backup">
        <div>

          <div class="section">
            <div class="section-title">Export</div>

            <div class="action-row">
              <div class="action-icon blue"><mwc-icon style="color:#1976d2">backup</mwc-icon></div>
              <div class="action-text">
                <div class="action-label">Full Backup</div>
                <div class="action-desc">Downloads a .zip with the database + all item photos</div>
              </div>
              <button class="action-btn btn-blue"
                ?disabled=${this._loading === 'full'}
                @click=${this._downloadFull}>
                ${this._loading === 'full' ? 'Downloading…' : 'Download'}
              </button>
            </div>

            <div class="action-row">
              <div class="action-icon green"><mwc-icon style="color:#388e3c">table_view</mwc-icon></div>
              <div class="action-text">
                <div class="action-label">Export CSV</div>
                <div class="action-desc">Spreadsheet of all units, locations, boxes and items</div>
              </div>
              <button class="action-btn btn-green"
                ?disabled=${this._loading === 'csv'}
                @click=${this._downloadCSV}>
                ${this._loading === 'csv' ? 'Exporting…' : 'Export'}
              </button>
            </div>
          </div>

          <hr class="divider">

          <div class="section">
            <div class="section-title">Restore</div>

            <div class="action-row">
              <div class="action-icon amber"><mwc-icon style="color:#f57f17">restore</mwc-icon></div>
              <div class="action-text">
                <div class="action-label">Restore from Backup</div>
                <div class="action-desc">Upload a .zip backup to restore all data and photos. Current data will be replaced.</div>
              </div>
              <button class="action-btn btn-amber"
                ?disabled=${this._loading === 'restore'}
                @click=${this._pickRestoreFile}>
                ${this._loading === 'restore' ? 'Restoring…' : 'Upload'}
              </button>
              <input type="file" id="restoreInput" accept=".zip"
                @change=${this._onRestoreFileSelected}>
            </div>
          </div>

          ${this._status ? html`
            <div class="status ${this._status.type}">${this._status.text}</div>
          ` : ''}

        </div>
        <mwc-button slot="primaryAction" dialogAction="close">Close</mwc-button>
      </mwc-dialog>
    `;
  }
}
customElements.define('backup-restore-dialog', BackupRestoreDialog);
