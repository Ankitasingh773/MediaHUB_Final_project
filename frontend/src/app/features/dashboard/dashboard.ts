import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AnalyticsClient } from '../../core/api/analytics-client';
import { RoyaltyClient } from '../../core/api/royalty-client';
import { SubscriptionClient } from '../../core/api/subscription-client';
import { ContentClient } from '../../core/api/content-client';
import { NotificationClient } from '../../core/api/notification-client';
import { UserSubscription, SubscriptionPlan } from '../../core/models/subscription.models';
import { ContentAsset } from '../../core/models/content.models';
import { AppNotification, ROLE_NOTIFICATION_CATEGORIES } from '../../core/models/notification.models';
import { StatCard } from '../../shared/components/stat-card';
import { EmptyState } from '../../shared/components/empty-state';
import { LoadingSpinner } from '../../shared/components/loading-spinner';
import { ToastService } from '../../shared/services/toast.service';

const CONTENT_ICON: Record<string, string> = { Video: '🎞', Image: '🖼', Article: '📄', Movie: '🎬' };
const NOTIF_ICON: Record<string, string> = { CONTENT: '🎞', SUBSCRIPTION: '◈', ROYALTY: '$', LICENSE: '⚖', EDITORIAL: '✎' };

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, StatCard, EmptyState, LoadingSpinner],
  templateUrl: './dashboard.html'
})
export class Dashboard implements OnInit {
  auth = inject(AuthService);
  private analytics = inject(AnalyticsClient);
  private royalty = inject(RoyaltyClient);
  private subscription = inject(SubscriptionClient);
  private content = inject(ContentClient);
  private notification = inject(NotificationClient);
  private toast = inject(ToastService);

  loading = signal(true);
  data = signal<any>(null);

  // Not covered by the aggregated /analytics/dashboard payload — matches the same real
  // getAllStatements()/getAllPayouts() calls the Royalty Dashboard itself uses.
  draftStatements = signal(0);
  pendingPayouts = signal(0);
  statementStatusBreakdown = signal<{ label: string; count: number }[]>([]);

  // Subscriber-facing view: subscribers hold none of content:write/subscription:manage/
  // royalty:view/license:manage, so the admin widgets below would render almost empty for them.
  isSubscriber = this.auth.hasRole('subscriber');
  mySub = signal<UserSubscription | null>(null);
  myPlan = signal<SubscriptionPlan | null>(null);
  newReleases = signal<ContentAsset[]>([]);
  recentNotifications = signal<AppNotification[]>([]);
  unreadCount = signal(0);

  ngOnInit() {
    if (this.isSubscriber) {
      this.loadSubscriberDashboard();
      return;
    }

    this.analytics.getDashboard().subscribe({
      next: d => { this.data.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });

    if (this.auth.hasPermission('royalty:view')) {
      this.royalty.getAllStatements().subscribe(rows => {
        this.draftStatements.set(rows.filter(r => r.status === 'Draft').length);
        const counts: Record<string, number> = {};
        rows.forEach(r => counts[r.status] = (counts[r.status] ?? 0) + 1);
        this.statementStatusBreakdown.set(Object.entries(counts).map(([label, count]) => ({ label, count })));
      });
      this.royalty.getAllPayouts().subscribe(rows => {
        this.pendingPayouts.set(rows.filter(p => p.status === 'Pending').length);
      });
    }
  }

  private loadSubscriberDashboard() {
    const userId = this.auth.currentUser()?.userId;
    if (!userId) { this.loading.set(false); return; }

    this.subscription.fetchSubscriptionForUser(userId).subscribe(s => {
      this.mySub.set(s ?? null);
      this.loading.set(false);
      if (s) {
        this.subscription.fetchPlans().subscribe(plans => {
          this.myPlan.set(plans.find(p => p.planId === s.planId) ?? null);
        });
      }
    });

    this.content.fetchContents().subscribe(rows => {
      this.newReleases.set(
        rows.filter(c => c.status === 'Published')
          .sort((a, b) => (b.publishedDate ?? '').localeCompare(a.publishedDate ?? ''))
          .slice(0, 4)
      );
    });

    this.loadNotifications(userId);
  }

  private loadNotifications(userId: number) {
    this.notification.getAllForUser(userId).subscribe(rows => {
      const allowed = ROLE_NOTIFICATION_CATEGORIES['subscriber'];
      const relevant = rows.filter(n => allowed.includes(n.category) && n.status !== 'DISMISSED');
      this.recentNotifications.set([...relevant].sort((a, b) => b.createdDate.localeCompare(a.createdDate)).slice(0, 4));
      this.unreadCount.set(relevant.filter(n => n.status === 'UNREAD').length);
    });
  }

  // Viewing this specific notification is what dismisses it — not just having the widget open.
  dismissNotification(n: AppNotification) {
    this.notification.updateStatus(n.notificationId, 'DISMISSED').subscribe(() => {
      const userId = this.auth.currentUser()?.userId;
      if (userId) this.loadNotifications(userId);
    });
  }

  contentIcon(type: string): string {
    return CONTENT_ICON[type] ?? '🎞';
  }

  notifIcon(n: AppNotification): string {
    return NOTIF_ICON[n.category] ?? '◇';
  }

  barPct(count: number, breakdown: { label: string; count: number }[]): number {
    const max = Math.max(...breakdown.map(b => b.count), 1);
    return Math.round((count / max) * 100);
  }

  export() {
    const d = this.data();
    if (!d) return;
    const canContent = this.auth.hasPermission('content:read');
    const rows: string[][] = [
      ['Metric', 'Value'],
      ...(canContent ? [['Total Content', String(d.contentCatalogAnalytics?.totalContents ?? '')]] : []),
      ...(this.auth.hasPermission('subscription:manage') ? [['Active Subscriptions', String(d.subscriptionAnalytics?.activeSubscriptions ?? '')]] : []),
      ...(canContent ? [['Pending Reviews', String(d.editorialAnalytics?.pendingReviews ?? '')]] : []),
      ...(canContent ? [['Approved Reviews', String(d.editorialAnalytics?.approvedReviews ?? '')]] : []),
      ...(canContent ? [['Rejected Reviews', String(d.editorialAnalytics?.rejectedReviews ?? '')]] : []),
      ...(this.auth.hasPermission('royalty:view') ? [
        ['Total Revenue', String(d.revenueAnalytics?.totalRevenue ?? '')],
        ['Royalty Payable', String(d.revenueAnalytics?.totalRoyaltyAmount ?? '')],
        ['Draft Statements', String(this.draftStatements())],
        ['Pending Payouts', String(this.pendingPayouts())]
      ] : []),
      ...(canContent ? [
        [],
        ['Content by Status', 'Count'],
        ...(d.contentCatalogAnalytics?.contentStatusBreakdown ?? []).map((b: any) => [b.label, String(b.count)]),
        [],
        ['Content by Type', 'Count'],
        ...(d.contentCatalogAnalytics?.contentTypeBreakdown ?? []).map((b: any) => [b.label, String(b.count)]),
        ...(this.auth.hasPermission('license:manage') ? [[], ['Licenses expiring < 30d', String(d.licensingAnalytics?.expiringSoonLicenses ?? '')]] : [])
      ] : []),
      ...(this.auth.hasPermission('royalty:view') ? [
        [],
        ['Statements by Status', 'Count'],
        ...this.statementStatusBreakdown().map(b => [b.label, String(b.count)])
      ] : [])
    ].map(row => row ?? []);

    const csv = rows.map(row => row.map(cell => `"${(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mediahub-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    this.toast.ok('Dashboard exported');
  }
}
