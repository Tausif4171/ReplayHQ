"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  KeyRound,
  Loader2,
  ShieldCheck,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Role = "ADMIN" | "UPLOADER" | "VIEWER";
type AccessRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
type RequestFilter = "ALL" | AccessRequestStatus;

interface ExistingUser {
  id: string;
  role: Role;
  hasPassword: boolean;
}

interface AccessRequest {
  id: string;
  email: string;
  name: string | null;
  message: string | null;
  status: AccessRequestStatus;
  requestedRole: Role;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  existingUser: ExistingUser | null;
}

interface AccessRequestCounts {
  pending: number;
  approved: number;
  rejected: number;
  users: number;
  admins: number;
}

interface ManagedUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
  passwordSetAt: string | null;
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    uploads: number;
    recordings: number;
  };
}

interface UserCounts {
  admins: number;
  uploaders: number;
  viewers: number;
}

const ROLES: Role[] = ["VIEWER", "UPLOADER", "ADMIN"];
const FILTERS: { label: string; value: RequestFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
];

function formatRole(role: Role) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function formatDate(value: string | null) {
  if (!value) return "Not reviewed";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getStatusStyles(status: AccessRequestStatus) {
  if (status === "APPROVED") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "REJECTED") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }

  return "border-amber-500/30 bg-amber-500/10 text-amber-300";
}

function getRoleStyles(role: Role) {
  if (role === "ADMIN") {
    return "border-primary/30 bg-primary/10 text-primary";
  }

  if (role === "UPLOADER") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  }

  return "border-border bg-secondary/60 text-muted-foreground";
}

