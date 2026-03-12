import { LitElement, html, css } from 'lit';
import '@material/mwc-dialog';
import '@material/mwc-button';
import '@material/mwc-textfield';

export class EditBoxDialog extends LitElement {
  static styles = css`
    mwc-textfield { width: 100%; margin-top: 16px; }
    .delete-section { margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; }
  `;

  static properties = { box: { type: Object } };

  constructor() { super(); this.box = null; }

  async show(box) {
    this.box = box;
    await this.updateComplete;
    this.shadowRoot.querySelector('mwc-dialog').show();
  }

  render() {
    if (!this.box) return html``;
    return html`
      <mwc-dialog heading="Edit Storage Box">
        <div>
          <mwc-textfield id="name" label="Name" .value=${this.box.name} dialogInitialFocus></mwc-textfield>
          <mwc-textfield id="description" label="Description" .value=${this.box.description || ''} icon="description"></mwc-textfield>
          <mwc-textfield id="slug" label="Slug (Optional ID)" .value=${this.box.slug || ''} icon="fingerprint" helper="Auto-generated if empty"></mwc-textfield>
        </div>
        <div class="delete-section">
          <mwc-button @click=${this._delete} style="--mdc-theme-primary: #f44336;">Delete Box</mwc-button>
        </div>
        <mwc-button slot="primaryAction" @click=${this._save}>Save</mwc-button>
        <mwc-button slot="secondaryAction" dialogAction="close">Cancel</mwc-button>
      </mwc-dialog>
    `;
  }

  async _save() {
    const name = this.shadowRoot.getElementById('name').value;
    const description = this.shadowRoot.getElementById('description').value;
    const slug = this.shadowRoot.getElementById('slug').value;
    const url = window.AppRouter
      ? window.AppRouter.urlForPath(`/api/boxes/${this.box.id}`)
      : `api/boxes/${this.box.id}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, slug }),
    });
    if (res.ok) {
      this.dispatchEvent(new CustomEvent('box-updated', { bubbles: true, composed: true }));
      this.shadowRoot.querySelector('mwc-dialog').close();
    }
  }

  async _delete() {
    if (!confirm(`Delete "${this.box.name}"? This will delete all items inside!`)) return;
    const url = window.AppRouter
      ? window.AppRouter.urlForPath(`/api/boxes/${this.box.id}`)
      : `api/boxes/${this.box.id}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (res.ok) {
      this.dispatchEvent(new CustomEvent('box-deleted', { bubbles: true, composed: true }));
      this.shadowRoot.querySelector('mwc-dialog').close();
    }
  }
}
customElements.define('edit-box-dialog', EditBoxDialog);
