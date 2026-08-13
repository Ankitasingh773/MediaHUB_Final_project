import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ContentClient } from '../../core/api/content-client';
import { EditorialClient } from '../../core/api/editorial-client';
import { CONTENT_TYPES, ContentAsset } from '../../core/models/content.models';
import { AuthService } from '../../core/auth/auth.service';
import { StatusBadge } from '../../shared/components/status-badge';
import { FilterChip } from '../../shared/components/filter-chip';
import { RowMenu, RowMenuItem } from '../../shared/components/row-menu';
import { LoadingSpinner } from '../../shared/components/loading-spinner';
import { Pagination } from '../../shared/components/pagination';
import { FitRowsDirective } from '../../shared/directives/fit-rows.directive';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';

const STATUS_OPTIONS = ['All', 'Draft', 'UnderReview', 'Published', 'Archived', 'Removed'];
const TYPE_OPTIONS = ['All', ...CONTENT_TYPES];

@Component({
  selector: 'app-content-list',
  imports: [FormsModule, RouterLink, StatusBadge, FilterChip, RowMenu, LoadingSpinner, Pagination, FitRowsDirective],
  templateUrl: './content-list.html'
})
export class ContentList implements OnInit {
  private content = inject(ContentClient);
  private editorial = inject(EditorialClient);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private router = inject(Router);
  auth = inject(AuthService);

  loading = signal(true);
  all = signal<ContentAsset[]>([]);
  searchTerm = signal('');
  statusFilter = signal('');
  typeFilter = signal('');
  statusOptions = STATUS_OPTIONS;
  typeOptions = TYPE_OPTIONS;

  rows = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.all()
      .filter(c => !this.statusFilter() || c.status === this.statusFilter())
      .filter(c => !this.typeFilter() || c.type === this.typeFilter())
      .filter(c => !term || c.title.toLowerCase().includes(term) || ('cnt-' + c.contentId).toLowerCase().includes(term) || String(c.contentId).includes(term));
  });

  page = signal(0);
  pageSize = signal(10);
  totalPages = computed(() => Math.max(1, Math.ceil(this.rows().length / this.pageSize())));
  pagedRows = computed(() => this.rows().slice(this.page() * this.pageSize(), (this.page() + 1) * this.pageSize()));

  onSearchChange(term: string) {
    this.searchTerm.set(term);
    this.page.set(0);
  }

  onStatusFilterChange(value: string) {
    this.statusFilter.set(value);
    this.page.set(0);
  }

  onTypeFilterChange(value: string) {
    this.typeFilter.set(value);
    this.page.set(0);
  }

  // Called by [appFitRows] with however many rows actually fit the screen without scrolling —
  // pagination absorbs the rest instead of an internal scrollbar.
  onRowsThatFit(n: number) {
    if (n === this.pageSize()) return;
    this.pageSize.set(n);
    this.page.set(0);
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.content.fetchContents().subscribe({
      next: rows => {
        this.all.set(rows);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.warn(err?.error?.message ?? 'Unable to load content');
      }
    });
  }

  menuFor(c: ContentAsset): RowMenuItem[] {
    const items: RowMenuItem[] = [{ label: 'View', action: 'view' }];
    if (this.auth.hasPermission('content:write')) {
      items.push({ label: 'Edit', action: 'edit' });
      if (c.status === 'Draft') items.push({ label: 'Submit for Review', action: 'submit' });
    }
    if (this.auth.hasPermission('content:delete') && c.status === 'Draft') items.push({ label: 'Delete', action: 'delete' });
    return items;
  }

  onAction(action: string, c: ContentAsset) {
    if (action === 'view') this.router.navigate(['/content', c.contentId]);
    if (action === 'edit') this.router.navigate(['/content', c.contentId, 'edit']);
    if (action === 'delete') this.deleteContent(c);
    if (action === 'submit') this.submitForReview(c);
  }

  submitForReview(c: ContentAsset) {
    this.editorial.submitForReview(c.contentId).subscribe({
      next: () => {
        this.content.updateContentStatus(c.contentId, 'UnderReview').subscribe(() => {
          this.toast.ok('Content submitted for review');
          this.load();
        });
      },
      error: (err) => this.toast.warn(err?.error?.message ?? 'Unable to submit for review')
    });
  }

  async deleteContent(c: ContentAsset) {
    const ok = await this.confirm.ask(`Delete "${c.title}"? This cannot be undone.`, 'Delete', true);
    if (!ok) return;
    this.content.deleteContent(c.contentId).subscribe({
      next: () => { this.toast.ok('Content deleted successfully'); this.load(); },
      error: (err) => this.toast.warn(err?.error?.message ?? 'Unable to delete content')
    });
  }
}
