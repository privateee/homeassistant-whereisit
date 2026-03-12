import { LitElement, html, css } from 'lit';
import '@material/mwc-icon-button';
import '@material/mwc-fab';
import '@material/mwc-icon';
import { Router } from '@vaadin/router';
import '../components/add-location-dialog.js';
import '../components/edit-unit-dialog.js';
import '../components/edit-location-dialog.js';

export class UnitView extends LitElement {
  static styles = css`
    :host { display: block; position: relative; height: 100%; }
    .header { display: flex; align-items: center; padding: 0 16px; }
    .header-title { display: flex; align-items: center; gap: 8px; }
    .location-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 16px; padding: 16px;
    }
    .location-card {
      background: white; border-radius: 8px; padding: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1); cursor: pointer;
      display: flex; flex-direction: column; align-items: center;
      transition: transform 0.2s;
    }
    .location-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.15); }
    .location-card-header { width: 100%; display: flex; justify-content: flex-end; }
    .edit-btn { --mdc-icon-button-size: 32px; --mdc-icon-size: 20px; margin: -8px -8px 0 0; color: gray; }
    .loc-icon { font-size: 48px; color: var(--mdc-theme-primary); margin-bottom: 8px; }
    .loc-name { font-weight: 500; text-align: center; }
    .loc-count { font-size: 0.8em; color: gray; }
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 64px 32px; text-align: center;
    }
    .empty-icon-wrapper {
      width: 80px; height: 80px; border-radius: 50%;
      background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
      display: flex; align-items: center; justify-content: center; margin-bottom: 20px;
    }
    .empty-icon-wrapper mwc-icon { --mdc-icon-size: 40px; color: #388e3c; }
    .empty-title { font-size: 1.1rem; font-weight: 600; color: #424242; margin-bottom: 6px; }
    .empty-subtitle { font-size: 0.85rem; color: #9e9e9e; max-width: 240px; line-height: 1.5; }
    mwc-fab { position: fixed; bottom: 24px; right: 24px; }
  `;

  static properties = { unit: { type: Object } };

  constructor() { super(); this.unit = null; }

  onBeforeEnter(location) {
    this.unitId = location.params.id;
    this._fetchUnit(this.unitId);
  }

  async _fetchUnit(id) {
    try {
      const url = window.AppRouter ? window.AppRouter.urlForPath(`/api/units/${id}`) : `/api/units/${id}`;
      const res = await fetch(url);
      if (res.ok) this.unit = await res.json();
    } catch (e) { console.error('Error fetching unit', e); }
  }

  render() {
    if (!this.unit) return html`<p>Loading...</p>`;
    return html`
      <div class="header">
        <div class="header-title">
          <mwc-icon-button icon="arrow_back" @click=${this._goBack}></mwc-icon-button>
          <h2 style="margin:0;">${this.unit.name}</h2>
          <mwc-icon-button icon="edit" @click=${this._openEditUnitDialog}
            style="--mdc-icon-size: 20px; color: gray;"></mwc-icon-button>
        </div>
      </div>

      ${this.unit.locations.length === 0 ? html`
        <div class="empty-state">
          <div class="empty-icon-wrapper"><mwc-icon>place</mwc-icon></div>
          <div class="empty-title">No locations yet</div>
          <div class="empty-subtitle">Tap + to add a location (e.g. "Shelf A", "Top Drawer").</div>
        </div>
      ` : html`
        <div class="location-grid">
          ${this.unit.locations.map(loc => {
            const boxCount = loc.boxes ? loc.boxes.length : 0;
            const itemCount = loc.boxes ? loc.boxes.reduce((s, b) => s + (b.items ? b.items.length : 0), 0) : 0;
            return html`
              <div class="location-card" @click=${() => this._navigateToLocation(loc.id)}>
                <div class="location-card-header">
                  <mwc-icon-button class="edit-btn" icon="edit"
                    @click=${(e) => { e.stopPropagation(); this._openEditLocationDialog(e, loc); }}>
                  </mwc-icon-button>
                </div>
                <mwc-icon class="loc-icon">place</mwc-icon>
                <span class="loc-name">${loc.name}</span>
                <span class="loc-count">${boxCount} box${boxCount !== 1 ? 'es' : ''} · ${itemCount} items</span>
              </div>
            `;
          })}
        </div>
      `}

      <mwc-fab icon="add" @click=${this._openAddLocationDialog}></mwc-fab>
      <add-location-dialog .unitId=${this.unitId} @location-added=${() => this._fetchUnit(this.unitId)}></add-location-dialog>
      <edit-unit-dialog .unit=${this.unit}
        @unit-updated=${() => this._fetchUnit(this.unitId)}
        @unit-deleted=${this._handleUnitDeleted}>
      </edit-unit-dialog>
      <edit-location-dialog
        @location-updated=${() => this._fetchUnit(this.unitId)}
        @location-deleted=${() => this._fetchUnit(this.unitId)}>
      </edit-location-dialog>
    `;
  }

  _openEditUnitDialog() { this.shadowRoot.querySelector('edit-unit-dialog').show(this.unit); }
  _openAddLocationDialog() { this.shadowRoot.querySelector('add-location-dialog').show(); }
  _openEditLocationDialog(e, loc) { this.shadowRoot.querySelector('edit-location-dialog').show(loc); }

  _handleUnitDeleted() {
    const url = '/';
    const target = window.AppRouter ? window.AppRouter.urlForPath(url).replace(new RegExp('([^:])//+', 'g'), '$1/') : url;
    Router.go(target);
  }

  _goBack() {
    const url = '/';
    const target = window.AppRouter ? window.AppRouter.urlForPath(url).replace(new RegExp('([^:])//+', 'g'), '$1/') : url;
    try { Router.go(target); } catch(e) { window.location.href = target; }
  }

  _navigateToLocation(id) {
    const url = `/location/${id}`;
    const target = window.AppRouter ? window.AppRouter.urlForPath(url).replace(new RegExp('([^:])//+', 'g'), '$1/') : url;
    try { Router.go(target); } catch(e) { window.location.href = target; }
  }
}
customElements.define('unit-view', UnitView);
