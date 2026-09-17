"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Check,
  ChevronRight,
  Clock3,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Shield,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import styles from "./page.module.css";

type MemberStatus = "Active" | "Invited" | "Suspended";
type MemberRole = "Owner" | "Admin" | "Engineer" | "Viewer";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: MemberRole;
  status: MemberStatus;
  department: string;
  lastActive: string;
  joined: string;
  services: number;
};

const initialMembers: TeamMember[] = [
  {
    id: "member-1",
    name: "Deepak Chouksey",
    email: "deepak@nexus-observe.dev",
    initials: "DC",
    role: "Owner",
    status: "Active",
    department: "Platform",
    lastActive: "Just now",
    joined: "Jan 12, 2026",
    services: 42,
  },
  {
    id: "member-2",
    name: "Rahul Sharma",
    email: "rahul@nexus-observe.dev",
    initials: "RS",
    role: "Admin",
    status: "Active",
    department: "Engineering",
    lastActive: "4 minutes ago",
    joined: "Feb 08, 2026",
    services: 28,
  },
  {
    id: "member-3",
    name: "Priya Verma",
    email: "priya@nexus-observe.dev",
    initials: "PV",
    role: "Engineer",
    status: "Active",
    department: "SRE",
    lastActive: "12 minutes ago",
    joined: "Mar 14, 2026",
    services: 19,
  },
  {
    id: "member-4",
    name: "Arjun Mehta",
    email: "arjun@nexus-observe.dev",
    initials: "AM",
    role: "Engineer",
    status: "Active",
    department: "Backend",
    lastActive: "31 minutes ago",
    joined: "Apr 02, 2026",
    services: 14,
  },
  {
    id: "member-5",
    name: "Neha Kapoor",
    email: "neha@nexus-observe.dev",
    initials: "NK",
    role: "Viewer",
    status: "Active",
    department: "Product",
    lastActive: "2 hours ago",
    joined: "May 21, 2026",
    services: 7,
  },
  {
    id: "member-6",
    name: "Vikram Singh",
    email: "vikram@nexus-observe.dev",
    initials: "VS",
    role: "Engineer",
    status: "Invited",
    department: "Infrastructure",
    lastActive: "Invitation sent",
    joined: "Aug 22, 2026",
    services: 0,
  },
  {
    id: "member-7",
    name: "Amit Joshi",
    email: "amit@nexus-observe.dev",
    initials: "AJ",
    role: "Viewer",
    status: "Suspended",
    department: "Support",
    lastActive: "Aug 03, 2026",
    joined: "Jun 11, 2026",
    services: 3,
  },
];

const roleDescriptions: Record<MemberRole, string> = {
  Owner: "Full workspace access, billing and security controls.",
  Admin: "Manage members, integrations, alerts and workspace settings.",
  Engineer: "Read observability data and manage operational resources.",
  Viewer: "Read-only access to dashboards and observability data.",
};

