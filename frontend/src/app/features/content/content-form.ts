import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ContentClient } from '../../core/api/content-client';
import { CONTENT_TYPES, ContentAsset, Creator } from '../../core/models/content.models';
import { ToastService } from '../../shared/services/toast.service';
import { LoadingSpinner } from '../../shared/components/loading-spinner';
import { ContentPreview } from '../../shared/components/content-preview';
import { AuthService } from '../../core/auth/auth.service';

const TITLE_MAX = 150;

// Pasting a path copied from VS Code/Explorer gives an absolute path like
// "C:\...\demo-assets\Images\foo.jpg", but the backend's /media/** route only understands the
// relative form ("Images/foo.jpg"). Strip everything through "demo-assets/" so either form works.
function normalizeFilePath(raw: string): string {
  const slashed = raw.trim().replace(/\\/g, '/');
  const marker = 'demo-assets/';
  const idx = slashed.toLowerCase().lastIndexOf(marker);
  return idx === -1 ? slashed : slashed.slice(idx + marker.length);
}

// The demo-assets folder is organized by type (Videos/, Images/, Articles/) — if Content Type
// doesn't match the folder the file path points into, the preview breaks (e.g. Type "Video"
// pointing at "Images/photo.jpg"). Content Type defaults to "Video", so if a user fills in File
// Path before ever touching the Type dropdown, matching against that untouched default would
// flag a "mismatch" they never consciously created. So the File Path field drives Content Type
// (auto-set it from whichever folder the path points into) rather than the other way around —
// the error below only fires if the user deliberately changes Type after a path is already set.
const TYPE_FOLDER: Record<ContentAsset['type'], string> = { Video: 'Videos', Image: 'Images', Article: 'Articles', Movie: 'Videos' };

function detectTypeFromPath(path: string): ContentAsset['type'] | null {
  const folder = path.split('/')[0];
  const match = (Object.entries(TYPE_FOLDER) as [ContentAsset['type'], string][]).find(([, f]) => f === folder);
  return match ? match[0] : null;
}

@Component({
  selector: 'app-content-form',
  imports: [FormsModule, RouterLink, LoadingSpinner, ContentPreview],
  templateUrl: './content-form.html'
})
export class ContentForm implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private content = inject(ContentClient);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  contentTypes = CONTENT_TYPES;
  loading = signal(true);
  saving = signal(false);
  creators = signal<Creator[]>([]);
  editingId = signal<number | null>(null);
  previewAsset = signal<ContentAsset | null>(null);
  titleTouched = signal(false);
  titleMax = TITLE_MAX;
  filePathTouched = signal(false);

  form: { title: string; type: ContentAsset['type']; creatorId: number; genre: string; language: string; synopsis: string; filePath: string } =
    { title: '', type: 'Video', creatorId: 0, genre: '', language: 'English', synopsis: '', filePath: '' };

  get isEdit(): boolean {
    return this.editingId() !== null;
  }

  get titleError(): string {
    if (!this.titleTouched()) return '';
    const t = this.form.title.trim();
    if (!t) return 'Title is required';
    if (t.length > TITLE_MAX) return `Title must be ${TITLE_MAX} characters or fewer`;
    return '';
  }

  get filePathError(): string {
    if (!this.filePathTouched()) return '';
    const path = normalizeFilePath(this.form.filePath);
    if (!path) return '';
    const expectedFolder = TYPE_FOLDER[this.form.type];
    const actualFolder = path.split('/')[0];
    if (actualFolder !== expectedFolder) {
      return `Content Type is "${this.form.type}" but this file is under "${actualFolder}/" — move it to "${expectedFolder}/" or change the Content Type to match.`;
    }
    return '';
  }

  ngOnInit() {
    this.content.fetchCreators().subscribe(rows => {
      this.creators.set(rows);
      if (this.form.creatorId || !rows.length) return;
      const own = rows.find(c => c.userId === this.auth.currentUser()?.userId);
      this.form.creatorId = (own ?? rows[0]).creatorId;
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      this.editingId.set(id);
      this.content.fetchContentById(id).subscribe(c => {
        if (c) {
          this.form = { title: c.title, type: c.type, creatorId: c.creatorId, genre: c.genre ?? '', language: c.language ?? '', synopsis: c.synopsis ?? '', filePath: normalizeFilePath(c.filePath ?? '') };
          this.refreshPreview();
        }
        this.loading.set(false);
      });
    } else {
      this.loading.set(false);
    }
  }

  // Only re-built when type/filePath actually change (see content-form.html) — not on every
  // keystroke elsewhere in the form, so article previews don't re-fetch needlessly.
  refreshPreview() {
    this.previewAsset.set({
      contentId: 0, creatorId: this.form.creatorId, title: this.form.title,
      type: this.form.type, filePath: this.form.filePath, status: 'Draft'
    } as ContentAsset);
  }

  // Bound to the File Path field specifically (not the Type dropdown) — auto-syncs Content Type
  // to match, so filling in the path is enough on its own; no need to also remember to flip the
  // Type dropdown first.
  onFilePathChange() {
    this.form.filePath = normalizeFilePath(this.form.filePath);
    const detected = detectTypeFromPath(this.form.filePath);
    if (detected) this.form.type = detected;
    this.filePathTouched.set(true);
    this.refreshPreview();
  }

  save() {
    this.titleTouched.set(true);
    this.filePathTouched.set(true);
    this.form.filePath = normalizeFilePath(this.form.filePath);
    if (this.titleError || this.filePathError || !this.form.creatorId) {
      this.toast.warn(this.titleError || this.filePathError || 'Creator is required');
      return;
    }
    this.saving.set(true);
    const id = this.editingId();
    if (id !== null) {
      this.content.updateContent(id, this.form).subscribe(() => {
        this.toast.ok('Content updated successfully');
        this.router.navigate(['/content', id]);
      });
    } else {
      this.content.createContent(this.form).subscribe(() => {
        this.toast.ok('Content created successfully');
        this.router.navigate(['/content']);
      });
    }
  }
}