export default function AdminSettingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [requestFilter, setRequestFilter] = useState<RequestFilter>("PENDING");
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [requestCounts, setRequestCounts] = useState<AccessRequestCounts>({
    pending: 0,
    approved: 0,
    rejected: 0,
    users: 0,
    admins: 0,
  });
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [userCounts, setUserCounts] = useState<UserCounts>({
    admins: 0,
    uploaders: 0,
    viewers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [requestRoleDrafts, setRequestRoleDrafts] = useState<
    Record<string, Role>
  >({});
  const [requestNotes, setRequestNotes] = useState<Record<string, string>>({});
  const [userRoleDrafts, setUserRoleDrafts] = useState<Record<string, Role>>({});

  const isAdmin = session?.user?.role === "ADMIN";

  const loadRequests = useCallback(async () => {
    const query =
      requestFilter === "ALL" ? "" : `?status=${encodeURIComponent(requestFilter)}`;
    const response = await fetch(`/api/admin/access-requests${query}`);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || "Could not load access requests.");
    }

    setRequests(data.requests);
    setRequestCounts(data.counts);
  }, [requestFilter]);

  const loadUsers = useCallback(async () => {
    const response = await fetch("/api/admin/users");
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || "Could not load members.");
    }

    setUsers(data.users);
    setUserCounts(data.counts);
  }, []);

  const loadData = useCallback(async () => {
    if (!isAdmin) return;

    setLoading(true);
    setError(null);

    try {
      await Promise.all([loadRequests(), loadUsers()]);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load admin settings."
      );
    } finally {
      setLoading(false);
    }
  }, [isAdmin, loadRequests, loadUsers]);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      loadData();
    }
  }, [loadData, sessionStatus]);

  useEffect(() => {
    setRequestRoleDrafts((current) => {
      const next = { ...current };
      requests.forEach((request) => {
        if (!next[request.id]) {
          next[request.id] = request.requestedRole;
        }
      });
      return next;
    });
  }, [requests]);

  useEffect(() => {
    setUserRoleDrafts((current) => {
      const next = { ...current };
      users.forEach((user) => {
        if (!next[user.id]) {
          next[user.id] = user.role;
        }
      });
      return next;
    });
  }, [users]);

  const totalRequests = useMemo(
    () =>
      requestCounts.pending + requestCounts.approved + requestCounts.rejected,
    [requestCounts]
  );

  async function reviewRequest(
    request: AccessRequest,
    action: "approve" | "reject"
  ) {
    const actionId = `${action}-${request.id}`;
    setBusyAction(actionId);
    setError(null);
    setNotice(null);

    try {
      const payload =
        action === "approve"
          ? {
              action,
              role: requestRoleDrafts[request.id] || request.requestedRole,
              reviewNote: requestNotes[request.id],
              sendSetupEmail: true,
            }
          : {
              action,
              reviewNote: requestNotes[request.id],
            };

      const response = await fetch(`/api/admin/access-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Could not update request.");
      }

      const emailStatus =
        action === "approve" && data.setupEmail?.delivered === false
          ? " Email delivery is not configured, so setup instructions were logged on the server."
          : "";
      setNotice(
        action === "approve"
          ? `Approved ${request.email}.${emailStatus}`
          : `Rejected ${request.email}.`
      );
      await loadData();
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Could not update request."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function updateUserRole(user: ManagedUser) {
    const role = userRoleDrafts[user.id] || user.role;
    const actionId = `role-${user.id}`;
    setBusyAction(actionId);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Could not update member role.");
      }

      setNotice(`Updated ${user.email} to ${formatRole(role)}.`);
      await loadUsers();
    } catch (roleError) {
      setError(
        roleError instanceof Error
          ? roleError.message
          : "Could not update member role."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function resendSetup(user: ManagedUser) {
    const actionId = `setup-${user.id}`;
    setBusyAction(actionId);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}/password-setup`, {
        method: "POST",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Could not send setup instructions.");
      }

      const emailStatus =
        data.setupEmail?.delivered === false
          ? " Email delivery is not configured, so instructions were logged on the server."
          : "";
      setNotice(`Setup instructions sent to ${user.email}.${emailStatus}`);
    } catch (setupError) {
      setError(
        setupError instanceof Error
          ? setupError.message
          : "Could not send setup instructions."
      );
    } finally {
      setBusyAction(null);
    }
  }

  if (sessionStatus === "loading") {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              Only ReplayHQ admins can review access requests and manage team
              roles.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team access</h1>
          <p className="mt-1 text-muted-foreground">
            Review access requests, assign roles, and help members set up
            email sign-in.
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Clock3 className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {(error || notice) && (
        <div
          className={cn(
            "flex gap-2 rounded-lg border px-4 py-3 text-sm",
            error
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          )}
        >
          {error ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{error || notice}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={UserPlus}
          label="Pending requests"
          value={requestCounts.pending}
        />
        <MetricCard icon={Users} label="Members" value={requestCounts.users} />
        <MetricCard
          icon={ShieldCheck}
          label="Admins"
          value={requestCounts.admins}
        />
        <MetricCard icon={UserCheck} label="Total requests" value={totalRequests} />
      </div>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">Access requests</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Review queue</CardTitle>
                <CardDescription>
                  Approve trusted team members and send password setup
                  instructions.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((filter) => (
                  <Button
                    key={filter.value}
                    variant={
                      requestFilter === filter.value ? "secondary" : "outline"
                    }
                    size="sm"
                    onClick={() => setRequestFilter(filter.value)}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <LoadingRows label="Loading requests..." />
              ) : requests.length === 0 ? (
                <EmptyState
                  icon={UserCheck}
                  title="No requests here"
                  description="New access requests will appear in this queue."
                />
              ) : (
                requests.map((request) => (
                  <RequestRow
                    key={request.id}
                    request={request}
                    role={requestRoleDrafts[request.id] || request.requestedRole}
                    note={requestNotes[request.id] || ""}
                    busyAction={busyAction}
                    onRoleChange={(role) =>
                      setRequestRoleDrafts((current) => ({
                        ...current,
                        [request.id]: role,
                      }))
                    }
                    onNoteChange={(note) =>
                      setRequestNotes((current) => ({
                        ...current,
                        [request.id]: note,
                      }))
                    }
                    onApprove={() => reviewRequest(request, "approve")}
                    onReject={() => reviewRequest(request, "reject")}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                Update roles and resend password setup instructions when needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <RoleCount label="Admins" value={userCounts.admins} />
                <RoleCount label="Uploaders" value={userCounts.uploaders} />
                <RoleCount label="Viewers" value={userCounts.viewers} />
              </div>

              {loading ? (
                <LoadingRows label="Loading members..." />
              ) : users.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No members yet"
                  description="Approved users will appear here."
                />
              ) : (
                users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    role={userRoleDrafts[user.id] || user.role}
                    busyAction={busyAction}
                    onRoleChange={(role) =>
                      setUserRoleDrafts((current) => ({
                        ...current,
                        [user.id]: role,
                      }))
                    }
                    onSaveRole={() => updateUserRole(user)}
                    onResendSetup={() => resendSetup(user)}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RoleCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function LoadingRows({ label }: { label: string }) {
  return (
    <div className="flex min-h-[180px] items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      {label}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-secondary/20 px-4 text-center">
      <Icon className="h-8 w-8 text-muted-foreground" />
      <p className="mt-3 font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function RequestRow({
  request,
  role,
  note,
  busyAction,
  onRoleChange,
  onNoteChange,
  onApprove,
  onReject,
}: {
  request: AccessRequest;
  role: Role;
  note: string;
  busyAction: string | null;
  onRoleChange: (role: Role) => void;
  onNoteChange: (note: string) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const approving = busyAction === `approve-${request.id}`;
  const rejecting = busyAction === `reject-${request.id}`;
  const disabled = Boolean(busyAction);

  return (
    <div className="rounded-lg border border-border bg-secondary/20 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">
              {request.name || "Unnamed requester"}
            </p>
            <Badge className={cn("border", getStatusStyles(request.status))}>
              {request.status.toLowerCase()}
            </Badge>
            {request.existingUser && (
              <Badge
                variant="outline"
                className={cn("border", getRoleStyles(request.existingUser.role))}
              >
                Existing {formatRole(request.existingUser.role)}
              </Badge>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {request.email}
          </p>
          {request.message && (
            <p className="mt-3 rounded-md bg-background/60 px-3 py-2 text-sm text-muted-foreground">
              {request.message}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Requested {formatDate(request.createdAt)}</span>
            <span>Reviewed {formatDate(request.reviewedAt)}</span>
            {request.reviewedBy && (
              <span>
                By {request.reviewedBy.name || request.reviewedBy.email}
              </span>
            )}
          </div>
          {request.reviewNote && (
            <p className="mt-2 text-xs text-muted-foreground">
              Note: {request.reviewNote}
            </p>
          )}
        </div>

        {request.status === "PENDING" ? (
          <div className="w-full space-y-3 lg:w-80">
            <Select
              value={role}
              onValueChange={(value) => onRoleChange(value as Role)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Assign role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {formatRole(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <textarea
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="Review note (optional)"
              rows={2}
              className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={onReject}
                disabled={disabled}
                className="text-destructive hover:text-destructive"
              >
                {rejecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Reject
              </Button>
              <Button onClick={onApprove} disabled={disabled}>
                {approving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
                Approve
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex min-w-40 flex-col items-start gap-2 lg:items-end">
            <Badge className={cn("border", getRoleStyles(request.requestedRole))}>
              {formatRole(request.requestedRole)}
            </Badge>
            {request.status === "APPROVED" && (
              <span className="text-xs text-muted-foreground">
                Setup email handled on approval
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function UserRow({
  user,
  role,
  busyAction,
  onRoleChange,
  onSaveRole,
  onResendSetup,
}: {
  user: ManagedUser;
  role: Role;
  busyAction: string | null;
  onRoleChange: (role: Role) => void;
  onSaveRole: () => void;
  onResendSetup: () => void;
}) {
  const savingRole = busyAction === `role-${user.id}`;
  const sendingSetup = busyAction === `setup-${user.id}`;
  const roleChanged = role !== user.role;
  const disabled = Boolean(busyAction);

  return (
    <div className="rounded-lg border border-border bg-secondary/20 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{getInitials(user.name || user.email)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{user.name || "Unnamed user"}</p>
            <p className="truncate text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:w-[560px] xl:grid-cols-[160px_1fr_150px] xl:items-center">
          <Badge className={cn("w-fit border", getRoleStyles(user.role))}>
            {formatRole(user.role)}
          </Badge>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{user.hasPassword ? "Password set" : "Needs password"}</span>
            <span>{user._count.uploads} uploads</span>
            <span>Joined {formatDate(user.createdAt)}</span>
          </div>
          <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onResendSetup}
              disabled={disabled}
              className="flex-1"
            >
              {sendingSetup ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Setup
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={role}
            onValueChange={(value) => onRoleChange(value as Role)}
          >
            <SelectTrigger className="sm:w-36">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((item) => (
                <SelectItem key={item} value={item}>
                  {formatRole(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={onSaveRole}
            disabled={disabled || !roleChanged}
          >
            {savingRole ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserCog className="h-4 w-4" />
            )}
            Save role
          </Button>
        </div>
      </div>
    </div>
  );
}
