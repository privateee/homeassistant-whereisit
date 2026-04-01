import { LitElement, html, css } from 'lit';
import '@material/mwc-dialog';
import '@material/mwc-button';
import '@material/mwc-textfield';

export class EditItemDialog extends LitElement {
    static styles = css`
    mwc-textfield {
      width: 100%;
      margin-top: 16px;
    }
    .file-input {
      margin-top: 16px;
      width: 100%;
    }
    .file-input label {
      display: block;
      margin-bottom: 4px;
      color: var(--mdc-theme-text-secondary-on-background, rgba(0, 0, 0, 0.6));
      font-family: Roboto, sans-serif;
      font-size: 0.75rem;
    }
    .current-photo {
        max-width: 100%;
        max-height: 200px;
        margin-top: 8px;
        border-radius: 8px;
        object-fit: contain;
    }
    .delete-section {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #eee;
    }
    .category-section {
      margin-top: 16px;
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
        item: { type: Object },
        _availableCategories: { type: Array, state: true },
        _selectedCategories: { type: Array, state: true },
        _newCatInput: { type: String, state: true }
    };

    constructor() {
        super();
        this.item = null;
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

    async show(item) {
        this.item = item;
        this._selectedCategories = item.category
            ? item.category.split(',').map(c => c.trim()).filter(Boolean)
            : [];
        this._newCatInput = '';
        await this._loadCategories();
        // Ensure any item categories not in the list are added
        for (const cat of this._selectedCategories) {
            if (!this._availableCategories.includes(cat)) {
                this._availableCategories = [...this._availableCategories, cat];
            }
        }
        await this.updateComplete;
        this.shadowRoot.querySelector('mwc-dialog').show();
    }

    render() {
        if (!this.item) return html``;

        return html`
      <mwc-dialog heading="Edit Item">
        <div>
          <mwc-textfield id="name" label="Name" .value=${this.item.name} dialogInitialFocus></mwc-textfield>
          <mwc-textfield id="description" label="Description" .value=${this.item.description || ''} icon="description"></mwc-textfield>

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

          <mwc-textfield id="quantity" label="Quantity" type="number" .value=${this.item.quantity} icon="numbers"></mwc-textfield>

          <div class="file-input">
            <label>Update Photo</label>
            <input type="file" id="photo-upload" accept="image/*" capture="environment" />
            ${this.item.photo_path
                ? html`<img src="${window.AppRouter ? window.AppRouter.urlForPath(this.item.photo_path) : this.item.photo_path}" class="current-photo" />`
                : ''}
          </div>
        </div>

        <div class="delete-section">
            <mwc-button @click=${this._delete} style="--mdc-theme-primary: #f44336;">Delete Item</mwc-button>
        </div>

        <mwc-button slot="primaryAction" @click=${this._save}>Save</mwc-button>
        <mwc-button slot="secondaryAction" dialogAction="close">Cancel</mwc-button>
      </mwc-dialog>
    `;
    }

    async _save() {
        const name = this.shadowRoot.getElementById('name').value;
        const description = this.shadowRoot.getElementById('description').value;
        const category = this._selectedCategories.join(',') || null;
        const quantity = parseInt(this.shadowRoot.getElementById('quantity').value);
        const photoInput = this.shadowRoot.getElementById('photo-upload');

        try {
            const url = window.AppRouter ? window.AppRouter.urlForPath(`/api/items/${this.item.id}`) : `api/items/${this.item.id}`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description, category, quantity })
            });

            if (response.ok) {
                if (photoInput.files && photoInput.files.length > 0) {
                    const file = photoInput.files[0];
                    const formData = new FormData();
                    formData.append('file', file);
                    const uploadUrl = window.AppRouter ? window.AppRouter.urlForPath(`/api/items/${this.item.id}/photo`) : `api/items/${this.item.id}/photo`;
                    await fetch(uploadUrl, { method: 'POST', body: formData });
                }

                this.dispatchEvent(new CustomEvent('item-updated'));
                this.shadowRoot.querySelector('mwc-dialog').close();
                if (photoInput) photoInput.value = "";
            }
        } catch (e) {
            console.error(e);
        }
    }

    async _delete() {
        if (!confirm(`Are you sure you want to delete "${this.item.name}"?`)) return;

        try {
            const response = await fetch(`api/items/${this.item.id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.dispatchEvent(new CustomEvent('item-deleted'));
                this.shadowRoot.querySelector('mwc-dialog').close();
            }
        } catch (e) {
            console.error(e);
        }
    }
}

customElements.define('edit-item-dialog', EditItemDialog);
