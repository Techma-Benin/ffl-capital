import React, { useState } from 'react';
import {
  House,
  Lightning,
  Funnel,
  FileText,
  CreditCard,
  ChartBar,
  Gear,
  Headset,
  Bell,
  MagnifyingGlass,
  List,
  CaretRight,
  TrendUp,
  ArrowUpRight,
  ArrowDownRight,
  DotsThree,
  MapPin,
  Tag,
  Clock,
} from '@phosphor-icons/react';

// ─── Brand tokens ───────────────────────────────────────────────────────────
const BRAND_BLUE = '#0B3D91';
const BRAND_GREEN = '#00A651';
const PAGE_BG = '#F4F7FB';
const SIDEBAR_W_EXPANDED = 240;
const SIDEBAR_W_COLLAPSED = 72;
const TOPBAR_H = 64;

// ─── Nav structure ──────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', Icon: House },
      { id: 'leads',     label: 'My Leads',  Icon: Lightning },
      { id: 'filters',  label: 'Filter Sets', Icon: Funnel },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'billing',  label: 'Billing',    Icon: CreditCard },
      { id: 'reports',  label: 'Reports',    Icon: ChartBar },
      { id: 'docs',     label: 'Documents',  Icon: FileText },
    ],
  },
  {
    label: 'Support',
    items: [
      { id: 'settings', label: 'Settings',   Icon: Gear },
      { id: 'support',  label: 'Contact Us', Icon: Headset },
    ],
  },
];

// ─── KPI data ────────────────────────────────────────────────────────────────
const KPI_CARDS = [
  {
    label: 'Wallet Balance',
    value: '$275.00',
    delta: '+$50',
    deltaUp: true,
    iconBg: '#EBF5FF',
    iconColor: BRAND_BLUE,
    Icon: CreditCard,
  },
  {
    label: 'Total Leads',
    value: '2',
    delta: '+2',
    deltaUp: true,
    iconBg: '#E8FDF3',
    iconColor: BRAND_GREEN,
    Icon: Lightning,
  },
  {
    label: 'Leads Today',
    value: '0',
    delta: '0',
    deltaUp: null,
    iconBg: '#FFF7EB',
    iconColor: '#F59E0B',
    Icon: TrendUp,
  },
  {
    label: 'Active Filter Sets',
    value: '3',
    delta: 'All active',
    deltaUp: null,
    iconBg: '#F3EEFF',
    iconColor: '#7C3AED',
    Icon: Funnel,
  },
];

// ─── Lead rows ───────────────────────────────────────────────────────────────
const LEADS = [
  {
    initials: 'T2',
    name: 'Test 2',
    state: 'TX',
    type: 'Trad. IUL',
    channel: 'Real-time',
    price: '$25.00',
    time: 'Jul 16, 1:11 PM',
    avatarBg: '#EBF5FF',
    avatarColor: BRAND_BLUE,
  },
  {
    initials: 'TJ',
    name: 'Test4 Jones',
    state: 'TX',
    type: 'Trad. IUL',
    channel: 'Real-time',
    price: '$25.00',
    time: 'Jul 16, 12:10 PM',
    avatarBg: '#EBF5FF',
    avatarColor: BRAND_BLUE,
  },
];

