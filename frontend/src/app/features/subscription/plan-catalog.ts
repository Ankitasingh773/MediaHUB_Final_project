import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SubscriptionClient } from '../../core/api/subscription-client';
import { SubscriptionPlan } from '../../core/models/subscription.models';
import { AuthService } from '../../core/auth/auth.service';
import { LoadingSpinner } from '../../shared/components/loading-spinner';
import { StatusBadge } from '../../shared/components/status-badge';
import { ToastService } from '../../shared/services/toast.service';

const CURATED_PLAN_NAMES = ['Basic', 'Standard', 'Premium', 'Enterprise'];

/** Legacy plans (Standard/gold) predate this curated catalog and can't be renamed via the
 *  update API (UpdatePlanRequest has no name field) — they stay Active for existing
 *  subscribers but are hidden from this browse page in favor of the curated set. */
const PLAN_META: Record<string, { desc: string; features: { label: string; yes: boolean }[] }> = {
  Basic: {
    desc: 'Great for individuals getting started.',
    features: [
      { label: 'Standard content library', yes: true },
      { label: '1 device at a time', yes: true },
      { label: 'Offline downloads', yes: false },
      { label: 'Priority support', yes: false }
    ]
  },
  Standard: {
    desc: 'Perfect for growing households.',
    features: [
      { label: 'Standard content library', yes: true },
      { label: 'Up to 2 devices', yes: true },
      { label: 'Offline downloads', yes: false },
      { label: 'Priority support', yes: false }
    ]
  },
  Premium: {
    desc: 'Best value for regular viewers.',
    features: [
      { label: 'Full content library', yes: true },
      { label: 'Up to 4 devices', yes: true },
      { label: 'Offline downloads', yes: true },
      { label: 'Priority support', yes: false }
    ]
  },
  Enterprise: {
    desc: 'For power users and teams.',
    features: [
      { label: 'Full + exclusive content library', yes: true },
      { label: 'Unlimited devices', yes: true },
      { label: 'Offline downloads', yes: true },
      { label: 'Priority support', yes: true }
    ]
  }
};

@Component({
  selector: 'app-plan-catalog',
  imports: [LoadingSpinner, StatusBadge, FormsModule],
  templateUrl: './plan-catalog.html'
})
export class PlanCatalog implements OnInit {
  private subscription = inject(SubscriptionClient);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);

  /** Admins don't subscribe — they browse the full catalog as a read-only management-style
   *  table (matching the Commerce → Subscriptions → Plans screen) instead of the subscribe cards. */
  isAdmin = this.auth.hasRole('admin');

  loading = signal(true);
  plans = signal<SubscriptionPlan[]>([]);

  subscribing = signal<SubscriptionPlan | null>(null);
  agreed = signal(false);
  submitting = signal(false);
  renewalTypeTouched = signal(false);
  form = { renewalType: '' as '' | 'AutoRenew' | 'Manual', startDate: '' };

  ngOnInit() {
    this.subscription.fetchPlans().subscribe(rows => {
      // Admins see every plan (with its status) as a management-style table; subscribers see
      // only the curated Active plans they can actually sign up for.
      const list = this.isAdmin
        ? [...rows].sort((a, b) => a.price - b.price)
        : rows.filter(p => p.status === 'Active' && CURATED_PLAN_NAMES.includes(p.name)).sort((a, b) => a.price - b.price);
      this.plans.set(list);
      this.loading.set(false);
    });
  }

  meta(p: SubscriptionPlan) {
    return PLAN_META[p.name] ?? { desc: '', features: [] };
  }

  maxDevicesLabel(p: SubscriptionPlan) {
    return (p.maxDevices ?? 0) >= 999 ? 'Unlimited' : String(p.maxDevices ?? 0);
  }

  open(p: SubscriptionPlan) {
    this.subscribing.set(p);
    this.agreed.set(false);
    this.renewalTypeTouched.set(false);
    this.form = { renewalType: '', startDate: new Date().toISOString().slice(0, 10) };
  }

  close() {
    this.subscribing.set(null);
  }

  confirm() {
    const p = this.subscribing();
    const userId = this.auth.currentUser()?.userId;
    this.renewalTypeTouched.set(true);
    if (!p || !userId || !this.form.renewalType || !this.agreed()) return;
    const end = new Date(new Date(this.form.startDate).getTime() + 30 * 86400000).toISOString().slice(0, 10);
    this.submitting.set(true);
    this.subscription.createSubscription({
      userId, planId: p.planId, startDate: this.form.startDate, endDate: end, renewalType: this.form.renewalType
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toast.ok(`Subscribed to ${p.name}`);
        this.close();
        this.router.navigate(['/subscription/my']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.warn(err?.error?.message ?? 'You already have an active subscription');
      }
    });
  }
}