const rolePermissions: Record<MemberRole, string[]> = {
  Owner: [
    "workspace:*",
    "members:write",
    "billing:write",
    "security:write",
  ],
  Admin: [
    "workspace:read",
    "members:write",
    "integrations:write",
    "settings:write",
  ],
  Engineer: [
    "services:read",
    "metrics:read",
    "logs:read",
    "traces:read",
    "incidents:write",
  ],
  Viewer: [
    "services:read",
    "metrics:read",
    "logs:read",
    "traces:read",
  ],
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "All" | MemberStatus
  >("All");
  const [roleFilter, setRoleFilter] = useState<"All" | MemberRole>("All");

  const [selectedMember, setSelectedMember] =
    useState<TeamMember | null>(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const [memberToManage, setMemberToManage] =
    useState<TeamMember | null>(null);

  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("Engineer");
  const [inviteDepartment, setInviteDepartment] =
    useState("Engineering");

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return members.filter((member) => {
      const matchesSearch =
        !query ||
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.department.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || member.status === statusFilter;

      const matchesRole =
        roleFilter === "All" || member.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [members, search, statusFilter, roleFilter]);

  const activeMembers = members.filter(
    (member) => member.status === "Active",
  ).length;

  const invitedMembers = members.filter(
    (member) => member.status === "Invited",
  ).length;

  const suspendedMembers = members.filter(
    (member) => member.status === "Suspended",
  ).length;

  function inviteMember() {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      return;
    }

    const initials = inviteName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();

    const newMember: TeamMember = {
      id: `member-${Date.now()}`,
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      initials,
      role: inviteRole,
      status: "Invited",
      department: inviteDepartment,
      lastActive: "Invitation sent",
      joined: "Aug 26, 2026",
      services: 0,
    };

    setMembers((current) => [newMember, ...current]);
    setShowInviteModal(false);

    setInviteName("");
    setInviteEmail("");
    setInviteRole("Engineer");
    setInviteDepartment("Engineering");

    setSelectedMember(newMember);
  }

  function updateRole(role: MemberRole) {
    if (!memberToManage) return;

    const updated = {
      ...memberToManage,
      role,
    };

    setMembers((current) =>
      current.map((member) =>
        member.id === updated.id ? updated : member,
      ),
    );

    if (selectedMember?.id === updated.id) {
      setSelectedMember(updated);
    }

    setMemberToManage(updated);
    setShowRoleModal(false);
  }

  function suspendMember(member: TeamMember) {
    const updated = {
      ...member,
      status: "Suspended" as MemberStatus,
      lastActive: "Access suspended",
    };

    setMembers((current) =>
      current.map((item) =>
        item.id === member.id ? updated : item,
      ),
    );

    setSelectedMember(updated);
  }

  function reactivateMember(member: TeamMember) {
    const updated = {
      ...member,
      status: "Active" as MemberStatus,
      lastActive: "Just now",
    };

    setMembers((current) =>
      current.map((item) =>
        item.id === member.id ? updated : item,
      ),
    );

    setSelectedMember(updated);
  }

  function resendInvite(member: TeamMember) {
    const updated = {
      ...member,
      lastActive: "Invitation resent",
    };

    setMembers((current) =>
      current.map((item) =>
        item.id === member.id ? updated : item,
      ),
    );

    setSelectedMember(updated);
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div>
          <p className={styles.eyebrow}>PLATFORM / ACCESS</p>
          <h1>Team</h1>
          <p className={styles.subtitle}>
            Manage workspace members, roles and operational access.
          </p>
        </div>

        <div className={styles.topActions}>
          <div className={styles.workspaceBadge}>
            <Users size={14} />
            <span>NEXUS Production Workspace</span>
          </div>

          <button
            className={styles.primaryButton}
            onClick={() => setShowInviteModal(true)}
          >
            <UserPlus size={15} />
            Invite member
          </button>
        </div>
      </header>

      <section className={styles.metricsGrid}>
        <MetricCard
          icon={<Users size={17} />}
          label="Total members"
          value={String(members.length)}
          detail="Workspace accounts"
          tone="blue"
        />

        <MetricCard
          icon={<Activity size={17} />}
          label="Active members"
          value={String(activeMembers)}
          detail="Currently enabled"
          tone="green"
        />

        <MetricCard
          icon={<Mail size={17} />}
          label="Pending invites"
          value={String(invitedMembers)}
          detail="Awaiting acceptance"
          tone="purple"
        />

        <MetricCard
          icon={<Shield size={17} />}
          label="Suspended"
          value={String(suspendedMembers)}
          detail="Access disabled"
          tone="red"
        />
      </section>

      <section className={styles.accessNotice}>
        <div className={styles.noticeIcon}>
          <Shield size={16} />
        </div>

        <div>
          <strong>Role-based access control is enabled</strong>
          <p>
            Workspace permissions are assigned through predefined roles.
            Use the least-privilege role required for each team member.
          </p>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h2>Workspace members</h2>
            <span>
              People with access to the NEXUS observability workspace
            </span>
          </div>

          <span className={styles.memberCount}>
            {filteredMembers.length} of {members.length}
          </span>
        </div>

        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <Search size={15} />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search members, email or department..."
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as "All" | MemberStatus,
              )
            }
          >
            <option value="All">All statuses</option>
            <option value="Active">Active</option>
            <option value="Invited">Invited</option>
            <option value="Suspended">Suspended</option>
          </select>

          <select
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(event.target.value as "All" | MemberRole)
            }
          >
            <option value="All">All roles</option>
            <option value="Owner">Owner</option>
            <option value="Admin">Admin</option>
            <option value="Engineer">Engineer</option>
            <option value="Viewer">Viewer</option>
          </select>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Member</th>
                <th>Status</th>
                <th>Role</th>
                <th>Department</th>
                <th>Last active</th>
                <th>Joined</th>
                <th>Services</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {filteredMembers.map((member) => (
                <tr
                  key={member.id}
                  className={styles.tableRow}
                  onClick={() => setSelectedMember(member)}
                >
                  <td>
                    <div className={styles.memberCell}>
                      <div className={styles.avatar}>
                        {member.initials}
                      </div>

                      <div>
                        <strong>{member.name}</strong>
                        <span>{member.email}</span>
                      </div>
                    </div>
                  </td>

                  <td>
                    <StatusBadge status={member.status} />
                  </td>

                  <td>
                    <RoleBadge role={member.role} />
                  </td>

                  <td>
                    <span className={styles.department}>
                      {member.department}
                    </span>
                  </td>

                  <td>
                    <span className={styles.mutedCell}>
                      {member.lastActive}
                    </span>
                  </td>

                  <td>
                    <span className={styles.mutedCell}>
                      {member.joined}
                    </span>
                  </td>

                  <td>
                    <strong className={styles.serviceCount}>
                      {member.services}
                    </strong>
                  </td>

                  <td>
                    <button
                      className={styles.rowButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedMember(member);
                      }}
                      aria-label={`View ${member.name}`}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredMembers.length === 0 && (
            <div className={styles.emptyState}>
              <Search size={20} />
              <strong>No team members found</strong>
              <span>Try changing your search or filters.</span>
            </div>
          )}
        </div>
      </section>

      <section className={styles.bottomGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>Roles & access</h2>
              <span>
                Standard permissions available in this workspace
              </span>
            </div>
          </div>

          <div className={styles.rolesGrid}>
            <RoleCard
              role="Owner"
              count={members.filter((m) => m.role === "Owner").length}
              description={roleDescriptions.Owner}
            />

            <RoleCard
              role="Admin"
              count={members.filter((m) => m.role === "Admin").length}
              description={roleDescriptions.Admin}
            />

            <RoleCard
              role="Engineer"
              count={members.filter((m) => m.role === "Engineer").length}
              description={roleDescriptions.Engineer}
            />

            <RoleCard
              role="Viewer"
              count={members.filter((m) => m.role === "Viewer").length}
              description={roleDescriptions.Viewer}
            />
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>Access hygiene</h2>
              <span>Workspace membership overview</span>
            </div>
          </div>

          <div className={styles.hygieneList}>
            <HygieneRow
              label="Active accounts"
              value={`${activeMembers}`}
              detail="Have workspace access"
              status="Healthy"
            />

            <HygieneRow
              label="Pending invitations"
              value={`${invitedMembers}`}
              detail="Require acceptance"
              status="Review"
            />

            <HygieneRow
              label="Suspended accounts"
              value={`${suspendedMembers}`}
              detail="Access disabled"
              status="Healthy"
            />

            <HygieneRow
              label="Administrator accounts"
              value={`${members.filter(
                (member) =>
                  member.role === "Owner" ||
                  member.role === "Admin",
              ).length}`}
              detail="Elevated permissions"
              status="Review"
            />
          </div>
        </div>
      </section>

      {selectedMember && (
        <div
          className={styles.drawerBackdrop}
          onClick={() => setSelectedMember(null)}
        >
          <aside
            className={styles.drawer}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.drawerHeader}>
              <div className={styles.profileHeader}>
                <div className={styles.largeAvatar}>
                  {selectedMember.initials}
                </div>

                <div>
                  <p className={styles.eyebrow}>TEAM MEMBER</p>
                  <h2>{selectedMember.name}</h2>
                  <span>{selectedMember.email}</span>
                </div>
              </div>

              <button
                className={styles.iconButton}
                onClick={() => setSelectedMember(null)}
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.drawerBody}>
              <div className={styles.drawerBadges}>
                <StatusBadge status={selectedMember.status} />
                <RoleBadge role={selectedMember.role} />
              </div>

              <div className={styles.profileInfo}>
                <InfoRow
                  label="Department"
                  value={selectedMember.department}
                />

                <InfoRow
                  label="Joined"
                  value={selectedMember.joined}
                />

                <InfoRow
                  label="Last active"
                  value={selectedMember.lastActive}
                />

                <InfoRow
                  label="Services"
                  value={String(selectedMember.services)}
                />
              </div>

              <div className={styles.drawerSection}>
                <div className={styles.sectionTitle}>
                  <h3>Role permissions</h3>

                  {selectedMember.role !== "Owner" && (
                    <button
                      className={styles.changeRoleButton}
                      onClick={() => {
                        setMemberToManage(selectedMember);
                        setShowRoleModal(true);
                      }}
                    >
                      Change role
                    </button>
                  )}
                </div>

                <div className={styles.permissionList}>
                  {rolePermissions[selectedMember.role].map(
                    (permission) => (
                      <div
                        className={styles.permission}
                        key={permission}
                      >
                        <Check size={13} />
                        <code>{permission}</code>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div className={styles.drawerSection}>
                <h3>Account actions</h3>

                <div className={styles.actionStack}>
                  {selectedMember.status === "Invited" && (
                    <button
                      className={styles.secondaryAction}
                      onClick={() => resendInvite(selectedMember)}
                    >
                      <Mail size={14} />
                      Resend invitation
                    </button>
                  )}

                  {selectedMember.status === "Suspended" && (
                    <button
                      className={styles.secondaryAction}
                      onClick={() =>
                        reactivateMember(selectedMember)
                      }
                    >
                      <Activity size={14} />
                      Reactivate account
                    </button>
                  )}

                  {selectedMember.status === "Active" &&
                    selectedMember.role !== "Owner" && (
                      <button
                        className={styles.dangerAction}
                        onClick={() =>
                          suspendMember(selectedMember)
                        }
                      >
                        <Shield size={14} />
                        Suspend access
                      </button>
                    )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {showInviteModal && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setShowInviteModal(false)}
        >
          <div
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>TEAM ACCESS</p>
                <h2>Invite team member</h2>
                <p>
                  Send an invitation with the appropriate workspace
                  role.
                </p>
              </div>

              <button
                className={styles.iconButton}
                onClick={() => setShowInviteModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.form}>
              <label>
                <span>Full name</span>
                <input
                  value={inviteName}
                  onChange={(event) =>
                    setInviteName(event.target.value)
                  }
                  placeholder="e.g. Ankit Patel"
                />
              </label>

              <label>
                <span>Email address</span>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) =>
                    setInviteEmail(event.target.value)
                  }
                  placeholder="name@company.com"
                />
              </label>

              <div className={styles.formRow}>
                <label>
                  <span>Role</span>

                  <select
                    value={inviteRole}
                    onChange={(event) =>
                      setInviteRole(
                        event.target.value as MemberRole,
                      )
                    }
                  >
                    <option value="Admin">Admin</option>
                    <option value="Engineer">Engineer</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </label>

                <label>
                  <span>Department</span>

                  <select
                    value={inviteDepartment}
                    onChange={(event) =>
                      setInviteDepartment(event.target.value)
                    }
                  >
                    <option value="Engineering">
                      Engineering
                    </option>
                    <option value="SRE">SRE</option>
                    <option value="Infrastructure">
                      Infrastructure
                    </option>
                    <option value="Backend">Backend</option>
                    <option value="Product">Product</option>
                    <option value="Support">Support</option>
                  </select>
                </label>
              </div>

              <div className={styles.rolePreview}>
                <div className={styles.rolePreviewIcon}>
                  <Shield size={15} />
                </div>

                <div>
                  <strong>{inviteRole} access</strong>
                  <span>{roleDescriptions[inviteRole]}</span>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.secondaryButton}
                onClick={() => setShowInviteModal(false)}
              >
                Cancel
              </button>

              <button
                className={styles.primaryButton}
                disabled={
                  !inviteName.trim() || !inviteEmail.trim()
                }
                onClick={inviteMember}
              >
                <Mail size={15} />
                Send invitation
              </button>
            </div>
          </div>
        </div>
      )}

      {showRoleModal && memberToManage && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setShowRoleModal(false)}
        >
          <div
            className={styles.roleModal}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>ACCESS CONTROL</p>
                <h2>Change role</h2>
                <p>{memberToManage.name}</p>
              </div>

              <button
                className={styles.iconButton}
                onClick={() => setShowRoleModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.roleOptions}>
              {(["Admin", "Engineer", "Viewer"] as MemberRole[]).map(
                (role) => (
                  <button
                    key={role}
                    className={
                      memberToManage.role === role
                        ? styles.roleOptionSelected
                        : styles.roleOption
                    }
                    onClick={() => updateRole(role)}
                  >
                    <div>
                      <strong>{role}</strong>
                      <span>{roleDescriptions[role]}</span>
                    </div>

                    {memberToManage.role === role && (
                      <Check size={15} />
                    )}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "green" | "red" | "purple";
}) {
  return (
    <div className={styles.metricCard}>
      <div className={`${styles.metricIcon} ${styles[tone]}`}>
        {icon}
      </div>

      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: MemberStatus }) {
  const className =
    status === "Active"
      ? styles.activeStatus
      : status === "Invited"
        ? styles.invitedStatus
        : styles.suspendedStatus;

  return (
    <span className={`${styles.statusBadge} ${className}`}>
      <i />
      {status}
    </span>
  );
}

function RoleBadge({ role }: { role: MemberRole }) {
  return (
    <span className={styles.roleBadge}>
      {role}
    </span>
  );
}

function RoleCard({
  role,
  count,
  description,
}: {
  role: MemberRole;
  count: number;
  description: string;
}) {
  return (
    <div className={styles.roleCard}>
      <div className={styles.roleCardTop}>
        <div className={styles.roleIcon}>
          <Shield size={14} />
        </div>

        <strong>{count}</strong>
      </div>

      <h3>{role}</h3>
      <p>{description}</p>
    </div>
  );
}

function HygieneRow({
  label,
  value,
  detail,
  status,
}: {
  label: string;
  value: string;
  detail: string;
  status: "Healthy" | "Review";
}) {
  return (
    <div className={styles.hygieneRow}>
      <div>
        <strong>{label}</strong>
        <span>{detail}</span>
      </div>

      <div className={styles.hygieneValue}>
        <strong>{value}</strong>

        <span
          className={
            status === "Healthy"
              ? styles.healthyText
              : styles.reviewText
          }
        >
          {status}
        </span>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={styles.infoRow}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}