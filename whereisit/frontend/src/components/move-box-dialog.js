import { LitElement, html, css } from 'lit';
import '@material/mwc-dialog';
import '@material/mwc-button';

export class MoveBoxDialog extends LitElement {
  static styles = css`
    .field-label { font-size: 0.85rem; font-weight: 600; margin: 16px 0 6px; color: #555; }
    select {
      width: 100%; padding: 10px 12px; border-radius: 6px;
      border: 1px solid #ddd; font-size: 0.95rem; background: #fafafa;
    }
    .error { color: #c62828; font-size: 0.85rem; margin-top: 8px; }
  `;

  static properties = {
    box: { type: Object },
    _locations: { type: Array, state: true },
    _targetId: { type: Number, state: true },
    _error: { type: String, state: true },
  };

  constructor() {
    super();
    this._locations = [];
    this._targetId = null;
    this._error = '';
  }

  async show(box) {
    this.box = box;
    this._targetId = null;
    this._error = '';
    await this._loadLocations();
    await this.updateComplete;
    this.shadowRoot.querySelector('mwc-dialog').show();
  }

  async _loadLocations() {
    const url = window.AppRouter ? window.AppRouter.urlForPath('/api/locations') : '/api/locations';
    const res = await fetch(url);
    if (res.ok) this._locations = await res.json();
  }

  render() {
    if (!this.box) return html``;
    const others = this._locations.filter(l => l.id !== this.box.location_id);
    return html`
      <mwc-dialog heading="Move Box to Another Location">
        <div>
          <p style="margin: 0 0 4px; color: #757575; font-size: 0.9rem;">Moving: <strong>${this.box.name}</strong></p>
          <p style="margin: 0 0 4px; font-size: 0.8rem; color: #9e9e9e;">QR code and photos stay unchanged.</p>
          <div class="field-label">Destination Location</div>
          <select @change=${e => this._targetId = Number(e.target.value)}>
            <option value="">— Select a location —</option>
            ${others.map(l => html`<option value="${l.id}">${l.name}</option>`)}
          </select>
          ${this._error ? html`<div class="error">${this._error}</div>` : ''}
        </div>
        <mwc-button slot="primaryAction" @click=${this._confirm}>Move</mwc-button>
        <mwc-button slot="secondaryAction" dialogAction="close">Cancel</mwc-button>
      </mwc-dialog>
    `;
  }

  async _confirm() {
    if (!this._targetId) { this._error = 'Please select a destination.'; return; }
    const url = window.AppRouter
      ? window.AppRouter.urlForPath(`/api/boxes/${this.box.id}/move`)
      : `/api/boxes/${this.box.id}/move`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_location_id: this._targetId }),
    });
    if (res.ok) {
      const updated = await res.json();
      this.dispatchEvent(new CustomEvent('box-moved', { detail: updated, bubbles: true, composed: true }));
      this.shadowRoot.querySelector('mwc-dialog').close();
    } else {
      this._error = 'Move failed. Please try again.';
    }
  }
}
customElements.define('move-box-dialog', MoveBoxDialog);
