import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LicensingClient } from '../../core/api/licensing-client';
import { TerritoryRestriction } from '../../core/models/licensing.models';
import { RowMenu, RowMenuItem } from '../../shared/components/row-menu';
import { LoadingSpinner } from '../../shared/components/loading-spinner';
import { Pagination } from '../../shared/components/pagination';
import { FitRowsDirective } from '../../shared/directives/fit-rows.directive';
import { ToastService } from '../../shared/services/toast.service';
import { CONTENT_ID_MAX_DIGITS, clampContentId, contentIdError as contentIdErrorFor, digitLimitMessage } from '../../shared/utils/content-id';

@Component({
  selector: 'app-territory-restrictions',
  imports: [FormsModule, RouterLink, RowMenu, LoadingSpinner, Pagination, FitRowsDirective],
  templateUrl: './territory-restrictions.html'
})
export class TerritoryRestrictions implements OnInit {
  private licensing = inject(LicensingClient);
  private toast = inject(ToastService);

  loading = signal(true);
  rows = signal<TerritoryRestriction[]>([]);

  page = signal(0);
  pageSize = signal(10);
  totalPages = computed(() => Math.max(1, Math.ceil(this.rows().length / this.pageSize())));
  pagedRows = computed(() => this.rows().slice(this.page() * this.pageSize(), (this.page() + 1) * this.pageSize()));

  onRowsThatFit(n: number) {
    if (n === this.pageSize()) return;
    this.pageSize.set(n);
    this.page.set(0);
  }

  creating = signal(false);
  editing = signal<TerritoryRestriction | null>(null);
  form = { contentId: 0, restrictedCountries: '', allowedCountries: '', effectiveDate: '' };
  contentIdTouched = signal(false);
  contentIdLimitMsg = signal('');

  get contentIdError(): string {
    return this.contentIdLimitMsg() || (this.contentIdTouched() ? contentIdErrorFor(this.form.contentId) : '');
  }

  onContentIdChange(value: number) {
    this.contentIdLimitMsg.set(digitLimitMessage(value, CONTENT_ID_MAX_DIGITS, 'Content ID'));
    this.form.contentId = clampContentId(value);
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.licensing.getTerritoryRestrictions(undefined, true).subscribe({
      next: rows => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.warn(err?.error?.message ?? 'Unable to load territory restrictions');
      }
    });
  }

  menuFor(t: TerritoryRestriction): RowMenuItem[] {
    return [
      { label: 'Edit', action: 'edit' },
      { label: t.status === 'Active' ? 'Deactivate' : 'Activate', action: 'toggle' }
    ];
  }

  onAction(action: string, t: TerritoryRestriction) {
    if (action === 'edit') this.openEdit(t);
    if (action === 'toggle') this.toggle(t);
  }

  toggle(t: TerritoryRestriction) {
    this.licensing.toggleTerritoryStatus(t.restrictionId, t.status).subscribe({
      next: () => {
        this.toast.ok(t.status === 'Active' ? 'Restriction deactivated' : 'Restriction activated');
        this.load();
      },
      error: (err) => this.toast.warn(err?.error?.message ?? 'Unable to update restriction status')
    });
  }

  openCreate() {
    this.form = { contentId: 0, restrictedCountries: '', allowedCountries: '', effectiveDate: '' };
    this.contentIdTouched.set(false);
    this.contentIdLimitMsg.set('');
    this.creating.set(true);
  }

  openEdit(t: TerritoryRestriction) {
    this.form = { contentId: t.contentId, restrictedCountries: t.restrictedCountries, allowedCountries: t.allowedCountries, effectiveDate: t.effectiveDate };
    this.editing.set(t);
  }

  save() {
    const editing = this.editing();
    if (editing) {
      this.licensing.updateTerritoryRestriction(editing.restrictionId, this.form).subscribe(() => {
        this.toast.ok('Territory rule updated successfully');
        this.editing.set(null);
        this.load();
      });
    } else {
      this.contentIdTouched.set(true);
      if (contentIdErrorFor(this.form.contentId) || !this.form.effectiveDate) return;
      this.licensing.createTerritoryRestriction(this.form).subscribe(() => {
        this.toast.ok('Territory rule created successfully');
        this.creating.set(false);
        this.load();
      });
    }
  }
}