// ════════════════════════════════════════════════════════════════════════════
// Sidebar
// ════════════════════════════════════════════════════════════════════════════
function Sidebar({ collapsed }: { collapsed: boolean }) {
  const [active, setActive] = useState('dashboard');
  const w = collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_EXPANDED;

  return (
    <aside
      style={{
        width: w,
        minWidth: w,
        height: '100vh',
        background: '#fff',
        borderRight: '1px solid #E8ECF2',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 220ms ease, min-width 220ms ease',
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 40,
      }}
    >
      {/* Logo block */}
      <div
        style={{
          height: TOPBAR_H,
          display: 'flex',
          alignItems: 'center',
          padding: collapsed ? '0 18px' : '0 20px',
          borderBottom: '1px solid #E8ECF2',
          gap: 10,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: BRAND_BLUE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, fontFamily: 'Inter, sans-serif' }}>L</span>
        </div>
        {!collapsed && (
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              fontSize: 16,
              color: BRAND_BLUE,
              letterSpacing: '-0.3px',
            }}
          >
            LeadFlow
          </span>
        )}
      </div>

      {/* Nav sections */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} style={{ marginBottom: 4 }}>
            {!collapsed && (
              <div
                style={{
                  padding: '10px 20px 4px',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#A0ABBE',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {section.label}
              </div>
            )}
            {collapsed && (
              <div style={{ height: 8 }} />
            )}
            {section.items.map(({ id, label, Icon }) => {
              const isActive = active === id;
              return (
                <button
                  key={id}
                  onClick={() => setActive(id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: collapsed ? 0 : 12,
                    padding: collapsed ? '10px 0' : '9px 16px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    background: isActive ? '#EBF5FF' : 'transparent',
                    border: 'none',
                    borderRadius: 10,
                    margin: collapsed ? '2px 6px' : '2px 8px',
                    width: collapsed ? 60 : 'calc(100% - 16px)',
                    cursor: 'pointer',
                    transition: 'background 150ms',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {isActive && !collapsed && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 3,
                        height: '60%',
                        background: BRAND_BLUE,
                        borderRadius: '0 4px 4px 0',
                      }}
                    />
                  )}
                  <Icon
                    weight="duotone"
                    size={20}
                    color={isActive ? BRAND_BLUE : '#7C8DB0'}
                  />
                  {!collapsed && (
                    <span
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 13.5,
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? BRAND_BLUE : '#4A5568',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User avatar row */}
      <div
        style={{
          borderTop: '1px solid #E8ECF2',
          padding: collapsed ? '16px 0' : '16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: '#EBF5FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            fontSize: 13,
            color: BRAND_BLUE,
          }}
        >
          JD
        </div>
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                fontWeight: 600,
                color: '#1A2332',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              James Doe
            </div>
            <div
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 11,
                color: '#7C8DB0',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Partner
            </div>
          </div>
        )}
        {!collapsed && (
          <DotsThree size={18} color="#A0ABBE" weight="bold" style={{ flexShrink: 0 }} />
        )}
      </div>
    </aside>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Topbar
// ════════════════════════════════════════════════════════════════════════════
function Topbar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const sidebarW = collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_EXPANDED;

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: sidebarW,
        right: 0,
        height: TOPBAR_H,
        background: '#fff',
        borderBottom: '1px solid #E8ECF2',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 16,
        zIndex: 30,
        transition: 'left 220ms ease',
      }}
    >
      {/* Hamburger + breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
        <button
          onClick={onToggle}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 6,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#4A5568',
          }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <List size={20} weight="bold" />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              color: '#A0ABBE',
              fontWeight: 500,
            }}
          >
            Partner Portal
          </span>
          <CaretRight size={12} color="#A0ABBE" />
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              color: '#1A2332',
            }}
          >
            Dashboard
          </span>
        </div>
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#F4F7FB',
            border: '1px solid #E8ECF2',
            borderRadius: 8,
            padding: '7px 12px',
            width: 200,
          }}
        >
          <MagnifyingGlass size={14} color="#A0ABBE" />
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              color: '#A0ABBE',
              userSelect: 'none',
            }}
          >
            Search…
          </span>
        </div>

        {/* Bell */}
        <button
          style={{
            position: 'relative',
            background: '#F4F7FB',
            border: '1px solid #E8ECF2',
            borderRadius: 8,
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#4A5568',
          }}
        >
          <Bell size={17} weight="duotone" />
          <span
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#EF4444',
              border: '1.5px solid #fff',
            }}
          />
        </button>

        {/* Avatar chip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#F4F7FB',
            border: '1px solid #E8ECF2',
            borderRadius: 8,
            padding: '4px 10px 4px 4px',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: '#EBF5FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Inter, sans-serif',
              fontSize: 11,
              fontWeight: 700,
              color: BRAND_BLUE,
            }}
          >
            JD
          </div>
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              fontWeight: 500,
              color: '#1A2332',
            }}
          >
            James
          </span>
        </div>
      </div>
    </header>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// KPI Card
// ════════════════════════════════════════════════════════════════════════════
function KpiCard({
  label,
  value,
  delta,
  deltaUp,
  iconBg,
  iconColor,
  Icon,
}: (typeof KPI_CARDS)[0]) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 14,
        border: '1px solid #E8ECF2',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        padding: '20px 20px 18px',
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon weight="duotone" size={22} color={iconColor} />
        </div>
        {deltaUp !== null && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              padding: '3px 8px',
              borderRadius: 20,
              background: deltaUp ? '#E8FDF3' : '#FFF1F1',
              color: deltaUp ? BRAND_GREEN : '#EF4444',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {deltaUp ? (
              <ArrowUpRight size={12} weight="bold" />
            ) : (
              <ArrowDownRight size={12} weight="bold" />
            )}
            {delta}
          </span>
        )}
        {deltaUp === null && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              padding: '3px 8px',
              borderRadius: 20,
              background: '#F4F7FB',
              color: '#7C8DB0',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {delta}
          </span>
        )}
      </div>

      <div>
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 26,
            fontWeight: 700,
            color: '#1A2332',
            letterSpacing: '-0.5px',
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 12,
            fontWeight: 500,
            color: '#7C8DB0',
            marginTop: 4,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Lead Row
// ════════════════════════════════════════════════════════════════════════════
function LeadRow({
  initials,
  name,
  state,
  type,
  channel,
  price,
  time,
  avatarBg,
  avatarColor,
}: (typeof LEADS)[0]) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        borderBottom: '1px solid #F1F4F9',
        cursor: 'pointer',
        transition: 'background 120ms',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Avatar */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: avatarBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, sans-serif',
          fontSize: 12,
          fontWeight: 700,
          color: avatarColor,
          flexShrink: 0,
        }}
      >
        {initials}
      </div>

      {/* Name + badges */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            fontWeight: 600,
            color: '#1A2332',
            marginBottom: 5,
          }}
        >
          {name}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Badge icon={<MapPin size={9} weight="fill" />} label={state} bg="#F4F7FB" color="#4A5568" />
          <Badge icon={<Tag size={9} weight="fill" />} label={type} bg="#EBF5FF" color={BRAND_BLUE} />
          <Badge icon={<Lightning size={9} weight="fill" />} label={channel} bg="#F3EEFF" color="#7C3AED" />
        </div>
      </div>

      {/* Price + time */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 15,
            fontWeight: 700,
            color: BRAND_GREEN,
          }}
        >
          {price}
        </div>
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 11,
            color: '#A0ABBE',
            marginTop: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            justifyContent: 'flex-end',
          }}
        >
          <Clock size={11} weight="duotone" />
          {time}
        </div>
      </div>
    </div>
  );
}

