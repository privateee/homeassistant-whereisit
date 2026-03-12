import { LitElement, html, css } from 'lit';
import '@material/mwc-dialog';
import '@material/mwc-button';

export class MoveItemsDialog extends LitElement {
  static styles = css`
    .field-label { font-size: 0.85rem; font-weight: 600; margin: 16px 0 6px; color: #555; }
    .items-list {
      border: 1px solid #e0e0e0; border-radius: 6px;
      max-height: 200px; overflow-y: auto; margin-bottom: 4px;
    }
    .item-row {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 12px; border-bottom: 1px solid #f5f5f5;
      cursor: pointer; font-size: 0.9rem;
    }
    .item-row:last-child { border-bottom: none; }
    .item-row:hover { background: #f9f9f9; }
    .item-row input[type=checkbox] { width: 16px; height: 16px; flex-shrink: 0; }
    .item-thumb {
      width: 32px; height: 32px; border-radius: 50%;
      object-fit: cover; flex-shrink: 0;
    }
    .item-thumb-placeholder {
      width: 32px; height: 32px; border-radius: 50%;
      background: #e0e0e0; flex-shrink: 0;
    }
    .select-all-row {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 12px; font-size: 0.8rem; color: #757575;
      border-bottom: 1px solid #e0e0e0; cursor: pointer;
    }
    select {
      width: 100%; padding: 10px 12px; border-radius: 6px;
      border: 1px solid #ddd; font-size: 0.95rem; background: #fafafa;
    }
    .error { color: #c62828; font-size: 0.85rem; margin-top: 8px; }
  `;

  static properties = {
    box: { type: Object },
    _allBoxes: { type: Array, state: true },
    _selected: { type: Object, state: true },
    _targetBoxId: { type: Number, state: true },
    _error: { type: String, state: true },
  };

  constructor() {
    super();
    this._allBoxes = [];
    this._selected = new Set();
    this._targetBoxId = null;
    this._error = '';
  }

  async show(box) {
    this.box = box;
    this._selected = new Set();
    this._targetBoxId = null;
    this._error = '';
    await this._loadBoxes();
    await this.updateComplete;
    this.shadowRoot.querySelector('mwc-dialog').show();
  }

  async _loadBoxes() {
    const url = window.AppRouter ? window.AppRouter.urlForPath('/api/boxes-flat') : '/api/boxes-flat';
    const res = await fetch(url);
    if (res.ok) this._allBoxes = await res.json();
  }

  get _otherBoxes() {
    return this._allBoxes.filter(b => b.id !== (this.box ? this.box.id : null));
  }

  get _allSelected() {
    return this.box && this.box.items.length > 0 && this._selected.size === this.box.items.length;
  }

  _toggleItem(id) {
    const next = new Set(this._selected);
    next.has(id) ? next.delete(id) : next.add(id);
    this._selected = next;
  }

  _toggleAll() {
    this._selected = this._allSelected
      ? new Set()
      : new Set(this.box.items.map(i => i.id));
  }

  render() {
    if (!this.box) return html``;
    const items = this.box.items || [];
    return html`
      <mwc-dialog heading="Move Items to Another Box">
        <div>
          <div class="field-label">Items (${this._selected.size} of ${items.length} selected)</div>
          <div class="items-list">
            <div class="select-all-row" @click=${this._toggleAll}>
              <input type="checkbox" .checked=${this._allSelected} @click=${e => e.stopPropagation()}>
              Select all
            </div>
            ${items.map(item => html`
              <div class="item-row" @click=${() => this._toggleItem(item.id)}>
                <input type="checkbox" .checked=${this._selected.has(item.id)} @click=${e => e.stopPropagation()}>
                ${item.photo_path
                  ? html`<img class="item-thumb"
                      src="${window.AppRouter ? window.AppRouter.urlForPath(item.photo_path) : item.photo_path}"
                      alt="">`
                  : html`<div class="item-thumb-placeholder"></div>`
                }
                <span>${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ''}</span>
              </div>
            `)}
          </div>

          <div class="field-label">Destination Box</div>
          <select @change=${e => this._targetBoxId = Number(e.target.value)}>
            <option value="">— Select a box —</option>
            ${this._otherBoxes.map(b => html`
              <option value="${b.id}">${b.unit_name} › ${b.location_name} › ${b.name}</option>
            `)}
          </select>
          ${this._error ? html`<div class="error">${this._error}</div>` : ''}
        </div>
        <mwc-button slot="primaryAction" @click=${this._confirm}
          ?disabled=${this._selected.size === 0 || !this._targetBoxId}>
          Move ${this._selected.size || ''} Item${this._selected.size !== 1 ? 's' : ''}
        </mwc-button>
        <mwc-button slot="secondaryAction" dialogAction="close">Cancel</mwc-button>
      </mwc-dialog>
    `;
  }

  async _confirm() {
    if (this._selected.size === 0 || !this._targetBoxId) return;
    const url = window.AppRouter
      ? window.AppRouter.urlForPath(`/api/boxes/${this.box.id}/move-items`)
      : `/api/boxes/${this.box.id}/move-items`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_ids: [...this._selected], target_box_id: this._targetBoxId }),
    });
    if (res.ok) {
      this.dispatchEvent(new CustomEvent('items-moved', { bubbles: true, composed: true }));
      this.shadowRoot.querySelector('mwc-dialog').close();
    } else {
      this._error = 'Move failed. Please try again.';
    }
  }
}
customElements.define('move-items-dialog', MoveItemsDialog);
