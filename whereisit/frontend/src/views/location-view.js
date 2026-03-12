import { LitElement, html, css } from 'lit';
import { Router } from '@vaadin/router';
import '@material/mwc-icon-button';
import '@material/mwc-fab';
import '@material/mwc-icon';
import '../components/add-box-dialog.js';
import '../components/edit-box-dialog.js';
import '../components/edit-location-dialog.js';

export class LocationView extends LitElement {
  static styles = css`
    :host { display: block; position: relative; height: 100%; }
    .header {
      display: flex; align-items: center; padding: 0 16px; justify-content: space-between;
    }
    .header-left { display: flex; align-items: center; gap: 4px; }
    .breadcrumb { font-size: 0.8rem; color: #9e9e9e; padding: 0 16px 8px 56px; }
    .box-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 16px; padding: 16px;
    }
    .box-card {
      background: white; border-radius: 8px; padding: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1); cursor: pointer;
      display: flex; flex-direction: column; align-items: center;
      transition: transform 0.2s;
    }
    .box-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.15); }
    .box-card-header { width: 100%; display: flex; justify-content: flex-end; }
    .edit-btn { --mdc-icon-button-size: 32px; --mdc-icon-size: 20px; margin: -8px -8px 0 0; color: gray; }
    .box-icon { font-size: 48px; color: var(--mdc-theme-primary); margin-bottom: 8px; }
    .box-name { font-weight: 500; text-align: center; }
    .box-count { font-size: 0.8em; color: gray; }
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 64px 32px; text-align: center;
    }
    .empty-icon-wrapper {
      width: 80px; height: 80px; border-radius: 50%;
      background: linear-gradient(135deg, #e3f2fd, #bbdefb);
      display: flex; align-items: center; justify-content: center; margin-bottom: 20px;
    }
    .empty-icon-wrapper mwc-icon { --mdc-icon-size: 40px; color: #1976d2; }
    .empty-title { font-size: 1.1rem; font-weight: 600; color: #424242; margin-bottom: 6px; }
    .empty-subtitle { font-size: 0.85rem; color: #9e9e9e; max-width: 240px; line-height: 1.5; }
    mwc-fab { position: fixed; bottom: 24px; right: 24px; }
  `;

  static properties = {
    _location: { type: Object, state: true },
  };

  constructor() { super(); this._location = null; }

  onBeforeEnter(location) {
    this.locationId = location.params.id;
    this._fetchLocation(this.locationId);
  }

  async _fetchLocation(id) {
    try {
      const url = window.AppRouter ? window.AppRouter.urlForPath(`/api/locations/${id}`) : `/api/locations/${id}`;
      const res = await fetch(url);
      if (res.ok) this._location = await res.json();
    } catch (e) { console.error('Error fetching location', e); }
  }

  render() {
    if (!this._location) return html`<p>Loading...</p>`;
    return html`
      <div class="header">
        <div class="header-left">
          <mwc-icon-button icon="arrow_back" @click=${this._goBack}></mwc-icon-button>
          <h2 style="margin:0;">${this._location.name}</h2>
          <mwc-icon-button icon="edit" @click=${this._openEditLocationDialog}
            style="--mdc-icon-size: 20px; color: gray;"></mwc-icon-button>
        </div>
      </div>
      <div class="breadcrumb">Unit › ${this._location.name}</div>

      ${this._location.boxes.length === 0 ? html`
        <div class="empty-state">
          <div class="empty-icon-wrapper"><mwc-icon>inventory_2</mwc-icon></div>
          <div class="empty-title">No boxes yet</div>
          <div class="empty-subtitle">Tap + to add a box to this location.</div>
        </div>
      ` : html`
        <div class="box-grid">
          ${this._location.boxes.map(box => html`
            <div class="box-card" @click=${() => this._navigateToBox(box.id)}>
              <div class="box-card-header">
                <mwc-icon-button class="edit-btn" icon="edit"
                  @click=${(e) => { e.stopPropagation(); this._openEditBoxDialog(e, box); }}>
                </mwc-icon-button>
              </div>
              <mwc-icon class="box-icon">inventory_2</mwc-icon>
              <span class="box-name">${box.name}</span>
              <span class="box-count">${box.items ? box.items.length : 0} items</span>
            </div>
          `)}
        </div>
      `}

      <mwc-fab icon="add" @click=${this._openAddBoxDialog}></mwc-fab>
      <add-box-dialog .locationId=${this.locationId} @box-added=${() => this._fetchLocation(this.locationId)}></add-box-dialog>
      <edit-location-dialog .location=${this._location}
        @location-updated=${() => this._fetchLocation(this.locationId)}
        @location-deleted=${this._handleLocationDeleted}>
      </edit-location-dialog>
      <edit-box-dialog
        @box-updated=${() => this._fetchLocation(this.locationId)}
        @box-deleted=${() => this._fetchLocation(this.locationId)}>
      </edit-box-dialog>
    `;
  }

  _goBack() {
    const url = this._location ? `/unit/${this._location.unit_id}` : '/';
    const target = window.AppRouter ? window.AppRouter.urlForPath(url).replace(new RegExp('([^:])//+', 'g'), '$1/') : url;
    try { Router.go(target); } catch(e) { window.location.href = target; }
  }

  _navigateToBox(id) {
    const url = `/box/${id}`;
    const target = window.AppRouter ? window.AppRouter.urlForPath(url).replace(new RegExp('([^:])//+', 'g'), '$1/') : url;
    try { Router.go(target); } catch(e) { window.location.href = target; }
  }

  _openAddBoxDialog() { this.shadowRoot.querySelector('add-box-dialog').show(); }
  _openEditBoxDialog(e, box) { this.shadowRoot.querySelector('edit-box-dialog').show(box); }
  _openEditLocationDialog() { this.shadowRoot.querySelector('edit-location-dialog').show(this._location); }
  _handleLocationDeleted() { this._goBack(); }
}
customElements.define('location-view', LocationView);