function Badge({
  icon,
  label,
  bg,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  bg: string;
  color: string;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 7px',
        borderRadius: 4,
        background: bg,
        color,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: 'Inter, sans-serif',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      {icon}
      {label}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FigmaShell — main export
// ════════════════════════════════════════════════════════════════════════════
export function FigmaShell() {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarW = collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_EXPANDED;

  return (
    <div
      style={{
        fontFamily: 'Inter, sans-serif',
        background: PAGE_BG,
        minHeight: '100vh',
        display: 'flex',
      }}
    >
      {/* Sidebar */}
      <Sidebar collapsed={collapsed} />

      {/* Main content shifts right by sidebar width */}
      <div
        style={{
          marginLeft: sidebarW,
          flex: 1,
          minWidth: 0,
          transition: 'margin-left 220ms ease',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Topbar */}
        <Topbar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

        {/* Page body */}
        <main
          style={{
            marginTop: TOPBAR_H,
            padding: 24,
            flex: 1,
          }}
        >
          {/* Page heading */}
          <div style={{ marginBottom: 24 }}>
            <h1
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 22,
                fontWeight: 700,
                color: '#1A2332',
                margin: 0,
                letterSpacing: '-0.3px',
              }}
            >
              Welcome back, James 👋
            </h1>
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                color: '#7C8DB0',
                margin: '4px 0 0',
                fontWeight: 500,
              }}
            >
              Here's what's happening with your leads today.
            </p>
          </div>

          {/* KPI row */}
          <div
            style={{
              display: 'flex',
              gap: 16,
              marginBottom: 24,
              flexWrap: 'wrap',
            }}
          >
            {KPI_CARDS.map((kpi) => (
              <KpiCard key={kpi.label} {...kpi} />
            ))}
          </div>

          {/* Wallet + recent leads grid */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Recent Leads card */}
            <div
              style={{
                background: '#fff',
                borderRadius: 14,
                border: '1px solid #E8ECF2',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                flex: 2,
                minWidth: 320,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 16px 12px',
                  borderBottom: '1px solid #F1F4F9',
                }}
              >
                <div>
                  <h2
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#1A2332',
                      margin: 0,
                    }}
                  >
                    Recent Leads
                  </h2>
                  <p
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 12,
                      color: '#7C8DB0',
                      margin: '2px 0 0',
                    }}
                  >
                    Your most recently received leads
                  </p>
                </div>
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: 'transparent',
                    border: `1px solid ${BRAND_BLUE}`,
                    borderRadius: 8,
                    padding: '6px 12px',
                    color: BRAND_BLUE,
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  View all
                  <CaretRight size={11} weight="bold" />
                </button>
              </div>

              {LEADS.map((lead) => (
                <LeadRow key={lead.name} {...lead} />
              ))}

              {/* Ghost rows */}
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 16px',
                    borderBottom: '1px solid #F1F4F9',
                    opacity: 0.35,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: '#E8ECF2',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        height: 12,
                        width: '25%',
                        borderRadius: 6,
                        background: '#E8ECF2',
                        marginBottom: 8,
                      }}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[40, 80, 70].map((w, j) => (
                        <div
                          key={j}
                          style={{
                            height: 16,
                            width: w,
                            borderRadius: 4,
                            background: '#E8ECF2',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        height: 14,
                        width: 56,
                        borderRadius: 6,
                        background: '#E8ECF2',
                        marginBottom: 8,
                      }}
                    />
                    <div
                      style={{ height: 10, width: 72, borderRadius: 5, background: '#E8ECF2' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Right sidebar column */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                flex: 1,
                minWidth: 240,
              }}
            >
              {/* Wallet card */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  border: '1px solid #E8ECF2',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  padding: 20,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* decorative blob */}
                <div
                  style={{
                    position: 'absolute',
                    top: -20,
                    right: -20,
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    background: '#E8FDF3',
                    opacity: 0.6,
                    pointerEvents: 'none',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 12,
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 12,
                      fontWeight: 500,
                      color: '#7C8DB0',
                    }}
                  >
                    Wallet Balance
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 8px',
                      borderRadius: 20,
                      background: '#E8FDF3',
                      color: BRAND_GREEN,
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: BRAND_GREEN,
                        display: 'inline-block',
                      }}
                    />
                    Buying Active
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 32,
                    fontWeight: 700,
                    color: '#1A2332',
                    letterSpacing: '-0.5px',
                    marginBottom: 16,
                    position: 'relative',
                  }}
                >
                  $275.00
                </div>
                <button
                  style={{
                    width: '100%',
                    background: BRAND_BLUE,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 0',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    position: 'relative',
                  }}
                >
                  <CreditCard size={15} weight="duotone" />
                  Add Funds
                </button>
              </div>

              {/* Quick Links */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  border: '1px solid #E8ECF2',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  padding: 20,
                }}
              >
                <h3
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#A0ABBE',
                    margin: '0 0 12px',
                  }}
                >
                  Quick Links
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {[
                    { label: 'My Leads', Icon: Lightning },
                    { label: 'Filter Sets', Icon: Funnel },
                    { label: 'Reports', Icon: ChartBar },
                    { label: 'Settings', Icon: Gear },
                    { label: 'Contact Us', Icon: Headset },
                  ].map(({ label, Icon }) => (
                    <button
                      key={label}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 10px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: '#4A5568',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 13,
                        fontWeight: 500,
                        transition: 'background 120ms',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#F4F7FB';
                        e.currentTarget.style.color = BRAND_BLUE;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#4A5568';
                      }}
                    >
                      <Icon weight="duotone" size={16} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
