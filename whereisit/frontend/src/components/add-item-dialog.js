import { LitElement, html, css } from 'lit';
import '@material/mwc-dialog';
import '@material/mwc-textfield';
import '@material/mwc-button';

export class AddItemDialog extends LitElement {
  static styles = css`
      :host { display: block; }
      mwc-textfield {
        width: 100%;
        margin-bottom: 16px;
      }
      .file-input {
        margin-top: 8px;
        margin-bottom: 16px;
        width: 100%;
      }
      .file-input label {
        display: block;
        margin-bottom: 4px;
        color: var(--mdc-theme-text-secondary-on-background, rgba(0, 0, 0, 0.6));
        font-family: Roboto, sans-serif;
        font-size: 0.75rem;
      }
      .category-section {
        margin-bottom: 16px;
      }
      .category-label {
        font-family: Roboto, sans-serif;
        font-size: 0.75rem;
        color: rgba(0,0,0,0.6);
        margin-bottom: 8px;
      }
      .category-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 8px;
      }
      .cat-chip {
        background: #f0f2f5;
        border: 1px solid #ddd;
        border-radius: 16px;
        padding: 4px 12px;
        font-size: 0.8rem;
        font-family: Roboto, sans-serif;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .cat-chip:hover { background: #e0e0e0; }
      .cat-chip.selected {
        background: var(--mdc-theme-primary, #03a9f4);
        color: white;
        border-color: var(--mdc-theme-primary, #03a9f4);
      }
      .add-cat-row {
        display: flex;
        gap: 6px;
        align-items: center;
        margin-top: 6px;
      }
      .add-cat-row input {
        flex: 1;
        padding: 6px 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-family: Roboto, sans-serif;
        font-size: 0.875rem;
      }
      .add-cat-row button {
        background: var(--mdc-theme-primary, #03a9f4);
        color: white;
        border: none;
        border-radius: 4px;
        padding: 6px 12px;
        cursor: pointer;
        font-size: 1rem;
        font-family: Roboto, sans-serif;
      }
    `;

  static properties = {
    boxId: { type: Number },
    _availableCategories: { type: Array, state: true },
    _selectedCategories: { type: Array, state: true },
    _newCatInput: { type: String, state: true }
  };

  constructor() {
    super();
    this._availableCategories = [];
    this._selectedCategories = [];
    this._newCatInput = '';
  }

  async connectedCallback() {
    super.connectedCallback();
    await this._loadCategories();
  }

  async _loadCategories() {
    try {
      const response = await fetch(window.AppRouter ? window.AppRouter.urlForPath(`/api/categories`) : `api/categories`);
      if (response.ok) {
        this._availableCategories = await response.json();
      }
    } catch (e) {
      console.error("Failed to load categories", e);
    }
  }

  _toggleCategory(cat) {
    if (this._selectedCategories.includes(cat)) {
      this._selectedCategories = this._selectedCategories.filter(c => c !== cat);
    } else {
      this._selectedCategories = [...this._selectedCategories, cat];
    }
  }

  _addNewCategory() {
    const cat = this._newCatInput.trim();
    if (!cat) return;
    if (!this._availableCategories.includes(cat)) {
      this._availableCategories = [...this._availableCategories, cat];
    }
    if (!this._selectedCategories.includes(cat)) {
      this._selectedCategories = [...this._selectedCategories, cat];
    }
    this._newCatInput = '';
  }

  render() {
    return html`
        <mwc-dialog heading="Add Item">
          <div>
            <mwc-textfield label="Name" dialogInitialFocus></mwc-textfield>
            <mwc-textfield label="Description" icon="description"></mwc-textfield>

            <div class="category-section">
              <div class="category-label">Categories</div>
              ${this._availableCategories.length > 0 ? html`
                <div class="category-chips">
                  ${this._availableCategories.map(cat => html`
                    <button class="cat-chip ${this._selectedCategories.includes(cat) ? 'selected' : ''}"
                      @click=${() => this._toggleCategory(cat)}>${cat}</button>
                  `)}
                </div>
              ` : ''}
              <div class="add-cat-row">
                <input type="text" placeholder="New category..."
                  .value=${this._newCatInput}
                  @input=${e => this._newCatInput = e.target.value}
                  @keydown=${e => e.key === 'Enter' && this._addNewCategory()} />
                <button @click=${this._addNewCategory}>+</button>
              </div>
            </div>

            <mwc-textfield label="Quantity" type="number" icon="numbers" value="1"></mwc-textfield>
            <div class="file-input">
                <label>Photo</label>
                <input type="file" id="photo-upload" accept="image/*" capture="environment" />
            </div>
          </div>
          <mwc-button slot="primaryAction" @click=${this._save}>Save</mwc-button>
          <mwc-button slot="secondaryAction" dialogAction="cancel">Cancel</mwc-button>
        </mwc-dialog>
      `;
  }

  async show() {
    this._selectedCategories = [];
    this._newCatInput = '';
    await this._loadCategories();
    this.shadowRoot.querySelector('mwc-dialog').show();
  }

  async _save() {
    const inputs = this.shadowRoot.querySelectorAll('mwc-textfield');
    const name = inputs[0].value;
    const description = inputs[1].value;
    const quantity = parseInt(inputs[2].value) || 1;
    const category = this._selectedCategories.join(',') || null;
    const photoInput = this.shadowRoot.getElementById('photo-upload');

    if (!name) {
      inputs[0].setCustomValidity("Name is required");
      inputs[0].reportValidity();
      return;
    }

    try {
      const response = await fetch(window.AppRouter ? window.AppRouter.urlForPath(`/api/boxes/${this.boxId}/items`) : `api/boxes/${this.boxId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, category, quantity })
      });

      if (response.ok) {
        const createdItem = await response.json();

        if (photoInput.files && photoInput.files.length > 0) {
          const file = photoInput.files[0];
          const formData = new FormData();
          formData.append('file', file);
          const uploadUrl = window.AppRouter ? window.AppRouter.urlForPath(`/api/items/${createdItem.id}/photo`) : `api/items/${createdItem.id}/photo`;
          await fetch(uploadUrl, { method: 'POST', body: formData });
        }

        this.dispatchEvent(new CustomEvent('item-added', { bubbles: true, composed: true }));
        this.shadowRoot.querySelector('mwc-dialog').close();
        inputs.forEach(i => i.value = '');
        inputs[2].value = "1";
        this._selectedCategories = [];
        if (photoInput) photoInput.value = "";

      } else {
        alert('Failed to save item');
      }
    } catch (e) {
      console.error("Error saving item", e);
      alert('Error saving item');
    }
  }
}
customElements.define('add-item-dialog', AddItemDialog);
