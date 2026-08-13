import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentClient } from '../../core/api/content-client';
import { ContentTag } from '../../core/models/content.models';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { ToastService } from '../../shared/services/toast.service';
import { LoadingSpinner } from '../../shared/components/loading-spinner';
import { Pagination } from '../../shared/components/pagination';
import { FitRowsDirective } from '../../shared/directives/fit-rows.directive';
import { RowMenu, RowMenuItem } from '../../shared/components/row-menu';
import { clampContentId, contentIdError as contentIdErrorFor } from '../../shared/utils/content-id';

@Component({
  selector: 'app-tag-management',
  imports: [FormsModule, LoadingSpinner, RowMenu, Pagination, FitRowsDirective],
  templateUrl: './tag-management.html'
})
export class TagManagement implements OnInit {
  private content = inject(ContentClient);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  loading = signal(true);
  tags = signal<ContentTag[]>([]);

  page = signal(0);
  pageSize = signal(10);
  totalPages = computed(() => Math.max(1, Math.ceil(this.tags().length / this.pageSize())));
  pagedTags = computed(() => this.tags().slice(this.page() * this.pageSize(), (this.page() + 1) * this.pageSize()));

  onRowsThatFit(n: number) {
    if (n === this.pageSize()) return;
    this.pageSize.set(n);
    this.page.set(0);
  }
  creating = signal(false);
  viewing = signal<ContentTag | null>(null);
  newTagName = '';
  newTagCategory: ContentTag['tagCategory'] = 'Genre';
  newTagContentId = 0;
  contentIdTouched = signal(false);

  get contentIdError(): string {
    return this.contentIdTouched() ? contentIdErrorFor(this.newTagContentId) : '';
  }

  onContentIdChange(value: number) {
    this.newTagContentId = clampContentId(value);
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.content.fetchTags().subscribe({
      next: t => {
        this.tags.set(t);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.warn(err?.error?.message ?? 'Unable to load tags');
      }
    });
  }

  create() {
    this.contentIdTouched.set(true);
    if (!this.newTagName.trim() || contentIdErrorFor(this.newTagContentId)) return;
    this.content.addTag({ tagName: this.newTagName.trim(), tagCategory: this.newTagCategory, contentId: this.newTagContentId }).subscribe(() => {
      this.toast.ok('Tag added successfully');
      this.creating.set(false);
      this.newTagName = '';
      this.newTagContentId = 0;
      this.contentIdTouched.set(false);
      this.load();
    });
  }

  menuFor(t: ContentTag): RowMenuItem[] {
    const items: RowMenuItem[] = [{ label: 'View', action: 'view' }];
    if (this.auth.hasPermission('content:delete')) items.push({ label: 'Delete', action: 'delete' });
    return items;
  }

  onAction(action: string, t: ContentTag) {
    if (action === 'view') this.viewing.set(t);
    if (action === 'delete') this.remove(t);
  }

  async remove(t: ContentTag) {
    const ok = await this.confirm.ask(`Remove tag "${t.tagName}"?`, 'Remove', true);
    if (!ok) return;
    this.content.removeTag(t.tagId).subscribe(() => {
      this.toast.ok('Tag removed successfully');
      this.load();
    });
  }
}
