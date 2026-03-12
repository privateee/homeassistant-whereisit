import { LitElement, html, css } from 'lit';
import '@material/mwc-dialog';
import '@material/mwc-button';
import '@material/mwc-textfield';

export class EditLocationDialog extends LitElement {
  static styles = css`
    mwc-textfield { width: 100%; margin-top: 16px; }
    .delete-section { margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; }
  `;

  static properties = { location: { type: Object } };

  constructor() { super(); this.location = null; }

  async show(loc) {
    this.location = loc;
    await this.updateComplete;
    this.shadowRoot.querySelector('mwc-dialog').show();
  }

  render() {
    if (!this.location) return html``;
    return html`
      <mwc-dialog heading="Edit Location">
        <div>
          <mwc-textfield id="name" label="Name" .value=${this.location.name} dialogInitialFocus></mwc-textfield>
          <mwc-textfield id="description" label="Description" .value=${this.location.description || ''}></mwc-textfield>
        </div>
        <div class="delete-section">
          <mwc-button @click=${this._delete} style="--mdc-theme-primary: #f44336;">Delete Location</mwc-button>
        </div>
        <mwc-button slot="primaryAction" @click=${this._save}>Save</mwc-button>
        <mwc-button slot="secondaryAction" dialogAction="close">Cancel</mwc-button>
      </mwc-dialog>
    `;
  }

  async _save() {
    const name = this.shadowRoot.getElementById('name').value;
    const description = this.shadowRoot.getElementById('description').value;
    const url = window.AppRouter
      ? window.AppRouter.urlForPath(`/api/locations/${this.location.id}`)
      : `/api/locations/${this.location.id}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: description || null }),
    });
    if (res.ok) {
      this.dispatchEvent(new CustomEvent('location-updated', { bubbles: true, composed: true }));
      this.shadowRoot.querySelector('mwc-dialog').close();
    }
  }

  async _delete() {
    if (!confirm(`Delete "${this.location.name}"? All boxes and items inside will be deleted!`)) return;
    const url = window.AppRouter
      ? window.AppRouter.urlForPath(`/api/locations/${this.location.id}`)
      : `/api/locations/${this.location.id}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (res.ok) {
      this.dispatchEvent(new CustomEvent('location-deleted', { bubbles: true, composed: true }));
      this.shadowRoot.querySelector('mwc-dialog').close();
    }
  }
}
customElements.define('edit-location-dialog', EditLocationDialog);
