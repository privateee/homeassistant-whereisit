import { LitElement, html, css } from 'lit';
import '@material/mwc-dialog';
import '@material/mwc-textfield';
import '@material/mwc-button';

export class AddLocationDialog extends LitElement {
  static styles = css`
    mwc-textfield { width: 100%; margin-bottom: 16px; }
  `;

  static properties = { unitId: { type: Number } };

  render() {
    return html`
      <mwc-dialog heading="Add Location">
        <div>
          <mwc-textfield label="Name" dialogInitialFocus placeholder="e.g. Shelf A, Top Drawer"></mwc-textfield>
          <mwc-textfield label="Description" icon="description"></mwc-textfield>
        </div>
        <mwc-button slot="primaryAction" @click=${this._save}>Save</mwc-button>
        <mwc-button slot="secondaryAction" dialogAction="cancel">Cancel</mwc-button>
      </mwc-dialog>
    `;
  }

  show() { this.shadowRoot.querySelector('mwc-dialog').show(); }

  async _save() {
    const inputs = this.shadowRoot.querySelectorAll('mwc-textfield');
    const name = inputs[0].value.trim();
    const description = inputs[1].value.trim();
    if (!name) { inputs[0].setCustomValidity('Name is required'); inputs[0].reportValidity(); return; }

    const url = window.AppRouter ? window.AppRouter.urlForPath('/api/locations') : '/api/locations';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: description || null, unit_id: Number(this.unitId) }),
    });

    if (res.ok) {
      this.dispatchEvent(new CustomEvent('location-added', { bubbles: true, composed: true }));
      this.shadowRoot.querySelector('mwc-dialog').close();
      inputs.forEach(i => i.value = '');
    } else {
      alert('Failed to save location');
    }
  }
}
customElements.define('add-location-dialog', AddLocationDialog);
